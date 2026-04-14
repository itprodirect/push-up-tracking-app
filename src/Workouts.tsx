import { useEffect, useMemo, useState } from 'react';
import {
  WorkoutDay,
  WorkoutExercise,
  dayVolume,
  exerciseVolume,
  groupSets,
  loadWorkouts,
  saveWorkouts,
} from './storage';
import { formatHeaderDate, formatHistoryDate, parseKey, todayKey } from './dates';
import { TrendChart, TrendRange } from './TrendChart';
import { LogRange, WorkoutLog } from './WorkoutLog';
import {
  CANONICAL_EXERCISES,
  EXERCISE_CATEGORIES,
  getExerciseCategory,
  isKnownExercise,
  normalizeExerciseName,
} from './exerciseCatalog';

const EXERCISE_CATALOG_ID = 'exercise-catalog';

export default function Workouts() {
  const [days, setDays] = useState<Record<string, WorkoutDay>>(() => loadWorkouts());
  const [range, setRange] = useState<TrendRange>(30);
  const [logRange, setLogRange] = useState<LogRange>('week');
  const [viewDate, setViewDate] = useState<string>(() => todayKey());
  const [draft, setDraft] = useState({
    name: '',
    category: EXERCISE_CATEGORIES[0] as WorkoutExercise['category'],
  });

  useEffect(() => saveWorkouts(days), [days]);

  const isToday = viewDate === todayKey();
  const day = days[viewDate];
  const volume = dayVolume(day);

  const recentNames = useMemo(() => collectRecentExerciseNames(days), [days]);

  function addExercise() {
    const name = normalizeExerciseName(draft.name);
    if (!name) return;
    setDays((prev) => {
      const existing = prev[viewDate] ?? { date: viewDate, exercises: [] };
      const ex: WorkoutExercise = {
        id: cryptoId(),
        name,
        category: draft.category,
        sets: [],
      };
      return { ...prev, [viewDate]: { ...existing, exercises: [...existing.exercises, ex] } };
    });
    setDraft((prev) => ({ ...prev, name: '' }));
  }

  function quickAddExercise(name: string, category: WorkoutExercise['category']) {
    const normalizedName = normalizeExerciseName(name);
    if (!normalizedName) return;
    const detectedCategory = getExerciseCategory(normalizedName);
    setDays((prev) => {
      const existing = prev[viewDate] ?? { date: viewDate, exercises: [] };
      const ex: WorkoutExercise = {
        id: cryptoId(),
        name: normalizedName,
        category: detectedCategory ?? category,
        sets: [],
      };
      return { ...prev, [viewDate]: { ...existing, exercises: [...existing.exercises, ex] } };
    });
  }

  function updateDraftName(name: string) {
    const detectedCategory = getExerciseCategory(name);
    setDraft((prev) => ({
      ...prev,
      name,
      category: detectedCategory ?? prev.category,
    }));
  }

  function addSetsToExercise(exId: string, weight: number, reps: number, count: number) {
    if (
      !Number.isFinite(weight) ||
      weight < 0 ||
      !Number.isInteger(reps) ||
      reps <= 0 ||
      !Number.isInteger(count) ||
      count <= 0
    ) {
      return;
    }
    setDays((prev) => {
      const existing = prev[viewDate];
      if (!existing) return prev;
      const exercises = existing.exercises.map((ex) => {
        if (ex.id !== exId) return ex;
        const newSets = [...ex.sets];
        for (let i = 0; i < count; i++) newSets.push({ weight, reps });
        return { ...ex, sets: newSets };
      });
      return { ...prev, [viewDate]: { ...existing, exercises } };
    });
  }

  function removeLastSet(exId: string) {
    setDays((prev) => {
      const existing = prev[viewDate];
      if (!existing) return prev;
      const exercises = existing.exercises.flatMap((ex) => {
        if (ex.id !== exId) return [ex];
        const sets = ex.sets.slice(0, -1);
        return sets.length > 0 ? [{ ...ex, sets }] : [];
      });
      if (exercises.length === 0) {
        const { [viewDate]: _drop, ...rest } = prev;
        return rest;
      }
      return { ...prev, [viewDate]: { ...existing, exercises } };
    });
  }

  function removeExercise(exId: string) {
    setDays((prev) => {
      const existing = prev[viewDate];
      if (!existing) return prev;
      const exercises = existing.exercises.filter((ex) => ex.id !== exId);
      if (exercises.length === 0) {
        const { [viewDate]: _drop, ...rest } = prev;
        return rest;
      }
      return { ...prev, [viewDate]: { ...existing, exercises } };
    });
  }

  const history = useMemo(() => buildVolumeHistory(days, range), [days, range]);

  return (
    <>
      <header className="header">
        <h1>Workouts</h1>
        <span className="date">{formatHeaderDate(parseKey(viewDate))}</span>
      </header>

      <section className="card">
        {!isToday && (
          <div className="viewing-banner">
            Viewing {formatHistoryDate(viewDate)}
            <button className="link-btn" onClick={() => setViewDate(todayKey())}>
              Back to today
            </button>
          </div>
        )}
        <div className="today-total">{volume.toLocaleString()}</div>
        <div className="today-goal">total volume (weight × reps)</div>
      </section>

      {day && day.exercises.length > 0 && (
        <>
          <div className="section-title">Today's exercises</div>
          {day.exercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              onAddSets={(w, r, c) => addSetsToExercise(ex.id, w, r, c)}
              onRemoveLast={() => removeLastSet(ex.id)}
              onRemoveExercise={() => removeExercise(ex.id)}
            />
          ))}
        </>
      )}

      <div className="section-title">Add exercise</div>
      <div className="card">
        <label className="field-label" htmlFor="exercise-name">
          Name
        </label>
        <input
          id="exercise-name"
          className="text-input"
          list={EXERCISE_CATALOG_ID}
          placeholder="e.g. Hammer Pullover Pull"
          value={draft.name}
          onChange={(e) => updateDraftName(e.target.value)}
        />
        <datalist id={EXERCISE_CATALOG_ID}>
          {CANONICAL_EXERCISES.map((exercise) => (
            <option key={exercise} value={exercise} />
          ))}
        </datalist>
        <label className="field-label" style={{ marginTop: 10 }}>
          Category
        </label>
        <div className="chip-group">
          {EXERCISE_CATEGORIES.map((c) => (
            <button
              key={c}
              className={`chip ${draft.category === c ? 'active' : ''}`}
              onClick={() => setDraft((prev) => ({ ...prev, category: c }))}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="modal-actions" style={{ marginTop: 12 }}>
          <button className="primary" onClick={addExercise} disabled={!draft.name.trim()}>
            Add exercise
          </button>
        </div>
        {recentNames.length > 0 && (
          <>
            <div className="field-label" style={{ marginTop: 16 }}>
              Recently used
            </div>
            <div className="chip-group">
              {recentNames.slice(0, 8).map((r) => (
                <button
                  key={r.name}
                  className={`chip suggestion-chip ${r.kind}`}
                  onClick={() => quickAddExercise(r.name, r.category)}
                >
                  <span className="chip-label">+ {r.name}</span>
                  <span className={`chip-badge ${r.kind}`}>{r.kind === 'catalog' ? 'Catalog' : 'Custom'}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="section-title">Volume trend</div>
      <div className="card">
        <div className="range-tabs">
          {([7, 30, 365, 1825, 'all'] as TrendRange[]).map((r) => (
            <button key={String(r)} className={range === r ? 'active' : ''} onClick={() => setRange(r)}>
              {rangeLabel(r)}
            </button>
          ))}
        </div>
        <TrendChart data={history} range={range} color="#f59e0b" label="Volume" />
      </div>

      <div className="section-title">Jump to a day</div>
      <div className="card">
        <input
          type="date"
          value={viewDate}
          max={todayKey()}
          onChange={(e) => e.target.value && setViewDate(e.target.value)}
          className="date-input"
        />
      </div>

      <WorkoutLog
        days={days}
        range={logRange}
        onRangeChange={setLogRange}
        onJumpToDay={(d) => {
          setViewDate(d);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </>
  );
}

function ExerciseCard({
  exercise,
  onAddSets,
  onRemoveLast,
  onRemoveExercise,
}: {
  exercise: WorkoutExercise;
  onAddSets: (weight: number, reps: number, count: number) => void;
  onRemoveLast: () => void;
  onRemoveExercise: () => void;
}) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [count, setCount] = useState('1');

  function submit() {
    const w = parseNonNegativeNumber(weight);
    const r = parsePositiveInteger(reps);
    const c = parsePositiveInteger(count);
    if (w === null || r === null || c === null) return;
    onAddSets(w, r, c);
    // Keep weight/reps so adding more sets at the same load is quick; reset count.
    setCount('1');
  }

  // Group consecutive identical sets for compact display ("90×10×2")
  const grouped = groupSets(exercise.sets);

  return (
    <div className="card exercise-card">
      <div className="exercise-header">
        <div>
          <div className="exercise-name">{exercise.name}</div>
          <div className="exercise-meta">
            {exerciseVolume(exercise).toLocaleString()} volume
            {exercise.category && ` · ${exercise.category}`}
          </div>
        </div>
        <button className="link-btn danger" onClick={onRemoveExercise}>
          Remove
        </button>
      </div>

      {grouped.length > 0 && (
        <div className="sets-list">
          {grouped.map((g, i) => (
            <div key={i} className="set-line">
              {g.weight}×{g.reps}
              {g.count > 1 && `×${g.count}`}
            </div>
          ))}
        </div>
      )}

      <div className="set-form">
        <input
          className="text-input small"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          placeholder="weight"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
        <span className="x-sep">×</span>
        <input
          className="text-input small"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          placeholder="reps"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
        />
        <span className="x-sep">×</span>
        <input
          className="text-input small"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          placeholder="sets"
          value={count}
          onChange={(e) => setCount(e.target.value)}
        />
        <button className="btn-add-set" onClick={submit}>
          Add
        </button>
      </div>
      {exercise.sets.length > 0 && (
        <div className="undo-row">
          <button className="btn-undo" onClick={onRemoveLast}>
            ↶ Undo last set
          </button>
        </div>
      )}
    </div>
  );
}

function collectRecentExerciseNames(days: Record<string, WorkoutDay>) {
  const seen = new Map<
    string,
    {
      name: string;
      category: WorkoutExercise['category'];
      kind: 'catalog' | 'custom';
      lastDate: string;
    }
  >();
  for (const key of Object.keys(days).sort().reverse()) {
    for (const ex of days[key].exercises) {
      if (ex.sets.length === 0) continue;
      const normalizedName = normalizeExerciseName(ex.name);
      if (!normalizedName) continue;
      if (!seen.has(normalizedName)) {
        seen.set(normalizedName, {
          name: normalizedName,
          category: ex.category,
          kind: isKnownExercise(ex.name) ? 'catalog' : 'custom',
          lastDate: key,
        });
      }
    }
  }
  const values = Array.from(seen.values());
  const catalog = values.filter((item) => item.kind === 'catalog');
  const custom = values.filter((item) => item.kind === 'custom');
  return [...catalog, ...custom];
}

function buildVolumeHistory(
  days: Record<string, WorkoutDay>,
  range: TrendRange,
): { date: string; value: number }[] {
  const out: { date: string; value: number }[] = [];
  if (range === 'all') {
    const keys = Object.keys(days)
      .filter((key) => dayHasLoggedSets(days[key]))
      .sort();
    if (keys.length === 0) {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        out.push({ date: todayKey(d), value: 0 });
      }
      return out;
    }
    const start = parseKey(keys[0]);
    const end = new Date();
    const d = new Date(start);
    while (d <= end) {
      const k = todayKey(d);
      out.push({ date: k, value: dayVolume(days[k]) });
      d.setDate(d.getDate() + 1);
    }
    return out;
  }
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = todayKey(d);
    out.push({ date: k, value: dayVolume(days[k]) });
  }
  return out;
}

function rangeLabel(r: TrendRange): string {
  if (r === 'all') return 'All';
  if (r === 1825) return '5Y';
  if (r === 365) return '1Y';
  return `${r}D`;
}

function cryptoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function dayHasLoggedSets(day: WorkoutDay | undefined): boolean {
  return !!day && day.exercises.some((ex) => ex.sets.length > 0);
}

function parseNonNegativeNumber(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parsePositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}
