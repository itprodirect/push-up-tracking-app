import { useEffect, useState } from 'react';
import type { CloudSyncStatus } from './cloudSyncStatus';
import PushUps from './PushUps';
import Workouts from './Workouts';

type Tab = 'pushups' | 'workouts';

export default function App() {
  const [tab, setTab] = useState<Tab>(() => {
    const saved = localStorage.getItem('app.tab');
    return saved === 'workouts' ? 'workouts' : 'pushups';
  });
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>({ kind: 'idle' });

  useEffect(() => {
    if (syncStatus.kind !== 'load_success' && syncStatus.kind !== 'save_success') return;

    const timeout = window.setTimeout(() => {
      setSyncStatus((current) => {
        if (current.kind !== syncStatus.kind) return current;
        return { kind: 'idle' };
      });
    }, 1800);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [syncStatus]);

  function switchTab(t: Tab) {
    setTab(t);
    localStorage.setItem('app.tab', t);
  }

  return (
    <div className="app">
      {syncStatus.kind !== 'idle' && (
        <div
          className={`sync-status ${syncStatusTone(syncStatus)}`}
          role={isSyncError(syncStatus) ? 'alert' : 'status'}
          aria-live="polite"
        >
          <span className="sync-status-dot" aria-hidden="true" />
          <span>{syncStatusLabel(syncStatus)}</span>
        </div>
      )}
      {tab === 'pushups' ? (
        <PushUps onSyncStatusChange={setSyncStatus} />
      ) : (
        <Workouts onSyncStatusChange={setSyncStatus} />
      )}
      <nav className="tab-bar" role="tablist" aria-label="Primary">
        <button
          role="tab"
          aria-selected={tab === 'pushups'}
          className={tab === 'pushups' ? 'active' : ''}
          onClick={() => switchTab('pushups')}
        >
          <span className="tab-icon">{'\uD83D\uDCAA'}</span>
          <span>Push-Ups</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === 'workouts'}
          className={tab === 'workouts' ? 'active' : ''}
          onClick={() => switchTab('workouts')}
        >
          <span className="tab-icon">{'\uD83C\uDFCB\uFE0F'}</span>
          <span>Workouts</span>
        </button>
      </nav>
    </div>
  );
}

function syncStatusLabel(status: CloudSyncStatus): string {
  switch (status.kind) {
    case 'loading':
      return 'Loading cloud data...';
    case 'load_success':
      return 'Cloud data loaded.';
    case 'saving':
      return 'Saving...';
    case 'save_success':
      return 'Saved.';
    case 'auth_error':
      return 'Session expired; sign in again to resume cloud sync.';
    case 'error':
      return 'Cloud sync unavailable; changes are still stored locally.';
    case 'idle':
      return '';
  }
}

function syncStatusTone(status: CloudSyncStatus): 'pending' | 'success' | 'error' {
  if (status.kind === 'load_success' || status.kind === 'save_success') return 'success';
  if (isSyncError(status)) return 'error';
  return 'pending';
}

function isSyncError(status: CloudSyncStatus): boolean {
  return status.kind === 'auth_error' || status.kind === 'error';
}
