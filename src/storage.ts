// localStorage persistence. Schema is intentionally simple and flat so a future
// backend (DynamoDB) can mirror it with pk=userId, sk=date.
// Version suffixes (`.v1`) let us migrate cleanly later.

// ---------- Push-ups ----------

export type DayEntry = {
  date: string; // YYYY-MM-DD, local timezone
  sets: number[]; // e.g. [10, 10, 20, 10]
};

export type Settings = {
  dailyGoal: number;
};

const ENTRIES_KEY = 'pushup.entries.v1';
const SETTINGS_KEY = 'pushup.settings.v1';

export function loadEntries(): Record<string, DayEntry> {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) return {};

    const entries: Record<string, DayEntry> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!isRecord(value)) continue;
      entries[key] = {
        date: typeof value.date === 'string' ? value.date : key,
        sets: normalizeNumberArray(value.sets),
      };
    }
    return entries;
  } catch {
    return {};
  }
}

export function saveEntries(entries: Record<string, DayEntry>): void {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isRecord(parsed) && Number.isFinite(parsed.dailyGoal) && parsed.dailyGoal > 0) {
        return { dailyGoal: parsed.dailyGoal };
      }
    }
  } catch {
    // fall through
  }
  return { dailyGoal: 50 };
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function totalFor(entry: DayEntry | undefined): number {
  if (!entry) return 0;
  return entry.sets.reduce((a, b) => a + b, 0);
}

// ---------- Workouts ----------

export type WorkoutSet = {
  weight: number;
  reps: number;
};

export type WorkoutExercise = {
  id: string;
  name: string;
  category?:
    | 'Chest / Push'
    | 'Back / Pull'
    | 'Arms'
    | 'Shoulders'
    | 'Legs'
    | 'Cardio'
    | 'core'
    | 'other';
  sets: WorkoutSet[];
  notes?: string;
};

export type WorkoutDay = {
  date: string;
  exercises: WorkoutExercise[];
};

const WORKOUTS_KEY = 'workouts.entries.v1';

export function loadWorkouts(): Record<string, WorkoutDay> {
  try {
    const raw = localStorage.getItem(WORKOUTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed)) return {};

    const workouts: Record<string, WorkoutDay> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!isRecord(value)) continue;
      workouts[key] = {
        date: typeof value.date === 'string' ? value.date : key,
        exercises: normalizeExercises(value.exercises),
      };
    }
    return workouts;
  } catch {
    return {};
  }
}

export function saveWorkouts(w: Record<string, WorkoutDay>): void {
  localStorage.setItem(WORKOUTS_KEY, JSON.stringify(w));
}

export function exerciseVolume(ex: WorkoutExercise): number {
  return ex.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

export function dayVolume(day: WorkoutDay | undefined): number {
  if (!day) return 0;
  return day.exercises.reduce((sum, ex) => sum + exerciseVolume(ex), 0);
}

/** Collapse consecutive identical sets into compact (weight × reps × count) groups. */
export function groupSets(
  sets: WorkoutSet[],
): { weight: number; reps: number; count: number }[] {
  const out: { weight: number; reps: number; count: number }[] = [];
  for (const s of sets) {
    const last = out[out.length - 1];
    if (last && last.weight === s.weight && last.reps === s.reps) {
      last.count++;
    } else {
      out.push({ weight: s.weight, reps: s.reps, count: 1 });
    }
  }
  return out;
}

function normalizeExercises(value: unknown): WorkoutExercise[] {
  if (!Array.isArray(value)) return [];

  const exercises: WorkoutExercise[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    if (typeof item.id !== 'string' || typeof item.name !== 'string') continue;
    exercises.push({
      id: item.id,
      name: item.name,
      category: normalizeCategory(item.category),
      notes: typeof item.notes === 'string' ? item.notes : undefined,
      sets: normalizeWorkoutSets(item.sets),
    });
  }
  return exercises;
}

function normalizeWorkoutSets(value: unknown): WorkoutSet[] {
  if (!Array.isArray(value)) return [];

  const sets: WorkoutSet[] = [];
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

function normalizeCategory(value: unknown): WorkoutExercise['category'] {
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
