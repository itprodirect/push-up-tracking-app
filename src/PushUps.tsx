import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CLOUD_PERSISTENCE_ENABLED,
  loadPersistenceSnapshot,
  mergeEntriesWithLocalFallback,
  savePushupEntries,
} from './cloudPersistence';
import {
  DayEntry,
  loadEntries,
  loadSettings,
  saveEntries,
  saveSettings,
  totalFor,
} from './storage';
import { formatHeaderDate, formatHistoryDate, parseKey, todayKey } from './dates';
import { TrendChart, TrendRange } from './TrendChart';

export default function PushUps() {
  const [entries, setEntries] = useState<Record<string, DayEntry>>(() => loadEntries());
  const [settings, setSettings] = useState(() => loadSettings());
  const [range, setRange] = useState<TrendRange>(30);
  const [showSettings, setShowSettings] = useState(false);
  const [viewDate, setViewDate] = useState<string>(() => todayKey());
  const [cloudReady, setCloudReady] = useState(() => !CLOUD_PERSISTENCE_ENABLED);
  const skipNextCloudSave = useRef(false);
  const pendingCloudDay = useRef<string | null>(null);

  useEffect(() => saveEntries(entries), [entries]);
  useEffect(() => saveSettings(settings), [settings]);

  useEffect(() => {
    if (!CLOUD_PERSISTENCE_ENABLED) return;

    let cancelled = false;

    void (async () => {
      const snapshot = await loadPersistenceSnapshot();
      if (cancelled) return;

      if (snapshot && Object.keys(snapshot.entries).length > 0) {
        skipNextCloudSave.current = true;
        setEntries((prev) => mergeEntriesWithLocalFallback(snapshot.entries, prev));
      }

      setCloudReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!cloudReady) return;
    if (skipNextCloudSave.current) {
      skipNextCloudSave.current = false;
      return;
    }
    const day = pendingCloudDay.current;
    if (!day) return;
    pendingCloudDay.current = null;
    void savePushupEntries(day, entries[day] ?? null);
  }, [cloudReady, entries]);

  const isToday = viewDate === todayKey();
  const entry = entries[viewDate];
  const total = totalFor(entry);
  const progress = Math.min(100, (total / settings.dailyGoal) * 100);

  function addSet(n: number) {
    pendingCloudDay.current = viewDate;
    setEntries((prev) => {
      const existing = prev[viewDate] ?? { date: viewDate, sets: [] };
      return {
        ...prev,
        [viewDate]: { ...existing, sets: [...existing.sets, n] },
      };
    });
  }

  function removeSetAt(idx: number) {
    pendingCloudDay.current = viewDate;
    setEntries((prev) => {
      const existing = prev[viewDate];
      if (!existing) return prev;
      const sets = existing.sets.filter((_, i) => i !== idx);
      if (sets.length === 0) {
        const { [viewDate]: _drop, ...rest } = prev;
        return rest;
      }
      return { ...prev, [viewDate]: { ...existing, sets } };
    });
  }

  function undoLast() {
    if (entry && entry.sets.length > 0) {
      removeSetAt(entry.sets.length - 1);
    }
  }

  const stats = useMemo(() => computeStats(entries, settings.dailyGoal), [entries, settings.dailyGoal]);
  const history = useMemo(() => buildHistory(entries, range), [entries, range]);

  return (
    <>
      <header className="header">
        <h1>Push-Ups</h1>
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
        <div className="today-total">{total}</div>
        <div className="today-goal">
          {total >= settings.dailyGoal ? (
            <span className="hit">Goal hit! ({settings.dailyGoal})</span>
          ) : (
            <>
              {total} / {settings.dailyGoal}
            </>
          )}
        </div>
        <div className="progress">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <div className="quick-buttons">
          <button className="btn btn-primary" onClick={() => addSet(10)}>
            +10
          </button>
          <button className="btn btn-primary" onClick={() => addSet(20)}>
            +20
          </button>
        </div>
        <div className="undo-row">
          <button
            className="btn-undo"
            onClick={undoLast}
            disabled={!entry || entry.sets.length === 0}
          >
            ↶ Undo last set
          </button>
        </div>
        {entry && entry.sets.length > 0 && (
          <>
            <div className="sets-label">Tap a set to remove it</div>
            <div className="sets-row">
              {entry.sets.map((s, i) => (
                <button
                  key={i}
                  className="set-chip"
                  onClick={() => removeSetAt(i)}
                  aria-label={`Remove set of ${s}`}
                >
                  {s} <span className="x">×</span>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <div className="section-title">Stats</div>
      <div className="stats-grid">
        <div className="stat">
          <div className="stat-value">{stats.streak}</div>
          <div className="stat-label">Day Streak</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats.weekAvg}</div>
          <div className="stat-label">7-Day Avg</div>
        </div>
        <div className="stat">
          <div className="stat-value">{stats.total.toLocaleString()}</div>
          <div className="stat-label">All-Time</div>
        </div>
      </div>

      <div className="section-title">Trend</div>
      <div className="card">
        <div className="range-tabs">
          {([7, 30, 365, 1825, 'all'] as TrendRange[]).map((r) => (
            <button key={String(r)} className={range === r ? 'active' : ''} onClick={() => setRange(r)}>
              {rangeLabel(r)}
            </button>
          ))}
        </div>
        <TrendChart data={history} goal={settings.dailyGoal} range={range} label="Push-ups" />
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

      <div className="section-title">Recent days</div>
      <div className="card">
        {recentDays(entries, 14).map((d) => (
          <button key={d.date} className="history-row" onClick={() => setViewDate(d.date)}>
            <span className="date">{formatHistoryDate(d.date)}</span>
            <span className={`total ${d.total >= settings.dailyGoal ? 'hit' : ''}`}>
              {d.total || '—'}
            </span>
          </button>
        ))}
      </div>

      <div className="footer-actions">
        <button className="link-btn" onClick={() => setShowSettings(true)}>
          Settings
        </button>
      </div>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSave={(s) => {
            setSettings(s);
            setShowSettings(false);
          }}
        />
      )}
    </>
  );
}

function rangeLabel(r: TrendRange): string {
  if (r === 'all') return 'All';
  if (r === 1825) return '5Y';
  if (r === 365) return '1Y';
  return `${r}D`;
}

function SettingsModal({
  settings,
  onClose,
  onSave,
}: {
  settings: { dailyGoal: number };
  onClose: () => void;
  onSave: (s: { dailyGoal: number }) => void;
}) {
  const [goal, setGoal] = useState(String(settings.dailyGoal));
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>
        <label htmlFor="goal">Daily goal (push-ups)</label>
        <input
          id="goal"
          type="number"
          min="1"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button
            className="primary"
            onClick={() => {
              const n = parseInt(goal, 10);
              if (Number.isFinite(n) && n > 0) onSave({ dailyGoal: n });
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function computeStats(entries: Record<string, DayEntry>, goal: number) {
  const keys = Object.keys(entries);
  let total = 0;
  for (const k of keys) total += totalFor(entries[k]);

  const last7: number[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7.push(totalFor(entries[todayKey(d)]));
  }
  const weekAvg = Math.round(last7.reduce((a, b) => a + b, 0) / 7);

  // Streak: consecutive days up to today meeting the goal. Today in-progress doesn't break it.
  let streak = 0;
  for (let i = 0; i < 10000; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const t = totalFor(entries[todayKey(d)]);
    if (t >= goal) {
      streak++;
    } else {
      if (i === 0) continue;
      break;
    }
  }

  return { total, weekAvg, streak };
}

function buildHistory(
  entries: Record<string, DayEntry>,
  range: TrendRange,
): { date: string; value: number }[] {
  const out: { date: string; value: number }[] = [];
  if (range === 'all') {
    const keys = Object.keys(entries).sort();
    if (keys.length === 0) {
      // Nothing yet — show the last 7 days so the chart isn't empty.
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
      out.push({ date: k, value: totalFor(entries[k]) });
      d.setDate(d.getDate() + 1);
    }
    return out;
  }
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = todayKey(d);
    out.push({ date: k, value: totalFor(entries[k]) });
  }
  return out;
}

function recentDays(entries: Record<string, DayEntry>, n: number) {
  const out: { date: string; total: number }[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = todayKey(d);
    out.push({ date: k, total: totalFor(entries[k]) });
  }
  return out;
}
