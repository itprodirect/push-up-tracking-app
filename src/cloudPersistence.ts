import { DayEntry, WorkoutDay } from './storage';

export const CLOUD_PERSISTENCE_ENABLED = import.meta.env.MODE !== 'test';

type PersistenceSnapshot = {
  entries: Record<string, DayEntry>;
  workouts: Record<string, WorkoutDay>;
};

export async function loadPersistenceSnapshot(): Promise<PersistenceSnapshot | null> {
  if (!CLOUD_PERSISTENCE_ENABLED) return null;

  try {
    const response = await fetch('/api/persistence', {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;

    const payload = await response.json();
    return {
      entries: normalizeEntries(payload?.entries),
      workouts: normalizeWorkouts(payload?.workouts),
    };
  } catch {
    return null;
  }
}

export async function savePushupEntries(day: string, entry: DayEntry | null): Promise<void> {
  if (!CLOUD_PERSISTENCE_ENABLED) return;
  await postPersistence({ kind: 'pushups', day, entry });
}

export async function saveWorkoutDays(day: string, workout: WorkoutDay | null): Promise<void> {
  if (!CLOUD_PERSISTENCE_ENABLED) return;
  await postPersistence({ kind: 'workouts', day, workout });
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

async function postPersistence(body: unknown): Promise<void> {
  try {
    await fetch('/api/persistence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // Keep localStorage as the fallback source of truth during rollout.
  }
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
