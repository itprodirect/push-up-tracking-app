import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { todayKey } from './dates';
import { saveEntries } from './storage';

const { loadPersistenceSnapshot, savePushupEntries, saveWorkoutDays } = vi.hoisted(() => ({
  loadPersistenceSnapshot: vi.fn(),
  savePushupEntries: vi.fn(),
  saveWorkoutDays: vi.fn(),
}));

vi.mock('./cloudPersistence', () => ({
  CLOUD_PERSISTENCE_ENABLED: true,
  loadPersistenceSnapshot,
  mergeEntriesWithLocalFallback: (remote: unknown, local: unknown) => ({ ...(remote as object), ...(local as object) }),
  mergeWorkoutsWithLocalFallback: (remote: unknown, local: unknown) => ({ ...(remote as object), ...(local as object) }),
  savePushupEntries,
  saveWorkoutDays,
}));

import App from './App';

beforeEach(() => {
  loadPersistenceSnapshot.mockReset();
  savePushupEntries.mockReset();
  saveWorkoutDays.mockReset();
  loadPersistenceSnapshot.mockImplementation(() => new Promise(() => {}));
  savePushupEntries.mockResolvedValue({ kind: 'success' });
  saveWorkoutDays.mockResolvedValue({ kind: 'success' });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

describe('App tab shell', () => {
  it('defaults to the Push-Ups tab', () => {
    render(<App userId="user-a" />);
    expect(screen.getByRole('heading', { name: /push-ups/i })).toBeInTheDocument();
  });

  it('switches to Workouts tab when the Workouts tab button is clicked', async () => {
    const user = userEvent.setup();
    render(<App userId="user-a" />);
    const workoutsTab = screen.getByRole('tab', { name: /workouts/i });
    await user.click(workoutsTab);
    expect(screen.getByRole('heading', { name: /workouts/i })).toBeInTheDocument();
  });

  it('remembers selected tab across re-renders via localStorage', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App userId="user-a" />);
    await user.click(screen.getByRole('tab', { name: /workouts/i }));
    unmount();
    render(<App userId="user-a" />);
    expect(screen.getByRole('heading', { name: /workouts/i })).toBeInTheDocument();
  });

  it('shows a cloud loading indicator while the initial sync is in progress', () => {
    const load = deferred<any>();
    loadPersistenceSnapshot.mockReturnValue(load.promise);

    render(<App userId="user-a" />);

    expect(screen.getByRole('status')).toHaveTextContent(/loading cloud data/i);
  });

  it('shows load completion after cloud data resolves', async () => {
    const day = todayKey();
    loadPersistenceSnapshot.mockResolvedValue({
      kind: 'success',
      snapshot: {
        entries: {
          [day]: { date: day, sets: [10] },
        },
        workouts: {},
      },
    });

    render(<App userId="user-a" />);

    expect(await screen.findByText(/cloud data loaded/i)).toBeInTheDocument();
    expect(screen.getByText(/10 \/ 50/)).toBeInTheDocument();
  });

  it('shows save progress and then saved after a successful cloud save', async () => {
    const user = userEvent.setup();
    const save = deferred<{ kind: 'success' }>();
    loadPersistenceSnapshot.mockResolvedValue({
      kind: 'success',
      snapshot: {
        entries: {},
        workouts: {},
      },
    });
    savePushupEntries.mockReturnValue(save.promise);

    render(<App userId="user-a" />);

    await waitFor(() => {
      expect(loadPersistenceSnapshot).toHaveBeenCalled();
    });

    await user.click(screen.getByRole('button', { name: '+10' }));

    expect(screen.getByRole('status')).toHaveTextContent(/saving/i);

    save.resolve({ kind: 'success' });

    expect(await screen.findByText(/saved/i)).toBeInTheDocument();
  });

  it('shows a calm local-fallback message after a generic cloud failure', async () => {
    const user = userEvent.setup();
    loadPersistenceSnapshot.mockResolvedValue({
      kind: 'success',
      snapshot: {
        entries: {},
        workouts: {},
      },
    });
    savePushupEntries.mockResolvedValue({ kind: 'error' });

    render(<App userId="user-a" />);

    await waitFor(() => {
      expect(loadPersistenceSnapshot).toHaveBeenCalled();
    });

    await user.click(screen.getByRole('button', { name: '+10' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/changes are still stored locally/i);
  });

  it('distinguishes session expiry from a generic cloud failure', async () => {
    loadPersistenceSnapshot.mockResolvedValue({ kind: 'auth_error' });

    render(<App userId="user-a" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/sign in again to resume cloud sync/i);
  });

  it('does not leak one user local fallback data into the next signed-in user session', async () => {
    const day = todayKey();
    loadPersistenceSnapshot.mockResolvedValue({
      kind: 'success',
      snapshot: {
        entries: {},
        workouts: {},
      },
    });
    saveEntries(
      {
        [day]: { date: day, sets: [10] },
      },
      'user-a',
    );

    const { rerender } = render(<App key="user-a" userId="user-a" />);

    expect(screen.getByText(/10 \/ 50/)).toBeInTheDocument();

    rerender(<App key="user-b" userId="user-b" />);

    await waitFor(() => {
      expect(loadPersistenceSnapshot).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByText(/0 \/ 50/)).toBeInTheDocument();
    expect(screen.queryByText(/10 \/ 50/)).not.toBeInTheDocument();
  });
});
