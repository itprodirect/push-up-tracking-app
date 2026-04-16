import { FormEvent, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import App from './App';
import { supabase } from './supabaseClient';

type AuthNotice =
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }
  | null;

export default function Root() {
  const [session, setSession] = useState<Session | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [notice, setNotice] = useState<AuthNotice>(null);

  useEffect(() => {
    let active = true;

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        setSession(error ? null : data.session ?? null);
        setAuthResolved(true);
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setAuthResolved(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setAuthResolved(true);
      setIsSubmitting(false);
      setIsSigningOut(false);
      if (nextSession) {
        setEmail('');
      }
      setNotice(null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = email.trim();
    if (!nextEmail) return;

    setIsSubmitting(true);
    setNotice(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: nextEmail,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: false,
      },
    });

    setIsSubmitting(false);
    if (error) {
      setNotice({
        kind: 'error',
        message: error.message || 'Unable to send a magic link.',
      });
      return;
    }

    setNotice({
      kind: 'success',
      message: 'Check your email for a sign-in link.',
    });
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    setNotice(null);

    const { error } = await supabase.auth.signOut();
    if (error) {
      setIsSigningOut(false);
      setNotice({
        kind: 'error',
        message: error.message || 'Unable to sign out.',
      });
    }
  }

  if (!authResolved) {
    return (
      <div className="auth-screen">
        <div className="auth-card auth-card-loading">
          <h1>Checking session...</h1>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>Sign in</h1>
          <p className="auth-copy">Use an approved email to receive a magic link.</p>
          <form onSubmit={handleSendMagicLink}>
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="text-input"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <div className="modal-actions auth-actions">
              <button className="primary" type="submit" disabled={isSubmitting || email.trim().length === 0}>
                {isSubmitting ? 'Sending...' : 'Send magic link'}
              </button>
            </div>
          </form>
          {notice && (
            <p
              className={`auth-notice ${notice.kind}`}
              role={notice.kind === 'error' ? 'alert' : 'status'}
            >
              {notice.message}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-app-shell">
      <div className="auth-bar-shell">
        <div className="auth-bar">
          <div>
            <div className="auth-bar-label">Signed in</div>
            <div className="auth-bar-email">{session.user.email ?? 'Approved user'}</div>
          </div>
          <button className="auth-signout-btn" onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
        {notice && (
          <p className={`auth-notice ${notice.kind}`} role="alert">
            {notice.message}
          </p>
        )}
      </div>
      <App />
    </div>
  );
}
