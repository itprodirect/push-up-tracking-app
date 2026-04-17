import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Root from './Root';

const { getSession, onAuthStateChange, signInWithOtp, signOut, unsubscribe } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithOtp: vi.fn(),
  signOut: vi.fn(),
  unsubscribe: vi.fn(),
}));

let authListener: ((event: string, session: any) => void) | null = null;

vi.mock('./App', () => ({
  default: () => <div>Existing app shell</div>,
}));

vi.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getSession,
      onAuthStateChange,
      signInWithOtp,
      signOut,
    },
  },
}));

describe('Root auth gate', () => {
  beforeEach(() => {
    authListener = null;
    unsubscribe.mockReset();
    getSession.mockReset();
    onAuthStateChange.mockReset();
    signInWithOtp.mockReset();
    signOut.mockReset();

    getSession.mockResolvedValue({ data: { session: null }, error: null });
    onAuthStateChange.mockImplementation((callback: (event: string, session: any) => void) => {
      authListener = callback;
      return {
        data: {
          subscription: {
            unsubscribe,
          },
        },
      };
    });
    signInWithOtp.mockResolvedValue({ error: null });
    signOut.mockImplementation(async () => {
      authListener?.('SIGNED_OUT', null);
      return { error: null };
    });
  });

  it('shows only the login gate when there is no session', async () => {
    render(<Root />);

    expect(screen.getByRole('heading', { name: /checking session/i })).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeInTheDocument();
    expect(screen.queryByText(/existing app shell/i)).not.toBeInTheDocument();
  });

  it('restores an existing session and mounts the app shell', async () => {
    getSession.mockResolvedValue({
      data: {
        session: {
          user: { email: 'approved@example.com' },
        },
      },
      error: null,
    });

    render(<Root />);

    expect(await screen.findByText(/existing app shell/i)).toBeInTheDocument();
    expect(screen.getByText(/approved@example.com/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /sign in/i })).not.toBeInTheDocument();
  });

  it('mounts the app shell when auth state later restores a session', async () => {
    render(<Root />);

    await screen.findByRole('heading', { name: /sign in/i });

    await act(async () => {
      authListener?.('SIGNED_IN', {
        user: { email: 'approved@example.com' },
      });
    });

    expect(await screen.findByText(/existing app shell/i)).toBeInTheDocument();
    expect(screen.getByText(/approved@example.com/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /sign in/i })).not.toBeInTheDocument();
  });

  it('sends a magic link for approved users only', async () => {
    const user = userEvent.setup();
    render(<Root />);

    await screen.findByRole('heading', { name: /sign in/i });
    await user.type(screen.getByLabelText(/email/i), 'approved@example.com');
    await user.click(screen.getByRole('button', { name: /send magic link/i }));

    await waitFor(() => {
      expect(signInWithOtp).toHaveBeenCalledWith({
        email: 'approved@example.com',
        options: {
          emailRedirectTo: window.location.origin,
          shouldCreateUser: false,
        },
      });
    });

    expect(await screen.findByRole('status')).toHaveTextContent(/check your email/i);
  });

  it('signs out and returns to the login gate', async () => {
    const user = userEvent.setup();
    getSession.mockResolvedValue({
      data: {
        session: {
          user: { email: 'approved@example.com' },
        },
      },
      error: null,
    });

    render(<Root />);

    await screen.findByText(/existing app shell/i);
    await user.click(screen.getByRole('button', { name: /sign out/i }));

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByText(/existing app shell/i)).not.toBeInTheDocument();
  });
});
