import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import {
  AUTH_STATE_PATH,
  E2E_BASE_URL,
  E2E_SUPABASE_PUBLISHABLE_KEY,
  E2E_SUPABASE_URL,
} from './e2e/support';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: E2E_BASE_URL,
    serviceWorkers: 'block',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: AUTH_STATE_PATH,
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 22173',
    cwd: repoRoot,
    url: E2E_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      VITE_SUPABASE_URL: E2E_SUPABASE_URL,
      VITE_SUPABASE_PUBLISHABLE_KEY: E2E_SUPABASE_PUBLISHABLE_KEY,
    },
  },
});
