import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';

export const E2E_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:22173';
export const E2E_SUPABASE_URL = process.env.PLAYWRIGHT_SUPABASE_URL ?? 'https://e2e-project.supabase.co';
export const E2E_SUPABASE_PUBLISHABLE_KEY =
  process.env.PLAYWRIGHT_SUPABASE_PUBLISHABLE_KEY ?? 'e2e-publishable-key';
const supportDir = path.dirname(fileURLToPath(import.meta.url));

export const AUTH_STATE_PATH = path.join(supportDir, '..', 'playwright', '.auth', 'user.json');
export const E2E_AUTH_EMAIL = 'playwright@example.com';

type StoredSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: 'bearer';
  user: {
    id: string;
    email: string;
    app_metadata: Record<string, unknown>;
    user_metadata: Record<string, unknown>;
    aud: string;
    role: string;
  };
};

export async function writeAuthenticatedSession(page: Page) {
  const storageKey = await page.evaluate(async () => {
    const { supabase } = await import('/src/supabaseClient.ts');
    return supabase.auth['storageKey'] as string;
  });

  await page.evaluate(
    ({ nextStorageKey, storedSession }) => {
      window.localStorage.setItem(nextStorageKey, JSON.stringify(storedSession));
    },
    { nextStorageKey: storageKey, storedSession: buildStoredSession() },
  );
}

function buildStoredSession(): StoredSession {
  return {
    access_token: 'playwright-access-token',
    refresh_token: 'playwright-refresh-token',
    expires_in: 60 * 60,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    token_type: 'bearer',
    user: {
      id: 'playwright-user-id',
      email: E2E_AUTH_EMAIL,
      app_metadata: { provider: 'email' },
      user_metadata: {},
      aud: 'authenticated',
      role: 'authenticated',
    },
  };
}
