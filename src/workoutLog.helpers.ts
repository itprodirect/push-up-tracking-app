// Pure helpers for the workout log view. Kept separate from the React component
// so they can be unit-tested without jsdom or any component plumbing.
import { WorkoutDay, exerciseVolume } from './storage';

export type LogRange = 'week' | 'month' | '30d' | 'year' | 'all';

/** Cutoff start date for a range. Returns null for 'all' (no lower bound). */
export function rangeStart(range: LogRange, now: Date = new Date()): Date | null {
  if (range === 'all') return null;

  if (range === '30d') {
    const d = new Date(now);
    d.setDate(d.getDate() - 29); // last 30 days including today
    return d;
  }

  if (range === 'week') {
    // ISO week: Monday through today. Sun(0) => offset 6, Mon(1) => 0, etc.
    const d = new Date(now);
    const dow = d.getDay();
    const offset = dow === 0 ? 6 : dow - 1;
    d.setDate(d.getDate() - offset);
    return d;
  }

  if (range === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  if (range === 'year') {
    return new Date(now.getFullYear(), 0, 1);
  }

  return null;
}

export function filterDaysInRange(
  days: Record<string, WorkoutDay>,
  range: LogRange,
  now: Date = new Date(),
): WorkoutDay[] {
  const start = rangeStart(range, now);
  const startKey = start ? dateKey(start) : null;
  const result: WorkoutDay[] = [];
  const keys = Object.keys(days).sort().reverse();
  for (const key of keys) {
    if (startKey && key < startKey) continue;
    const day = days[key];
    const exercises = day.exercises.filter((ex) => ex.sets.length > 0);
    if (exercises.length > 0) result.push({ ...day, exercises });
  }
  return result;
}

export type RangeSummary = {
  workoutCount: number;
  totalVolume: number;
  totalSets: number;
  topExercises: { name: string; count: number; volume: number }[];
};

export function summarize(rangeDays: WorkoutDay[]): RangeSummary {
  let workoutCount = 0;
  let totalVolume = 0;
  let totalSets = 0;
  const byName = new Map<string, { name: string; count: number; volume: number }>();
  for (const day of rangeDays) {
    let hasLoggedExercise = false;
    for (const ex of day.exercises) {
      if (ex.sets.length === 0) continue;
      hasLoggedExercise = true;
      const v = exerciseVolume(ex);
      totalVolume += v;
      totalSets += ex.sets.length;
      const existing = byName.get(ex.name) ?? { name: ex.name, count: 0, volume: 0 };
      existing.count += ex.sets.length;
      existing.volume += v;
      byName.set(ex.name, existing);
    }
    if (hasLoggedExercise) workoutCount++;
  }
  const topExercises = Array.from(byName.values())
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 3);
  return {
    workoutCount,
    totalVolume,
    totalSets,
    topExercises,
  };
}

export function describeRange(range: LogRange, now: Date = new Date()): string {
  if (range === 'all') return 'All time';
  if (range === '30d') return 'Last 30 days';
  if (range === 'year') return `${now.getFullYear()}`;
  if (range === 'month') {
    return now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  if (range === 'week') {
    const start = rangeStart('week', now)!;
    const sMo = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const eMo = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${sMo} – ${eMo}, ${now.getFullYear()}`;
  }
  return '';
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
