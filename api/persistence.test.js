import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient, getUser } = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient,
}));

describe('api/persistence user-scoped persistence', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SECRET_KEY', 'service-role-key');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    getUser.mockReset();
    createClient.mockReset();
    createClient.mockReturnValue({
      auth: {
        getUser,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns 401 for a missing authorization header and skips downstream DB calls', async () => {
    const res = await invokeHandler({
      method: 'GET',
      headers: {},
    });

    expect(res.statusCode).toBe(401);
    expect(res.jsonBody).toEqual({ error: 'Missing or invalid bearer token.' });
    expect(createClient).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 401 for a malformed authorization header', async () => {
    const res = await invokeHandler({
      method: 'GET',
      headers: {
        authorization: 'Token not-a-bearer',
      },
    });

    expect(res.statusCode).toBe(401);
    expect(res.jsonBody).toEqual({ error: 'Missing or invalid bearer token.' });
    expect(getUser).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 401 when Supabase token verification reports an auth error', async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid token' },
    });

    const res = await invokeHandler({
      method: 'GET',
      headers: {
        authorization: 'Bearer bad-token',
      },
    });

    expect(res.statusCode).toBe(401);
    expect(res.jsonBody).toEqual({ error: 'Invalid or expired bearer token.' });
    expect(getUser).toHaveBeenCalledWith('bad-token');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 401 when Supabase verifies the token but no user is present', async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const res = await invokeHandler({
      method: 'GET',
      headers: {
        authorization: 'Bearer no-user-token',
      },
    });

    expect(res.statusCode).toBe(401);
    expect(res.jsonBody).toEqual({ error: 'Invalid or expired bearer token.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the authenticated user id in all GET owner_key filters', async () => {
    const userId = 'user/alpha+beta';
    const encodedUserId = encodeURIComponent(userId);

    getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });

    fetchMock.mockImplementation(async (url) => {
      if (url.includes('user_settings?')) return jsonResponse([]);
      if (url.includes('pushup_days?')) return jsonResponse([]);
      if (url.includes('workout_days?')) return jsonResponse([]);
      throw new Error(`Unexpected request: ${url}`);
    });

    const res = await invokeHandler({
      method: 'GET',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ entries: {}, workouts: {} });

    const requestUrls = fetchMock.mock.calls.map(([url]) => url);
    expect(requestUrls).toEqual(
      expect.arrayContaining([
        `https://example.supabase.co/rest/v1/user_settings?owner_key=eq.${encodedUserId}&select=pushup_settings`,
        `https://example.supabase.co/rest/v1/pushup_days?owner_key=eq.${encodedUserId}&select=day,reps&order=day.asc`,
        `https://example.supabase.co/rest/v1/workout_days?owner_key=eq.${encodedUserId}&select=id,day&order=day.asc`,
      ]),
    );
  });

  it('writes the authenticated user id on valid pushups POST requests', async () => {
    const userId = 'push/user+1';
    const encodedUserId = encodeURIComponent(userId);

    getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });

    fetchMock.mockImplementation(async (url, init = {}) => {
      if (url.includes('user_settings?')) return jsonResponse([]);
      if (url.endsWith('/pushup_days') && init.method === 'POST') return emptyResponse();
      if (url.includes('pushup_days?') && init.method === 'DELETE') return emptyResponse();
      if (url.endsWith('/user_settings') && init.method === 'POST') return emptyResponse();
      throw new Error(`Unexpected request: ${url}`);
    });

    const res = await invokeHandler({
      method: 'POST',
      headers: {
        authorization: 'Bearer pushups-token',
      },
      body: {
        kind: 'pushups',
        day: '2026-04-15',
        userId: 'ignored-body-user',
        owner_key: 'ignored-owner-key',
        entry: {
          date: '2026-04-15',
          sets: [12, 8],
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ ok: true });

    const [settingsReadCall, settingsWriteCall, deleteCall, pushupWriteCall] = fetchMock.mock.calls;
    expect(settingsReadCall[0]).toBe(
      `https://example.supabase.co/rest/v1/user_settings?owner_key=eq.${encodedUserId}&select=pushup_settings`,
    );
    expect(settingsWriteCall[0]).toBe('https://example.supabase.co/rest/v1/user_settings');
    expect(JSON.parse(settingsWriteCall[1].body)).toEqual([
      {
        owner_key: userId,
        pushup_settings: {
          entries: {
            '2026-04-15': {
              date: '2026-04-15',
              sets: [12, 8],
            },
          },
        },
      },
    ]);
    expect(deleteCall[0]).toBe(
      `https://example.supabase.co/rest/v1/pushup_days?owner_key=eq.${encodedUserId}&day=eq.2026-04-15`,
    );
    expect(JSON.parse(pushupWriteCall[1].body)).toEqual([
      {
        owner_key: userId,
        day: '2026-04-15',
        reps: 20,
      },
    ]);
  });

  it('writes the authenticated user id on valid workouts POST requests and preserves insert chaining', async () => {
    const userId = 'workout/user+1';
    const encodedUserId = encodeURIComponent(userId);

    getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });

    fetchMock.mockImplementation(async (url, init = {}) => {
      if (url.includes('workout_days?') && init.method === 'DELETE') return emptyResponse();
      if (url.endsWith('/workout_days?select=id,day') && init.method === 'POST') {
        return jsonResponse([{ id: 77, day: '2026-04-16' }]);
      }
      if (url.endsWith('/workout_exercises?select=id,sort_order') && init.method === 'POST') {
        return jsonResponse([{ id: 88, sort_order: 0 }]);
      }
      if (url.endsWith('/workout_sets') && init.method === 'POST') return emptyResponse();
      throw new Error(`Unexpected request: ${url}`);
    });

    const res = await invokeHandler({
      method: 'POST',
      headers: {
        authorization: 'Bearer workouts-token',
      },
      body: {
        kind: 'workouts',
        day: '2026-04-16',
        user_id: 'ignored-body-user',
        workout: {
          date: '2026-04-16',
          exercises: [
            {
              id: 'local-ex-1',
              name: 'Bench Press',
              category: 'Chest / Push',
              sets: [
                { weight: 135, reps: 10 },
                { weight: 145, reps: 8 },
              ],
            },
          ],
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.jsonBody).toEqual({ ok: true });

    const [deleteCall, dayInsertCall, exerciseInsertCall, setInsertCall] = fetchMock.mock.calls;
    expect(deleteCall[0]).toBe(
      `https://example.supabase.co/rest/v1/workout_days?owner_key=eq.${encodedUserId}&day=eq.2026-04-16`,
    );
    expect(JSON.parse(dayInsertCall[1].body)).toEqual([
      {
        owner_key: userId,
        day: '2026-04-16',
      },
    ]);
    expect(JSON.parse(exerciseInsertCall[1].body)).toEqual([
      {
        workout_day_id: 77,
        sort_order: 0,
        exercise_name: 'Bench Press',
        category: 'Chest / Push',
      },
    ]);
    expect(JSON.parse(setInsertCall[1].body)).toEqual([
      {
        workout_exercise_id: 88,
        sort_order: 0,
        reps: 10,
        weight: 135,
      },
      {
        workout_exercise_id: 88,
        sort_order: 1,
        reps: 8,
        weight: 145,
      },
    ]);
  });

  it.each([
    [
      'negative push-up reps',
      {
        kind: 'pushups',
        day: '2026-04-15',
        entry: { date: '2026-04-15', sets: [-1] },
      },
      'Invalid push-up payload: entry.sets[0] must be a positive integer no greater than 10000.',
    ],
    [
      'non-integer push-up reps',
      {
        kind: 'pushups',
        day: '2026-04-15',
        entry: { date: '2026-04-15', sets: [12.5] },
      },
      'Invalid push-up payload: entry.sets[0] must be a positive integer no greater than 10000.',
    ],
    [
      'unreasonably large push-up reps',
      {
        kind: 'pushups',
        day: '2026-04-15',
        entry: { date: '2026-04-15', sets: [10001] },
      },
      'Invalid push-up payload: entry.sets[0] must be a positive integer no greater than 10000.',
    ],
    [
      'invalid push-up date keys',
      {
        kind: 'pushups',
        day: '2026-02-31',
        entry: { date: '2026-02-31', sets: [10] },
      },
      'Invalid push-up payload: day must be a valid YYYY-MM-DD date.',
    ],
    [
      'negative workout reps',
      {
        kind: 'workouts',
        day: '2026-04-16',
        workout: workoutPayload([{ weight: 135, reps: -1 }]),
      },
      'Invalid workout payload: workout.exercises[0].sets[0].reps must be a positive integer no greater than 1000.',
    ],
    [
      'non-integer workout reps',
      {
        kind: 'workouts',
        day: '2026-04-16',
        workout: workoutPayload([{ weight: 135, reps: 8.5 }]),
      },
      'Invalid workout payload: workout.exercises[0].sets[0].reps must be a positive integer no greater than 1000.',
    ],
    [
      'negative workout weight',
      {
        kind: 'workouts',
        day: '2026-04-16',
        workout: workoutPayload([{ weight: -5, reps: 8 }]),
      },
      'Invalid workout payload: workout.exercises[0].sets[0].weight must be between 0 and 100000.',
    ],
    [
      'unreasonably large workout payloads',
      {
        kind: 'workouts',
        day: '2026-04-16',
        workout: {
          date: '2026-04-16',
          exercises: Array.from({ length: 101 }, (_, index) => ({
            id: `local-ex-${index}`,
            name: `Exercise ${index}`,
            sets: [],
          })),
        },
      },
      'Invalid workout payload: workout.exercises cannot exceed 100 exercises.',
    ],
  ])('returns 400 and skips Supabase writes for %s', async (_label, body, error) => {
    getUser.mockResolvedValue({
      data: { user: { id: 'validation-user' } },
      error: null,
    });

    const res = await invokeHandler({
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token',
      },
      body,
    });

    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toEqual({ error });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps owner_key filters isolated across sequential requests from different users', async () => {
    const firstUserId = 'user/one';
    const secondUserId = 'user/two';

    getUser.mockImplementation(async (jwt) => ({
      data: {
        user: {
          id: jwt === 'first-token' ? firstUserId : secondUserId,
        },
      },
      error: null,
    }));

    fetchMock.mockImplementation(async (url) => {
      if (url.includes('user_settings?')) return jsonResponse([]);
      if (url.includes('pushup_days?')) return jsonResponse([]);
      if (url.includes('workout_days?')) return jsonResponse([]);
      throw new Error(`Unexpected request: ${url}`);
    });

    await invokeHandler({
      method: 'GET',
      headers: {
        authorization: 'Bearer first-token',
      },
    });

    await invokeHandler({
      method: 'GET',
      headers: {
        authorization: 'Bearer second-token',
      },
    });

    const firstRequestUrls = fetchMock.mock.calls.slice(0, 3).map(([url]) => url);
    const secondRequestUrls = fetchMock.mock.calls.slice(3, 6).map(([url]) => url);

    for (const url of firstRequestUrls) {
      expect(url).toContain(`owner_key=eq.${encodeURIComponent(firstUserId)}`);
      expect(url).not.toContain(`owner_key=eq.${encodeURIComponent(secondUserId)}`);
    }

    for (const url of secondRequestUrls) {
      expect(url).toContain(`owner_key=eq.${encodeURIComponent(secondUserId)}`);
      expect(url).not.toContain(`owner_key=eq.${encodeURIComponent(firstUserId)}`);
    }
  });

  it('keeps unsupported method handling unchanged', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'method-user' } },
      error: null,
    });

    const res = await invokeHandler({
      method: 'PUT',
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe('GET, POST');
    expect(res.jsonBody).toEqual({ error: 'Method not allowed.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps malformed body handling unchanged', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'body-user' } },
      error: null,
    });

    const res = await invokeHandler({
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token',
      },
      body: '{"badJson"',
    });

    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toEqual({ error: 'Unsupported persistence payload.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not leave any literal solo owner key in api/persistence.js', async () => {
    const contents = await readFile('api/persistence.js', 'utf8');
    expect(contents).not.toMatch(/\bsolo\b/);
  });
});

async function invokeHandler({ method = 'GET', headers = {}, body } = {}) {
  const { default: handler } = await import('./persistence.js');
  const req = { method, headers, body };
  const res = createMockResponse();

  await handler(req, res);

  return res;
}

function createMockResponse() {
  return {
    statusCode: 200,
    jsonBody: undefined,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.jsonBody = body;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
  };
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  };
}

function emptyResponse(status = 204) {
  return {
    ok: true,
    status,
    text: vi.fn().mockResolvedValue(''),
  };
}

function workoutPayload(sets) {
  return {
    date: '2026-04-16',
    exercises: [
      {
        id: 'local-ex-1',
        name: 'Bench Press',
        category: 'Chest / Push',
        sets,
      },
    ],
  };
}
