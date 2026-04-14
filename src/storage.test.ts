import { describe, expect, it } from 'vitest';
import {
  DayEntry,
  WorkoutExercise,
  dayVolume,
  exerciseVolume,
  groupSets,
  loadEntries,
  loadSettings,
  loadWorkouts,
  saveEntries,
  saveSettings,
  saveWorkouts,
  totalFor,
} from './storage';

describe('totalFor', () => {
  it('returns 0 for undefined entry', () => {
    expect(totalFor(undefined)).toBe(0);
  });

  it('sums all sets in an entry', () => {
    const entry: DayEntry = { date: '2026-04-13', sets: [10, 20, 10] };
    expect(totalFor(entry)).toBe(40);
  });

  it('returns 0 for an entry with no sets', () => {
    expect(totalFor({ date: '2026-04-13', sets: [] })).toBe(0);
  });
});

describe('exerciseVolume', () => {
  it('computes weight × reps summed across sets', () => {
    const ex: WorkoutExercise = {
      id: 'a',
      name: 'Bench',
      sets: [
        { weight: 100, reps: 10 },
        { weight: 100, reps: 10 },
        { weight: 110, reps: 8 },
      ],
    };
    // 1000 + 1000 + 880 = 2880
    expect(exerciseVolume(ex)).toBe(2880);
  });

  it('returns 0 for an empty exercise', () => {
    const ex: WorkoutExercise = { id: 'a', name: 'Bench', sets: [] };
    expect(exerciseVolume(ex)).toBe(0);
  });

  it('handles fractional weights', () => {
    const ex: WorkoutExercise = {
      id: 'a',
      name: 'Dumbbell Curl',
      sets: [{ weight: 22.5, reps: 10 }],
    };
    expect(exerciseVolume(ex)).toBe(225);
  });
});

describe('dayVolume', () => {
  it('returns 0 for undefined', () => {
    expect(dayVolume(undefined)).toBe(0);
  });

  it('sums volume across all exercises in a day', () => {
    const day = {
      date: '2026-04-13',
      exercises: [
        { id: 'a', name: 'Bench', sets: [{ weight: 100, reps: 10 }] }, // 1000
        { id: 'b', name: 'Row', sets: [{ weight: 90, reps: 10 }] }, // 900
      ],
    };
    expect(dayVolume(day)).toBe(1900);
  });
});

describe('groupSets', () => {
  it('collapses consecutive identical sets into count groups', () => {
    const grouped = groupSets([
      { weight: 90, reps: 10 },
      { weight: 90, reps: 10 },
      { weight: 100, reps: 10 },
    ]);
    expect(grouped).toEqual([
      { weight: 90, reps: 10, count: 2 },
      { weight: 100, reps: 10, count: 1 },
    ]);
  });

  it('does not merge non-consecutive identical sets', () => {
    const grouped = groupSets([
      { weight: 90, reps: 10 },
      { weight: 100, reps: 10 },
      { weight: 90, reps: 10 },
    ]);
    expect(grouped).toHaveLength(3);
    expect(grouped.map((g) => g.count)).toEqual([1, 1, 1]);
  });

  it('handles empty input', () => {
    expect(groupSets([])).toEqual([]);
  });
});

describe('localStorage round-trips', () => {
  it('saves and loads push-up entries', () => {
    const entries = { '2026-04-13': { date: '2026-04-13', sets: [10, 20] } };
    saveEntries(entries);
    expect(loadEntries()).toEqual(entries);
  });

  it('returns empty object when entries key is missing', () => {
    expect(loadEntries()).toEqual({});
  });

  it('returns empty object when entries key is malformed', () => {
    localStorage.setItem('pushup.entries.v1', '{not json');
    expect(loadEntries()).toEqual({});
  });

  it('returns empty object when entries JSON parses to a non-object root', () => {
    localStorage.setItem('pushup.entries.v1', 'null');
    expect(loadEntries()).toEqual({});
  });

  it('normalizes malformed entry shapes instead of trusting them directly', () => {
    localStorage.setItem(
      'pushup.entries.v1',
      JSON.stringify({
        '2026-04-13': { date: '2026-04-13', sets: [10, 'bad', 20] },
        '2026-04-14': { date: 123, sets: null },
        '2026-04-15': 'invalid',
      }),
    );

    expect(loadEntries()).toEqual({
      '2026-04-13': { date: '2026-04-13', sets: [10, 20] },
      '2026-04-14': { date: '2026-04-14', sets: [] },
    });
  });

  it('saves and loads settings, falling back to default 50 goal', () => {
    expect(loadSettings()).toEqual({ dailyGoal: 50 });
    saveSettings({ dailyGoal: 75 });
    expect(loadSettings()).toEqual({ dailyGoal: 75 });
  });

  it('falls back to the default goal when parsed settings are invalid', () => {
    localStorage.setItem('pushup.settings.v1', JSON.stringify({ dailyGoal: 0 }));
    expect(loadSettings()).toEqual({ dailyGoal: 50 });
  });

  it('saves and loads workouts', () => {
    const workouts = {
      '2026-04-13': {
        date: '2026-04-13',
        exercises: [
          {
            id: 'a',
            name: 'Bench',
            category: 'Chest / Push' as const,
            sets: [{ weight: 100, reps: 10 }],
          },
        ],
      },
    };
    saveWorkouts(workouts);
    expect(loadWorkouts()).toEqual(workouts);
  });

  it('normalizes malformed workout shapes instead of trusting them directly', () => {
    localStorage.setItem(
      'workouts.entries.v1',
      JSON.stringify({
        '2026-04-13': {
          date: '2026-04-13',
          exercises: [
            {
              id: 'a',
              name: 'Bench',
              category: 'push',
              notes: 'top set',
              sets: [{ weight: 100, reps: 10 }, { weight: 'bad', reps: 8 }],
            },
            {
              id: 'b',
              name: 'Row',
              category: 'invalid',
              sets: null,
            },
            {
              id: 123,
              name: 'Skip me',
              sets: [],
            },
          ],
        },
        '2026-04-14': null,
      }),
    );

    expect(loadWorkouts()).toEqual({
      '2026-04-13': {
        date: '2026-04-13',
        exercises: [
          {
            id: 'a',
            name: 'Bench',
            category: 'Chest / Push',
            notes: 'top set',
            sets: [{ weight: 100, reps: 10 }],
          },
          {
            id: 'b',
            name: 'Row',
            category: undefined,
            notes: undefined,
            sets: [],
          },
        ],
      },
    });
  });

  it('maps legacy workout categories to the new category labels on load', () => {
    localStorage.setItem(
      'workouts.entries.v1',
      JSON.stringify({
        '2026-04-13': {
          date: '2026-04-13',
          exercises: [
            { id: 'a', name: 'Bench', category: 'push', sets: [{ weight: 100, reps: 10 }] },
            { id: 'b', name: 'Row', category: 'pull', sets: [{ weight: 90, reps: 10 }] },
            { id: 'c', name: 'Leg Press', category: 'legs', sets: [{ weight: 300, reps: 10 }] },
          ],
        },
      }),
    );

    expect(loadWorkouts()).toEqual({
      '2026-04-13': {
        date: '2026-04-13',
        exercises: [
          { id: 'a', name: 'Bench', category: 'Chest / Push', sets: [{ weight: 100, reps: 10 }] },
          { id: 'b', name: 'Row', category: 'Back / Pull', sets: [{ weight: 90, reps: 10 }] },
          { id: 'c', name: 'Leg Press', category: 'Legs', sets: [{ weight: 300, reps: 10 }] },
        ],
      },
    });
  });
});
