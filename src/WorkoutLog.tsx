import { useMemo } from 'react';
import {
  WorkoutDay,
  dayVolume,
  exerciseVolume,
  groupSets,
} from './storage';
import { formatHistoryDate } from './dates';

export type LogRange = 'week' | 'month' | '30d' | 'year' | 'all';

const RANGES: { key: LogRange; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: '30d', label: '30D' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All' },
];

export function WorkoutLog({
  days,
  range,
  onRangeChange,
  onJumpToDay,
}: {
  days: Record<string, WorkoutDay>;
  range: LogRange;
  onRangeChange: (r: LogRange) => void;
  onJumpToDay: (date: string) => void;
}) {
  const rangeDays = useMemo(() => filterDaysInRange(days, range), [days, range]);
  const summary = useMemo(() => summarize(rangeDays), [rangeDays]);
  const rangeLabel = describeRange(range);

  return (
    <>
      <div className="section-title">Workout Log</div>

      <div className="card">
        <div className="range-tabs">
          {RANGES.map((r) => (
            <button
              key={r.key}
              className={range === r.key ? 'active' : ''}
              onClick={() => onRangeChange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="log-range-label">{rangeLabel}</div>

        <div className="summary-stats">
          <div className="summary-stat">
            <div className="summary-value">{summary.workoutCount}</div>
            <div className="summary-label">{summary.workoutCount === 1 ? 'Workout' : 'Workouts'}</div>
          </div>
          <div className="summary-stat">
            <div className="summary-value">{summary.totalVolume.toLocaleString()}</div>
            <div className="summary-label">Total Volume</div>
          </div>
          <div className="summary-stat">
            <div className="summary-value">{summary.totalSets}</div>
            <div className="summary-label">Total Sets</div>
          </div>
        </div>

        {summary.topExercises.length > 0 && (
          <>
            <div className="field-label" style={{ marginTop: 16 }}>
              Top Exercises
            </div>
            <div className="top-ex-list">
              {summary.topExercises.map((ex) => (
                <div key={ex.name} className="top-ex-row">
                  <span className="top-ex-name">{ex.name}</span>
                  <span className="top-ex-meta">
                    {ex.count}× · {ex.volume.toLocaleString()} vol
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {rangeDays.length === 0 ? (
        <div className="card empty-state">No workouts logged in this range yet.</div>
      ) : (
        rangeDays.map((day) => (
          <div key={day.date} className="card log-day-card">
            <div className="log-day-header">
              <button className="log-day-date" onClick={() => onJumpToDay(day.date)}>
                {formatHistoryDate(day.date)}
              </button>
              <span className="log-day-volume">{dayVolume(day).toLocaleString()}</span>
            </div>
            <div className="log-exercises">
              {day.exercises.map((ex) => {
                const groups = groupSets(ex.sets);
                return (
                  <div key={ex.id} className="log-exercise">
                    <div className="log-exercise-head">
                      <span className="log-exercise-name">{ex.name}</span>
                      <span className="log-exercise-vol">
                        {exerciseVolume(ex).toLocaleString()}
                      </span>
                    </div>
                    {ex.category && <div className="log-exercise-cat">{ex.category}</div>}
                    <div className="log-sets">
                      {groups.map((g, i) => (
                        <span key={i} className="set-tag">
                          {g.weight}×{g.reps}
                          {g.count > 1 && `×${g.count}`}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </>
  );
}

/** Cutoff start date for a range. Returns null for 'all' (no lower bound). */
function rangeStart(range: LogRange): Date | null {
  const now = new Date();
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

function filterDaysInRange(
  days: Record<string, WorkoutDay>,
  range: LogRange,
): WorkoutDay[] {
  const start = rangeStart(range);
  const startKey = start ? todayKeyLocal(start) : null;
  const result: WorkoutDay[] = [];
  const keys = Object.keys(days).sort().reverse();
  for (const key of keys) {
    if (startKey && key < startKey) continue;
    const day = days[key];
    if (day.exercises.length > 0) result.push(day);
  }
  return result;
}

// Local helper so we don't import circularly; mirrors dates.ts#todayKey.
function todayKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function summarize(rangeDays: WorkoutDay[]) {
  let totalVolume = 0;
  let totalSets = 0;
  const byName = new Map<string, { name: string; count: number; volume: number }>();
  for (const day of rangeDays) {
    for (const ex of day.exercises) {
      const v = exerciseVolume(ex);
      totalVolume += v;
      totalSets += ex.sets.length;
      const existing = byName.get(ex.name) ?? { name: ex.name, count: 0, volume: 0 };
      existing.count += ex.sets.length;
      existing.volume += v;
      byName.set(ex.name, existing);
    }
  }
  const topExercises = Array.from(byName.values())
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 3);
  return {
    workoutCount: rangeDays.length,
    totalVolume,
    totalSets,
    topExercises,
  };
}

function describeRange(range: LogRange): string {
  const now = new Date();
  if (range === 'all') return 'All time';
  if (range === '30d') return 'Last 30 days';
  if (range === 'year') return `${now.getFullYear()}`;
  if (range === 'month') {
    return now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }
  if (range === 'week') {
    const start = rangeStart('week')!;
    const sMo = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const eMo = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${sMo} – ${eMo}, ${now.getFullYear()}`;
  }
  return '';
}
