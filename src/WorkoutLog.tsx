import { useMemo } from 'react';
import {
  WorkoutDay,
  dayVolume,
  exerciseVolume,
  groupSets,
} from './storage';
import { formatHistoryDate } from './dates';
import {
  LogRange,
  describeRange,
  filterDaysInRange,
  summarize,
} from './workoutLog.helpers';

export type { LogRange };

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
        <div className="card empty-state empty-state-rich">
          <img
            className="empty-state-illustration"
            src="/images/app/empty-states/workout-empty-state.png"
            alt=""
            aria-hidden="true"
            loading="lazy"
          />
          <div className="empty-state-message">No workouts logged in this range yet.</div>
        </div>
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
