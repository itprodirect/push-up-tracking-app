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
    return JSON.parse(raw);
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
    if (raw) return JSON.parse(raw);
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
  category?: 'push' | 'pull' | 'legs' | 'core' | 'other';
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
    return JSON.parse(raw);
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
