import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DayEntry } from './storage';

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

describe('cloudPersistence auth headers and fallback', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('MODE', 'development');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    getSession.mockReset();
    vi.doMock('./supabaseClient', () => ({
      supabase: {
        auth: {
          getSession,
        },
      },
    }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('skips cloud load when there is no access token', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    const { loadPersistenceSnapshot } = await import('./cloudPersistence');

    await expect(loadPersistenceSnapshot()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not load the Supabase client during module import in test mode', async () => {
    const loadMarker = vi.fn();

    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('MODE', 'test');
    vi.doMock('./supabaseClient', () => {
      loadMarker();
      return {
        supabase: {
          auth: {
            getSession: vi.fn(),
          },
        },
      };
    });

    const { CLOUD_PERSISTENCE_ENABLED, loadPersistenceSnapshot } = await import('./cloudPersistence');

    expect(CLOUD_PERSISTENCE_ENABLED).toBe(false);
    await expect(loadPersistenceSnapshot()).resolves.toBeNull();
    expect(loadMarker).not.toHaveBeenCalled();
  });

  it('sends the bearer token on cloud load requests', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'test-jwt' } }, error: null });
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        entries: { '2026-04-15': { date: '2026-04-15', sets: [10, 15] } },
        workouts: {},
      }),
    });

    const { loadPersistenceSnapshot } = await import('./cloudPersistence');

    await expect(loadPersistenceSnapshot()).resolves.toEqual({
      entries: { '2026-04-15': { date: '2026-04-15', sets: [10, 15] } },
      workouts: {},
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/persistence', {
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer test-jwt',
      },
    });
  });

  it('treats a 401 load response as unavailable cloud persistence', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'expired-jwt' } }, error: null });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
    });

    const { loadPersistenceSnapshot } = await import('./cloudPersistence');

    await expect(loadPersistenceSnapshot()).resolves.toBeNull();
  });

  it('skips cloud save when there is no access token', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null });

    const { savePushupEntries } = await import('./cloudPersistence');
    const entry: DayEntry = { date: '2026-04-15', sets: [20] };

    await expect(savePushupEntries('2026-04-15', entry)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends the bearer token on cloud save requests and swallows 401 responses', async () => {
    getSession.mockResolvedValue({ data: { session: { access_token: 'test-jwt' } }, error: null });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
    });

    const { savePushupEntries } = await import('./cloudPersistence');
    const entry: DayEntry = { date: '2026-04-15', sets: [20] };

    await expect(savePushupEntries('2026-04-15', entry)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('/api/persistence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-jwt',
      },
      body: JSON.stringify({ kind: 'pushups', day: '2026-04-15', entry }),
    });
  });
});
