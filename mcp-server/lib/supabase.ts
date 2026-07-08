import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

/**
 * Build a per-request Supabase client scoped to the authenticated user.
 *
 * We use the ANON key (never service_role) and forward the user's own access
 * token in the Authorization header. PostgREST then evaluates RLS with
 * `auth.uid()` = this user, so the database itself guarantees we can only ever
 * touch this user's rows — exactly the existing app guarantee, enforced server
 * side. We additionally filter every query by `userId` (see lib/tools.ts) so we
 * also exclude legacy guest rows where `userId IS NULL`.
 */
export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export const APPLICATIONS_TABLE = 'job_applications';
