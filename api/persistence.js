import { createClient } from '@supabase/supabase-js';

const OWNER_KEY = 'solo';
const PUSHUP_ENTRIES_KEY = 'entries';
let authVerificationClient;

export default async function handler(req, res) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    res.status(503).json({ error: 'Supabase persistence is not configured.' });
    return;
  }

  try {
    const jwt = getBearerToken(req);
    if (!jwt) {
      res.status(401).json({ error: 'Missing or invalid bearer token.' });
      return;
    }

    const isAuthorized = await verifyBearerToken(jwt);
    if (!isAuthorized) {
      res.status(401).json({ error: 'Invalid or expired bearer token.' });
      return;
    }

    if (req.method === 'GET') {
      const [entries, workouts] = await Promise.all([loadPushupEntries(), loadWorkouts()]);
      res.status(200).json({ entries, workouts });
      return;
    }

    if (req.method === 'POST') {
      const body = parseBody(req);
      const day = normalizeDay(body?.day);

      if (body?.kind === 'pushups' && day) {
        await savePushupEntry(day, normalizeEntry(body.entry, day));
        res.status(200).json({ ok: true });
        return;
      }

      if (body?.kind === 'workouts' && day) {
        await saveWorkoutDay(day, normalizeWorkout(body.workout, day));
        res.status(200).json({ ok: true });
        return;
      }

      res.status(400).json({ error: 'Unsupported persistence payload.' });
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected persistence error.',
    });
  }
}

function getBearerToken(req) {
  const authorization = req.headers?.authorization ?? req.headers?.Authorization;
  if (typeof authorization !== 'string') return null;

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1].trim();
  return token || null;
}

async function verifyBearerToken(jwt) {
  const client = getAuthVerificationClient();
  const { data, error } = await client.auth.getUser(jwt);
  return !error && !!data?.user;
}

function getAuthVerificationClient() {
  if (authVerificationClient) return authVerificationClient;

  authVerificationClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return authVerificationClient;
}

function parseBody(req) {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return req.body ?? null;
}

async function loadPushupEntries() {
  const [settingsRows, pushupRows] = await Promise.all([
    supabaseRequest('user_settings?owner_key=eq.solo&select=pushup_settings'),
    supabaseRequest('pushup_days?owner_key=eq.solo&select=day,reps&order=day.asc'),
  ]);

  const settings = Array.isArray(settingsRows) ? settingsRows[0]?.pushup_settings : undefined;
  const jsonEntries = normalizeEntries(settings?.[PUSHUP_ENTRIES_KEY]);
  if (Object.keys(jsonEntries).length > 0) return jsonEntries;

  const fallbackEntries = {};
  for (const row of Array.isArray(pushupRows) ? pushupRows : []) {
    if (typeof row?.day !== 'string') continue;
    const reps = Number(row?.reps);
    fallbackEntries[row.day] = {
      date: row.day,
      sets: Number.isFinite(reps) && reps > 0 ? [reps] : [],
    };
  }
  return fallbackEntries;
}

async function loadWorkouts() {
  const dayRows = await supabaseRequest('workout_days?owner_key=eq.solo&select=id,day&order=day.asc');
  if (!Array.isArray(dayRows) || dayRows.length === 0) return {};

  const dayIds = dayRows
    .map((row) => row?.id)
    .filter((id) => Number.isInteger(id));

  if (dayIds.length === 0) return {};

  const exerciseRows = await supabaseRequest(
    `workout_exercises?workout_day_id=in.(${dayIds.join(',')})&select=id,workout_day_id,sort_order,exercise_name,category`,
  );

  const exerciseIds = (Array.isArray(exerciseRows) ? exerciseRows : [])
    .map((row) => row?.id)
    .filter((id) => Number.isInteger(id));

  const setRows = exerciseIds.length
    ? await supabaseRequest(
        `workout_sets?workout_exercise_id=in.(${exerciseIds.join(',')})&select=workout_exercise_id,sort_order,reps,weight`,
      )
    : [];

  const setsByExerciseId = new Map();
  for (const row of [...(Array.isArray(setRows) ? setRows : [])].sort(compareByParentAndSortOrder)) {
    if (!Number.isInteger(row?.workout_exercise_id)) continue;
    const existing = setsByExerciseId.get(row.workout_exercise_id) ?? [];
    existing.push({
      weight: Number(row?.weight) || 0,
      reps: Number(row?.reps) || 0,
    });
    setsByExerciseId.set(row.workout_exercise_id, existing);
  }

  const exercisesByDayId = new Map();
  for (const row of [...(Array.isArray(exerciseRows) ? exerciseRows : [])].sort(compareByParentAndSortOrder)) {
    if (!Number.isInteger(row?.workout_day_id) || typeof row?.exercise_name !== 'string') continue;
    const existing = exercisesByDayId.get(row.workout_day_id) ?? [];
    existing.push({
      id: `supabase-ex-${row.id}`,
      name: row.exercise_name,
      category: normalizeCategory(row.category),
      sets: setsByExerciseId.get(row.id) ?? [],
    });
    exercisesByDayId.set(row.workout_day_id, existing);
  }

  const workouts = {};
  for (const row of dayRows) {
    if (!Number.isInteger(row?.id) || typeof row?.day !== 'string') continue;
    workouts[row.day] = {
      date: row.day,
      exercises: exercisesByDayId.get(row.id) ?? [],
    };
  }
  return workouts;
}

async function savePushupEntry(day, entry) {
  const settingsRows = await supabaseRequest('user_settings?owner_key=eq.solo&select=pushup_settings');
  const existingSettings = Array.isArray(settingsRows) ? settingsRows[0]?.pushup_settings : null;
  const pushupSettings = isRecord(existingSettings) ? { ...existingSettings } : {};
  const entries = normalizeEntries(pushupSettings[PUSHUP_ENTRIES_KEY]);

  if (entry) {
    entries[day] = entry;
  } else {
    delete entries[day];
  }

  await supabaseRequest('user_settings', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify([
      {
        owner_key: OWNER_KEY,
        pushup_settings: { ...pushupSettings, [PUSHUP_ENTRIES_KEY]: entries },
      },
    ]),
  });

  await supabaseRequest(`pushup_days?owner_key=eq.solo&day=eq.${encodeURIComponent(day)}`, { method: 'DELETE' });

  if (entry && entry.sets.length > 0) {
    await supabaseRequest('pushup_days', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([
        {
          owner_key: OWNER_KEY,
          day,
          reps: entry.sets.reduce((sum, reps) => sum + reps, 0),
        },
      ]),
    });
  }
}

async function saveWorkoutDay(day, workout) {
  await supabaseRequest(`workout_days?owner_key=eq.solo&day=eq.${encodeURIComponent(day)}`, { method: 'DELETE' });

  if (!workout) return;

  const insertedDays = await supabaseRequest('workout_days?select=id,day', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([
      {
        owner_key: OWNER_KEY,
        day,
      },
    ]),
  });

  for (const dayRow of Array.isArray(insertedDays) ? insertedDays : []) {
    if (!Number.isInteger(dayRow?.id) || typeof dayRow?.day !== 'string') continue;

    const exercises = workout.exercises ?? [];
    if (exercises.length === 0) continue;

    const insertedExercises = await supabaseRequest('workout_exercises?select=id,sort_order', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(
        exercises.map((exercise, index) => ({
          workout_day_id: dayRow.id,
          sort_order: index,
          exercise_name: exercise.name,
          category: exercise.category ?? null,
        })),
      ),
    });

    for (const exerciseRow of Array.isArray(insertedExercises) ? insertedExercises : []) {
      if (!Number.isInteger(exerciseRow?.id) || !Number.isInteger(exerciseRow?.sort_order)) continue;

      const sourceExercise = exercises[exerciseRow.sort_order];
      if (!sourceExercise || sourceExercise.sets.length === 0) continue;

      await supabaseRequest('workout_sets', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(
          sourceExercise.sets.map((set, index) => ({
            workout_exercise_id: exerciseRow.id,
            sort_order: index,
            reps: set.reps,
            weight: set.weight,
          })),
        ),
      });
    }
  }
}

async function supabaseRequest(path, init = {}) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: process.env.SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed (${response.status}) for ${path}`);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function normalizeEntries(value) {
  if (!isRecord(value)) return {};

  const entries = {};
  for (const [key, item] of Object.entries(value)) {
    if (!isRecord(item)) continue;
    entries[key] = {
      date: typeof item.date === 'string' ? item.date : key,
      sets: Array.isArray(item.sets) ? item.sets.filter((set) => Number.isFinite(set)) : [],
    };
  }
  return entries;
}

function normalizeWorkouts(value) {
  if (!isRecord(value)) return {};

  const workouts = {};
  for (const [key, item] of Object.entries(value)) {
    if (!isRecord(item)) continue;
    workouts[key] = {
      date: typeof item.date === 'string' ? item.date : key,
      exercises: Array.isArray(item.exercises)
        ? item.exercises
            .filter((exercise) => isRecord(exercise) && typeof exercise.id === 'string' && typeof exercise.name === 'string')
            .map((exercise) => ({
              id: exercise.id,
              name: exercise.name,
              category: normalizeCategory(exercise.category),
              sets: Array.isArray(exercise.sets)
                ? exercise.sets
                    .filter((set) => isRecord(set) && Number.isFinite(set.weight) && Number.isFinite(set.reps))
                    .map((set) => ({
                      weight: set.weight,
                      reps: set.reps,
                    }))
                : [],
            }))
        : [],
    };
  }
  return workouts;
}

function normalizeEntry(value, day) {
  if (!isRecord(value)) return null;

  const entries = normalizeEntries({ [day]: value });
  return entries[day] ?? null;
}

function normalizeWorkout(value, day) {
  if (!isRecord(value)) return null;

  const workouts = normalizeWorkouts({ [day]: value });
  return workouts[day] ?? null;
}

function normalizeDay(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function normalizeCategory(value) {
  if (value === 'push' || value === 'Chest / Push') return 'Chest / Push';
  if (value === 'pull' || value === 'Back / Pull') return 'Back / Pull';
  if (value === 'legs' || value === 'Legs') return 'Legs';
  if (value === 'Arms' || value === 'Shoulders' || value === 'Cardio' || value === 'core' || value === 'other') {
    return value;
  }
  return undefined;
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function compareByParentAndSortOrder(a, b) {
  const leftParent = Number(a?.workout_day_id ?? a?.workout_exercise_id ?? 0);
  const rightParent = Number(b?.workout_day_id ?? b?.workout_exercise_id ?? 0);
  if (leftParent !== rightParent) return leftParent - rightParent;

  const leftSort = Number(a?.sort_order ?? 0);
  const rightSort = Number(b?.sort_order ?? 0);
  return leftSort - rightSort;
}
