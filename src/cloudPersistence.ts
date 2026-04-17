import { DayEntry, WorkoutDay } from './storage';

export const CLOUD_PERSISTENCE_ENABLED = import.meta.env.MODE !== 'test';
let supabaseModulePromise: Promise<typeof import('./supabaseClient')> | null = null;

type PersistenceSnapshot = {
  entries: Record<string, DayEntry>;
  workouts: Record<string, WorkoutDay>;
};

export type CloudLoadResult =
  | { kind: 'success'; snapshot: PersistenceSnapshot }
  | { kind: 'auth_error' }
  | { kind: 'error' }
  | { kind: 'disabled' };

export type CloudSaveResult =
  | { kind: 'success' }
  | { kind: 'auth_error' }
  | { kind: 'error' }
  | { kind: 'disabled' };

export async function loadPersistenceSnapshot(): Promise<CloudLoadResult> {
  if (!CLOUD_PERSISTENCE_ENABLED) return { kind: 'disabled' };

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return { kind: 'auth_error' };

    const response = await fetch('/api/persistence', {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (response.status === 401) return { kind: 'auth_error' };
    if (!response.ok) return { kind: 'error' };

    const payload = await response.json();
    return {
      kind: 'success',
      snapshot: {
        entries: normalizeEntries(payload?.entries),
        workouts: normalizeWorkouts(payload?.workouts),
      },
    };
  } catch {
    return { kind: 'error' };
  }
}

export async function savePushupEntries(day: string, entry: DayEntry | null): Promise<CloudSaveResult> {
  if (!CLOUD_PERSISTENCE_ENABLED) return { kind: 'disabled' };
  return postPersistence({ kind: 'pushups', day, entry });
}

export async function saveWorkoutDays(day: string, workout: WorkoutDay | null): Promise<CloudSaveResult> {
  if (!CLOUD_PERSISTENCE_ENABLED) return { kind: 'disabled' };
  return postPersistence({ kind: 'workouts', day, workout });
}

export function mergeEntriesWithLocalFallback(
  remote: Record<string, DayEntry>,
  local: Record<string, DayEntry>,
): Record<string, DayEntry> {
  return { ...remote, ...local };
}

export function mergeWorkoutsWithLocalFallback(
  remote: Record<string, WorkoutDay>,
  local: Record<string, WorkoutDay>,
): Record<string, WorkoutDay> {
  return { ...remote, ...local };
}

async function postPersistence(body: unknown): Promise<CloudSaveResult> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return { kind: 'auth_error' };

    const response = await fetch('/api/persistence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 401) return { kind: 'auth_error' };
    if (!response.ok) return { kind: 'error' };

    return { kind: 'success' };
  } catch {
    // Keep localStorage as the fallback source of truth during rollout.
    return { kind: 'error' };
  }
}

async function getAccessToken(): Promise<string | null> {
  try {
    const { supabase } = await getSupabaseModule();
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

function getSupabaseModule() {
  if (!supabaseModulePromise) {
    supabaseModulePromise = import('./supabaseClient');
  }
  return supabaseModulePromise;
}

function normalizeEntries(value: unknown): Record<string, DayEntry> {
  if (!isRecord(value)) return {};

  const entries: Record<string, DayEntry> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!isRecord(item)) continue;
    entries[key] = {
      date: typeof item.date === 'string' ? item.date : key,
      sets: normalizeNumberArray(item.sets),
    };
  }
  return entries;
}

function normalizeWorkouts(value: unknown): Record<string, WorkoutDay> {
  if (!isRecord(value)) return {};

  const workouts: Record<string, WorkoutDay> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!isRecord(item)) continue;
    workouts[key] = {
      date: typeof item.date === 'string' ? item.date : key,
      exercises: normalizeExercises(item.exercises),
    };
  }
  return workouts;
}

function normalizeExercises(value: unknown): WorkoutDay['exercises'] {
  if (!Array.isArray(value)) return [];

  const exercises: WorkoutDay['exercises'] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    if (typeof item.id !== 'string' || typeof item.name !== 'string') continue;
    exercises.push({
      id: item.id,
      name: item.name,
      category: normalizeCategory(item.category),
      notes: typeof item.notes === 'string' ? item.notes : undefined,
      sets: normalizeSets(item.sets),
    });
  }
  return exercises;
}

function normalizeSets(value: unknown): { weight: number; reps: number }[] {
  if (!Array.isArray(value)) return [];

  const sets: { weight: number; reps: number }[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    if (!Number.isFinite(item.weight) || !Number.isFinite(item.reps)) continue;
    sets.push({ weight: item.weight, reps: item.reps });
  }
  return sets;
}

function normalizeNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is number => Number.isFinite(item));
}

function normalizeCategory(value: unknown) {
  if (value === 'push' || value === 'Chest / Push') return 'Chest / Push';
  if (value === 'pull' || value === 'Back / Pull') return 'Back / Pull';
  if (value === 'legs' || value === 'Legs') return 'Legs';
  if (value === 'Arms' || value === 'Shoulders' || value === 'Cardio' || value === 'core' || value === 'other') {
    return value;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
