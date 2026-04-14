import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Workouts from './Workouts';

// A number like "1,000" can legitimately appear many times on the screen
// (day total card, exercise card, workout log day row, log exercise row,
// summary stats, top exercises). These helpers scope assertions to the
// canonical place for each value so tests are unambiguous.
function getTodayTotalText(container: HTMLElement): string {
  return container.querySelector('.today-total')?.textContent ?? '';
}

function getTodayExerciseCard(): HTMLElement {
  const weightInput = screen.getByPlaceholderText('weight');
  const card = weightInput.closest('.exercise-card') as HTMLElement;
  if (!card) throw new Error('Could not find .exercise-card for weight input');
  return card;
}

describe('Workouts screen', () => {
  it('renders heading and empty state for the log', () => {
    render(<Workouts />);
    expect(screen.getByRole('heading', { name: /workouts/i })).toBeInTheDocument();
    expect(screen.getByText(/no workouts logged in this range yet/i)).toBeInTheDocument();
  });

  it('shows 0 in the day total card when no exercises are logged', () => {
    const { container } = render(<Workouts />);
    expect(getTodayTotalText(container)).toBe('0');
  });

  it('adds an exercise and a set, updating today total volume', async () => {
    const user = userEvent.setup();
    const { container } = render(<Workouts />);

    await user.type(screen.getByPlaceholderText(/hammer pullover pull/i), 'Bench Press');
    await user.click(screen.getByRole('button', { name: /add exercise/i }));

    // Exercise appears in both "Today's" card and the Workout Log below it.
    expect(screen.getAllByText('Bench Press').length).toBeGreaterThanOrEqual(1);

    const card = getTodayExerciseCard();
    await user.type(within(card).getByPlaceholderText('weight'), '100');
    await user.type(within(card).getByPlaceholderText('reps'), '10');
    await user.click(within(card).getByRole('button', { name: /^add$/i }));

    // Day total volume = 100 × 10 = 1,000
    expect(getTodayTotalText(container)).toBe('1,000');
  });

  it('grouped set display collapses identical sets', async () => {
    const user = userEvent.setup();
    render(<Workouts />);

    await user.type(screen.getByPlaceholderText(/hammer pullover pull/i), 'Row');
    await user.click(screen.getByRole('button', { name: /add exercise/i }));

    const card = getTodayExerciseCard();
    await user.type(within(card).getByPlaceholderText('weight'), '90');
    await user.type(within(card).getByPlaceholderText('reps'), '10');
    const countInput = within(card).getByPlaceholderText('sets');
    await user.clear(countInput);
    await user.type(countInput, '3');
    await user.click(within(card).getByRole('button', { name: /^add$/i }));

    // The collapsed "90×10×3" group appears in the card AND in the log.
    const groupDisplays = within(card).getAllByText(/90×10×3/);
    expect(groupDisplays.length).toBeGreaterThanOrEqual(1);
  });

  it('does not count an empty exercise as a logged workout', async () => {
    const user = userEvent.setup();
    render(<Workouts />);

    await user.type(screen.getByPlaceholderText(/hammer pullover pull/i), 'Bench Press');
    await user.click(screen.getByRole('button', { name: /add exercise/i }));

    expect(screen.getByText(/no workouts logged in this range yet/i)).toBeInTheDocument();
  });

  it('rejects a negative weight entry', async () => {
    const user = userEvent.setup();
    const { container } = render(<Workouts />);

    await user.type(screen.getByPlaceholderText(/hammer pullover pull/i), 'Bench');
    await user.click(screen.getByRole('button', { name: /add exercise/i }));

    const card = getTodayExerciseCard();
    await user.type(within(card).getByPlaceholderText('weight'), '-25');
    await user.type(within(card).getByPlaceholderText('reps'), '10');
    await user.click(within(card).getByRole('button', { name: /^add$/i }));

    expect(getTodayTotalText(container)).toBe('0');
    expect(screen.getByText(/no workouts logged in this range yet/i)).toBeInTheDocument();
  });

  it('rejects fractional reps instead of truncating them', async () => {
    const user = userEvent.setup();
    const { container } = render(<Workouts />);

    await user.type(screen.getByPlaceholderText(/hammer pullover pull/i), 'Row');
    await user.click(screen.getByRole('button', { name: /add exercise/i }));

    const card = getTodayExerciseCard();
    await user.type(within(card).getByPlaceholderText('weight'), '90');
    await user.type(within(card).getByPlaceholderText('reps'), '8.5');
    await user.click(within(card).getByRole('button', { name: /^add$/i }));

    expect(getTodayTotalText(container)).toBe('0');
    expect(screen.getByText(/no workouts logged in this range yet/i)).toBeInTheDocument();
  });

  it('removes an exercise when Remove is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<Workouts />);

    await user.type(screen.getByPlaceholderText(/hammer pullover pull/i), 'Temp');
    await user.click(screen.getByRole('button', { name: /add exercise/i }));
    expect(screen.getAllByText('Temp').length).toBeGreaterThanOrEqual(1);

    await user.click(screen.getByRole('button', { name: /^remove$/i }));
    expect(screen.queryByText('Temp')).not.toBeInTheDocument();
    expect(getTodayTotalText(container)).toBe('0');
  });

  it('undo last set removes the most recent set from an exercise', async () => {
    const user = userEvent.setup();
    const { container } = render(<Workouts />);

    await user.type(screen.getByPlaceholderText(/hammer pullover pull/i), 'Curl');
    await user.click(screen.getByRole('button', { name: /add exercise/i }));

    const card = getTodayExerciseCard();
    await user.type(within(card).getByPlaceholderText('weight'), '25');
    await user.type(within(card).getByPlaceholderText('reps'), '10');
    await user.click(within(card).getByRole('button', { name: /^add$/i }));

    // First set added: 25 × 10 = 250
    expect(getTodayTotalText(container)).toBe('250');

    // Undo should remove it, dropping the day total back to 0
    await user.click(within(card).getByRole('button', { name: /undo last set/i }));
    expect(getTodayTotalText(container)).toBe('0');
    expect(screen.queryByText('Curl')).not.toBeInTheDocument();
    expect(screen.getByText(/no workouts logged in this range yet/i)).toBeInTheDocument();
  });
});
