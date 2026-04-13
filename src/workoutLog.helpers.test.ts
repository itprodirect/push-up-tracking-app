import { describe, expect, it } from 'vitest';
import { WorkoutDay } from './storage';
import {
  describeRange,
  filterDaysInRange,
  rangeStart,
  summarize,
} from './workoutLog.helpers';

function day(date: string, exercises: WorkoutDay['exercises']): WorkoutDay {
  return { date, exercises };
}

describe('rangeStart', () => {
  it('returns null for "all"', () => {
    expect(rangeStart('all', new Date(2026, 3, 13))).toBeNull();
  });

  it('"30d" returns 29 days before today (last 30 days inclusive)', () => {
    const now = new Date(2026, 3, 30); // Apr 30
    const start = rangeStart('30d', now)!;
    // 30 days inclusive: Apr 30 - 29 = Apr 1
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(3);
    expect(start.getDate()).toBe(1);
  });

  it('"week" returns Monday of the current ISO week when today is Wednesday', () => {
    // Apr 15 2026 is a Wednesday
    const wed = new Date(2026, 3, 15);
    expect(wed.getDay()).toBe(3);
    const start = rangeStart('week', wed)!;
    expect(start.getDate()).toBe(13); // Monday Apr 13
    expect(start.getMonth()).toBe(3);
  });

  it('"week" treats Sunday as the last day of the week (offset 6)', () => {
    // Apr 19 2026 is a Sunday
    const sun = new Date(2026, 3, 19);
    expect(sun.getDay()).toBe(0);
    const start = rangeStart('week', sun)!;
    expect(start.getDate()).toBe(13); // Still Monday Apr 13
  });

  it('"week" on Monday returns the same day', () => {
    const mon = new Date(2026, 3, 13);
    expect(mon.getDay()).toBe(1);
    const start = rangeStart('week', mon)!;
    expect(start.getDate()).toBe(13);
  });

  it('"month" returns the 1st of the current month', () => {
    const start = rangeStart('month', new Date(2026, 3, 25))!;
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(3);
    expect(start.getDate()).toBe(1);
  });

  it('"year" returns Jan 1 of the current year', () => {
    const start = rangeStart('year', new Date(2026, 5, 30))!;
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
  });
});

describe('filterDaysInRange', () => {
  const ex = (name: string, w: number, r: number) => ({
    id: name,
    name,
    sets: [{ weight: w, reps: r }],
  });

  const days: Record<string, WorkoutDay> = {
    '2025-12-25': day('2025-12-25', [ex('Old Bench', 100, 10)]),
    '2026-03-01': day('2026-03-01', [ex('Mar Bench', 100, 10)]),
    '2026-04-10': day('2026-04-10', [ex('Early Apr', 100, 10)]),
    '2026-04-13': day('2026-04-13', [ex('Today Bench', 100, 10)]),
    '2026-04-14': day('2026-04-14', []), // empty day should be filtered
  };
  const now = new Date(2026, 3, 13); // Mon Apr 13 2026

  it('excludes days outside the range', () => {
    const result = filterDaysInRange(days, 'week', now);
    const dates = result.map((d) => d.date);
    expect(dates).toContain('2026-04-13');
    expect(dates).not.toContain('2026-04-10');
    expect(dates).not.toContain('2025-12-25');
  });

  it('excludes days with no exercises even if in range', () => {
    // Bump "now" to Apr 15 so Apr 14 is in-range but empty
    const later = new Date(2026, 3, 15);
    const result = filterDaysInRange(days, 'month', later);
    expect(result.map((d) => d.date)).not.toContain('2026-04-14');
  });

  it('returns newest day first', () => {
    const result = filterDaysInRange(days, 'year', now);
    expect(result[0].date).toBe('2026-04-13');
  });

  it('"all" includes everything with exercises', () => {
    const result = filterDaysInRange(days, 'all', now);
    expect(result).toHaveLength(4); // the 5th day is empty
  });

  it('"month" with now=Apr 13 includes only April entries', () => {
    const result = filterDaysInRange(days, 'month', now);
    expect(result.map((d) => d.date)).toEqual(['2026-04-13', '2026-04-10']);
  });
});

describe('summarize', () => {
  const makeDay = (date: string, exercises: WorkoutDay['exercises']) => ({ date, exercises });

  it('returns zeros for empty input', () => {
    const s = summarize([]);
    expect(s).toEqual({
      workoutCount: 0,
      totalVolume: 0,
      totalSets: 0,
      topExercises: [],
    });
  });

  it('aggregates volume, sets, and workout count', () => {
    const s = summarize([
      makeDay('2026-04-13', [
        { id: 'a', name: 'Bench', sets: [{ weight: 100, reps: 10 }, { weight: 100, reps: 10 }] },
      ]),
      makeDay('2026-04-12', [
        { id: 'b', name: 'Row', sets: [{ weight: 90, reps: 10 }] },
      ]),
    ]);
    expect(s.workoutCount).toBe(2);
    expect(s.totalSets).toBe(3);
    expect(s.totalVolume).toBe(100 * 10 + 100 * 10 + 90 * 10); // 2900
  });

  it('returns top exercises sorted by volume, max 3', () => {
    const s = summarize([
      makeDay('2026-04-13', [
        { id: '1', name: 'Bench', sets: [{ weight: 100, reps: 10 }] }, // 1000
        { id: '2', name: 'Row', sets: [{ weight: 50, reps: 10 }] }, // 500
        { id: '3', name: 'Squat', sets: [{ weight: 200, reps: 10 }] }, // 2000
        { id: '4', name: 'Curl', sets: [{ weight: 20, reps: 10 }] }, // 200
      ]),
    ]);
    expect(s.topExercises.map((e) => e.name)).toEqual(['Squat', 'Bench', 'Row']);
    expect(s.topExercises).toHaveLength(3);
  });

  it('aggregates across days when the same exercise name appears multiple times', () => {
    const s = summarize([
      makeDay('2026-04-13', [
        { id: 'a', name: 'Bench', sets: [{ weight: 100, reps: 10 }] },
      ]),
      makeDay('2026-04-11', [
        { id: 'b', name: 'Bench', sets: [{ weight: 100, reps: 10 }] },
      ]),
    ]);
    const bench = s.topExercises.find((e) => e.name === 'Bench');
    expect(bench?.count).toBe(2);
    expect(bench?.volume).toBe(2000);
  });
});

describe('describeRange', () => {
  const now = new Date(2026, 3, 13); // Apr 13 2026

  it('describes "all" as "All time"', () => {
    expect(describeRange('all', now)).toBe('All time');
  });

  it('describes "30d" as "Last 30 days"', () => {
    expect(describeRange('30d', now)).toBe('Last 30 days');
  });

  it('describes "year" with just the year number', () => {
    expect(describeRange('year', now)).toBe('2026');
  });

  it('describes "month" with full month name and year', () => {
    expect(describeRange('month', now)).toMatch(/April.*2026/);
  });

  it('describes "week" as a date range string with the year', () => {
    expect(describeRange('week', now)).toMatch(/2026/);
  });
});
