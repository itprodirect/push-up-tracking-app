import { useState } from 'react';
import PushUps from './PushUps';
import Workouts from './Workouts';

type Tab = 'pushups' | 'workouts';

export default function App() {
  const [tab, setTab] = useState<Tab>(() => {
    const saved = localStorage.getItem('app.tab');
    return saved === 'workouts' ? 'workouts' : 'pushups';
  });

  function switchTab(t: Tab) {
    setTab(t);
    localStorage.setItem('app.tab', t);
  }

  return (
    <div className="app">
      {tab === 'pushups' ? <PushUps /> : <Workouts />}
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
