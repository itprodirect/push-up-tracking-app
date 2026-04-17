import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { todayKey } from './dates';
import PushUps from './PushUps';

const { loadPersistenceSnapshot, savePushupEntries } = vi.hoisted(() => ({
  loadPersistenceSnapshot: vi.fn(),
  savePushupEntries: vi.fn(),
}));

vi.mock('./cloudPersistence', () => ({
  CLOUD_PERSISTENCE_ENABLED: true,
  loadPersistenceSnapshot,
  mergeEntriesWithLocalFallback: (remote: unknown, local: unknown) => ({ ...(remote as object), ...(local as object) }),
  savePushupEntries,
}));

beforeEach(() => {
  loadPersistenceSnapshot.mockReset();
  savePushupEntries.mockReset();
  loadPersistenceSnapshot.mockResolvedValue({
    kind: 'success',
    snapshot: {
      entries: {},
      workouts: {},
    },
  });
  savePushupEntries.mockResolvedValue({ kind: 'success' });
});

describe('PushUps screen', () => {
  it('renders with 0 today when storage is empty', () => {
    render(<PushUps />);
    expect(screen.getByRole('heading', { name: /push-ups/i })).toBeInTheDocument();
    // The large number shows 0 at the start of the day
    const card = screen.getByText(/\/ 50/i);
    expect(card).toBeInTheDocument();
  });

  it('clicking +10 twice increases today total to 20', async () => {
    const user = userEvent.setup();
    render(<PushUps />);
    const plusTen = screen.getByRole('button', { name: '+10' });
    await user.click(plusTen);
    await user.click(plusTen);
    expect(screen.getByText(/20 \/ 50/)).toBeInTheDocument();
  });

  it('clicking +20 once plus +10 once gives a 30 total', async () => {
    const user = userEvent.setup();
    render(<PushUps />);
    await user.click(screen.getByRole('button', { name: '+20' }));
    await user.click(screen.getByRole('button', { name: '+10' }));
    expect(screen.getByText(/30 \/ 50/)).toBeInTheDocument();
  });

  it('shows "Goal hit!" when total meets the daily goal', async () => {
    const user = userEvent.setup();
    render(<PushUps />);
    // Click +20 twice and +10 once = 50
    await user.click(screen.getByRole('button', { name: '+20' }));
    await user.click(screen.getByRole('button', { name: '+20' }));
    await user.click(screen.getByRole('button', { name: '+10' }));
    expect(screen.getByText(/goal hit/i)).toBeInTheDocument();
  });

  it('Undo last set removes the most recent set', async () => {
    const user = userEvent.setup();
    render(<PushUps />);
    await user.click(screen.getByRole('button', { name: '+10' }));
    await user.click(screen.getByRole('button', { name: '+20' }));
    expect(screen.getByText(/30 \/ 50/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /undo last set/i }));
    expect(screen.getByText(/10 \/ 50/)).toBeInTheDocument();
  });

  it('Undo last set button is disabled with no sets', () => {
    render(<PushUps />);
    const undo = screen.getByRole('button', { name: /undo last set/i });
    expect(undo).toBeDisabled();
  });

  it('tapping a set chip removes that specific set', async () => {
    const user = userEvent.setup();
    render(<PushUps />);
    await user.click(screen.getByRole('button', { name: '+10' }));
    await user.click(screen.getByRole('button', { name: '+20' }));
    // Find the chip for the 20 set and click it to remove
    const chip = screen.getByRole('button', { name: /remove set of 20/i });
    await user.click(chip);
    expect(screen.getByText(/10 \/ 50/)).toBeInTheDocument();
  });

  it('persists entries through a re-render (localStorage)', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<PushUps />);
    await user.click(screen.getByRole('button', { name: '+10' }));
    unmount();
    render(<PushUps />);
    expect(screen.getByText(/10 \/ 50/)).toBeInTheDocument();
  });

  it('loads a persisted cloud push-up entry on mount', async () => {
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

    render(<PushUps />);

    expect(await screen.findByText(/10 \/ 50/)).toBeInTheDocument();
  });

  it('saves a new push-up entry through cloud persistence', async () => {
    const user = userEvent.setup();
    const day = todayKey();
    loadPersistenceSnapshot.mockResolvedValue({
      kind: 'success',
      snapshot: {
        entries: {},
        workouts: {},
      },
    });

    render(<PushUps />);

    await waitFor(() => {
      expect(loadPersistenceSnapshot).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByRole('button', { name: '+10' }));

    await waitFor(() => {
      expect(savePushupEntries).toHaveBeenCalledWith(day, {
        date: day,
        sets: [10],
      });
    });
  });
});

describe('PushUps settings', () => {
  it('changing the daily goal updates the progress label', async () => {
    const user = userEvent.setup();
    render(<PushUps />);
    await user.click(screen.getByRole('button', { name: /settings/i }));
    const input = screen.getByLabelText(/daily goal/i);
    await user.clear(input);
    await user.type(input, '75');
    // The Save button is inside the modal
    const modal = screen.getByRole('heading', { name: /settings/i }).parentElement!;
    await user.click(within(modal).getByRole('button', { name: /save/i }));
    expect(screen.getByText(/0 \/ 75/)).toBeInTheDocument();
  });
});
