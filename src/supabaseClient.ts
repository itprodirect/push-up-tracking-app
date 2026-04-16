import { createClient } from '@supabase/supabase-js';

const supabaseUrl = requireEnv('VITE_SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL);
const supabasePublishableKey = requireEnv(
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required Supabase env: ${name}`);
  }
  return value;
}
