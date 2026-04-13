import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App tab shell', () => {
  it('defaults to the Push-Ups tab', () => {
    render(<App />);
    // Heading for the push-ups screen should be visible
    expect(screen.getByRole('heading', { name: /push-ups/i })).toBeInTheDocument();
  });

  it('switches to Workouts tab when the Workouts tab button is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);
    const workoutsTab = screen.getByRole('tab', { name: /workouts/i });
    await user.click(workoutsTab);
    expect(screen.getByRole('heading', { name: /workouts/i })).toBeInTheDocument();
  });

  it('remembers selected tab across re-renders via localStorage', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(screen.getByRole('tab', { name: /workouts/i }));
    unmount();
    render(<App />);
    // Should still be on Workouts
    expect(screen.getByRole('heading', { name: /workouts/i })).toBeInTheDocument();
  });
});
