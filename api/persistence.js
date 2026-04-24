import { createClient } from '@supabase/supabase-js';

const PUSHUP_ENTRIES_KEY = 'entries';

// Server-side write limits sit well above normal UI usage, but below values that
// would indicate a malformed or abusive client payload.
const MAX_PUSHUP_SET_REPS = 10000;
const MAX_PUSHUP_SETS_PER_DAY = 1000;
const MAX_WORKOUT_REPS_PER_SET = 1000;
const MAX_WORKOUT_WEIGHT = 100000;
const MAX_WORKOUT_EXERCISES_PER_DAY = 100;
const MAX_WORKOUT_SETS_PER_DAY = 1000;
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

    const userId = await verifyBearerToken(jwt);
    if (!userId) {
      res.status(401).json({ error: 'Invalid or expired bearer token.' });
      return;
    }

    if (req.method === 'GET') {
      const [entries, workouts] = await Promise.all([loadPushupEntries(userId), loadWorkouts(userId)]);
      res.status(200).json({ entries, workouts });
      return;
    }

    if (req.method === 'POST') {
      const body = parseBody(req);
      const validation = validatePersistencePayload(body);

      if (!validation.ok) {
        res.status(400).json({ error: validation.error });
        return;
      }

      if (validation.kind === 'pushups') {
        await savePushupEntry(userId, validation.day, validation.entry);
        res.status(200).json({ ok: true });
        return;
      }

      if (validation.kind === 'workouts') {
        await saveWorkoutDay(userId, validation.day, validation.workout);
        res.status(200).json({ ok: true });
        return;
      }
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
  try {
    const client = getAuthVerificationClient();
    const { data, error } = await client.auth.getUser(jwt);
    if (error || !data?.user?.id) return null;
    return data.user.id;
  } catch {
    return null;
  }
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

async function loadPushupEntries(userId) {
  const [settingsRows, pushupRows] = await Promise.all([
    supabaseRequest(`user_settings?${ownerKeyFilter(userId)}&select=pushup_settings`),
    supabaseRequest(`pushup_days?${ownerKeyFilter(userId)}&select=day,reps&order=day.asc`),
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

async function loadWorkouts(userId) {
  const dayRows = await supabaseRequest(`workout_days?${ownerKeyFilter(userId)}&select=id,day&order=day.asc`);
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

async function savePushupEntry(userId, day, entry) {
  const settingsRows = await supabaseRequest(`user_settings?${ownerKeyFilter(userId)}&select=pushup_settings`);
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
        owner_key: userId,
        pushup_settings: { ...pushupSettings, [PUSHUP_ENTRIES_KEY]: entries },
      },
    ]),
  });

  await supabaseRequest(`pushup_days?${ownerKeyFilter(userId)}&day=eq.${encodeURIComponent(day)}`, { method: 'DELETE' });

  if (entry && entry.sets.length > 0) {
    await supabaseRequest('pushup_days', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([
        {
          owner_key: userId,
          day,
          reps: entry.sets.reduce((sum, reps) => sum + reps, 0),
        },
      ]),
    });
  }
}

async function saveWorkoutDay(userId, day, workout) {
  await supabaseRequest(`workout_days?${ownerKeyFilter(userId)}&day=eq.${encodeURIComponent(day)}`, { method: 'DELETE' });

  if (!workout) return;

  const insertedDays = await supabaseRequest('workout_days?select=id,day', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([
      {
        owner_key: userId,
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
      sets: Array.isArray(item.sets)
        ? item.sets.filter((set) => isPositiveIntegerAtMost(set, MAX_PUSHUP_SET_REPS))
        : [],
    };
  }
  return entries;
}

function ownerKeyFilter(userId) {
  return `owner_key=eq.${encodeURIComponent(userId)}`;
}

function validatePersistencePayload(body) {
  if (!isRecord(body)) {
    return invalidPayload('Unsupported persistence payload.');
  }

  if (body.kind === 'pushups') {
    const day = normalizeDay(body.day);
    if (!day) return invalidPayload('Invalid push-up payload: day must be a valid YYYY-MM-DD date.');

    const entry = validatePushupEntry(body.entry, day);
    if (!entry.ok) return entry;

    return { ok: true, kind: 'pushups', day, entry: entry.value };
  }

  if (body.kind === 'workouts') {
    const day = normalizeDay(body.day);
    if (!day) return invalidPayload('Invalid workout payload: day must be a valid YYYY-MM-DD date.');

    const workout = validateWorkout(body.workout, day);
    if (!workout.ok) return workout;

    return { ok: true, kind: 'workouts', day, workout: workout.value };
  }

  return invalidPayload('Unsupported persistence payload.');
}

function validatePushupEntry(value, day) {
  if (value === null) return { ok: true, value: null };
  if (!isRecord(value)) return invalidPayload('Invalid push-up payload: entry must be an object or null.');
  if (!dateFieldMatchesDay(value.date, day)) {
    return invalidPayload('Invalid push-up payload: entry.date must match day.');
  }
  if (!Array.isArray(value.sets)) return invalidPayload('Invalid push-up payload: entry.sets must be an array.');
  if (value.sets.length > MAX_PUSHUP_SETS_PER_DAY) {
    return invalidPayload(`Invalid push-up payload: entry.sets cannot exceed ${MAX_PUSHUP_SETS_PER_DAY} sets.`);
  }

  const sets = [];
  for (const [index, reps] of value.sets.entries()) {
    if (!isPositiveIntegerAtMost(reps, MAX_PUSHUP_SET_REPS)) {
      return invalidPayload(
        `Invalid push-up payload: entry.sets[${index}] must be a positive integer no greater than ${MAX_PUSHUP_SET_REPS}.`,
      );
    }
    sets.push(reps);
  }

  return { ok: true, value: { date: day, sets } };
}

function validateWorkout(value, day) {
  if (value === null) return { ok: true, value: null };
  if (!isRecord(value)) return invalidPayload('Invalid workout payload: workout must be an object or null.');
  if (!dateFieldMatchesDay(value.date, day)) {
    return invalidPayload('Invalid workout payload: workout.date must match day.');
  }
  if (!Array.isArray(value.exercises)) return invalidPayload('Invalid workout payload: workout.exercises must be an array.');
  if (value.exercises.length > MAX_WORKOUT_EXERCISES_PER_DAY) {
    return invalidPayload(
      `Invalid workout payload: workout.exercises cannot exceed ${MAX_WORKOUT_EXERCISES_PER_DAY} exercises.`,
    );
  }

  let totalSets = 0;
  const exercises = [];
  for (const [exerciseIndex, exercise] of value.exercises.entries()) {
    if (!isRecord(exercise)) {
      return invalidPayload(`Invalid workout payload: workout.exercises[${exerciseIndex}] must be an object.`);
    }
    if (!isNonEmptyStringAtMost(exercise.id, 200)) {
      return invalidPayload(
        `Invalid workout payload: workout.exercises[${exerciseIndex}].id must be a non-empty string.`,
      );
    }
    if (!isNonEmptyStringAtMost(exercise.name, 200)) {
      return invalidPayload(
        `Invalid workout payload: workout.exercises[${exerciseIndex}].name must be a non-empty string.`,
      );
    }
    if (!Array.isArray(exercise.sets)) {
      return invalidPayload(`Invalid workout payload: workout.exercises[${exerciseIndex}].sets must be an array.`);
    }

    totalSets += exercise.sets.length;
    if (totalSets > MAX_WORKOUT_SETS_PER_DAY) {
      return invalidPayload(`Invalid workout payload: total sets cannot exceed ${MAX_WORKOUT_SETS_PER_DAY}.`);
    }

    const sets = [];
    for (const [setIndex, set] of exercise.sets.entries()) {
      if (!isRecord(set)) {
        return invalidPayload(
          `Invalid workout payload: workout.exercises[${exerciseIndex}].sets[${setIndex}] must be an object.`,
        );
      }
      if (!isPositiveIntegerAtMost(set.reps, MAX_WORKOUT_REPS_PER_SET)) {
        return invalidPayload(
          `Invalid workout payload: workout.exercises[${exerciseIndex}].sets[${setIndex}].reps must be a positive integer no greater than ${MAX_WORKOUT_REPS_PER_SET}.`,
        );
      }
      if (!isFiniteNumberInRange(set.weight, 0, MAX_WORKOUT_WEIGHT)) {
        return invalidPayload(
          `Invalid workout payload: workout.exercises[${exerciseIndex}].sets[${setIndex}].weight must be between 0 and ${MAX_WORKOUT_WEIGHT}.`,
        );
      }
      sets.push({ weight: set.weight, reps: set.reps });
    }

    exercises.push({
      id: exercise.id,
      name: exercise.name,
      category: normalizeCategory(exercise.category),
      sets,
    });
  }

  return { ok: true, value: { date: day, exercises } };
}

function normalizeDay(value) {
  return isValidDay(value) ? value : null;
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

function invalidPayload(error) {
  return { ok: false, error };
}

function dateFieldMatchesDay(value, day) {
  return value === undefined || (isValidDay(value) && value === day);
}

function isValidDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isPositiveIntegerAtMost(value, max) {
  return Number.isInteger(value) && value > 0 && value <= max;
}

function isFiniteNumberInRange(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function isNonEmptyStringAtMost(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function compareByParentAndSortOrder(a, b) {
  const leftParent = Number(a?.workout_day_id ?? a?.workout_exercise_id ?? 0);
  const rightParent = Number(b?.workout_day_id ?? b?.workout_exercise_id ?? 0);
  if (leftParent !== rightParent) return leftParent - rightParent;

  const leftSort = Number(a?.sort_order ?? 0);
  const rightSort = Number(b?.sort_order ?? 0);
  return leftSort - rightSort;
}
