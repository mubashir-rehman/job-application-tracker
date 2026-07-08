/**
 * Centralised, validated environment access.
 *
 * SUPABASE_URL          — your project URL, e.g. https://abcd.supabase.co
 * SUPABASE_ANON_KEY     — the anon/publishable key (NEVER the service_role key;
 *                          we deliberately rely on the user's own token + RLS).
 *
 * The OAuth "resource" identifier is inferred from the incoming request by
 * mcp-handler's protected-resource handler, so no resource URL env var is needed.
 */
function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        `Set it locally in .env.local or in your Vercel project settings.`,
    );
  }
  return v;
}

export const SUPABASE_URL = (): string => required('SUPABASE_URL').replace(/\/+$/, '');
export const SUPABASE_ANON_KEY = (): string => required('SUPABASE_ANON_KEY');

/** Supabase's OAuth 2.1 authorization-server base (what Claude discovers + logs into). */
export const supabaseAuthServerUrl = (): string => `${SUPABASE_URL()}/auth/v1`;

/** JWKS endpoint used to verify access-token signatures locally. */
export const supabaseJwksUrl = (): string =>
  `${SUPABASE_URL()}/auth/v1/.well-known/jwks.json`;
