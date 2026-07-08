import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { supabaseAuthServerUrl, supabaseJwksUrl } from './env';

/**
 * Cached remote JWKS — `createRemoteJWKSet` fetches Supabase's public signing
 * keys once and caches/rotates them, so verification is local (no per-request
 * round-trip to Supabase just to validate a signature).
 */
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(supabaseJwksUrl()));
  return jwks;
}

/**
 * verifyToken callback for `withMcpAuth`.
 *
 * Validates the bearer token's signature, issuer and expiry against Supabase's
 * JWKS, then returns the AuthInfo the MCP runtime attaches to each tool call.
 * We surface both the raw token (so tools can build an RLS-scoped Supabase
 * client) and the user id (`sub`) in `extra`.
 *
 * Returning `undefined` makes withMcpAuth respond 401 with a
 * WWW-Authenticate pointer to our protected-resource metadata, which is what
 * triggers Claude's OAuth sign-in flow.
 */
export async function verifyToken(
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  try {
    const issuer = supabaseAuthServerUrl();
    const { payload } = await jwtVerify(bearerToken, getJwks(), {
      issuer,
      // Supabase signs end-user access tokens with the "authenticated" audience.
      // OAuth-server-issued tokens carry the same aud unless customised via a
      // Custom Access Token Hook; relax this if you set a custom audience.
      audience: 'authenticated',
    });

    const userId = typeof payload.sub === 'string' ? payload.sub : undefined;
    if (!userId) return undefined;

    return {
      token: bearerToken,
      clientId: (payload.client_id as string) ?? (payload.azp as string) ?? 'unknown',
      // Scopes are space-delimited in the OAuth token; default to empty.
      scopes:
        typeof payload.scope === 'string' && payload.scope.length
          ? payload.scope.split(' ')
          : [],
      expiresAt: typeof payload.exp === 'number' ? payload.exp : undefined,
      extra: { userId },
    };
  } catch (err) {
    // Invalid / expired / wrong-issuer token — treat as unauthenticated.
    console.error('[mcp-auth] token verification failed:', (err as Error).message);
    return undefined;
  }
}

/** Pull the authenticated user id out of the AuthInfo a tool receives. */
export function userIdFromAuth(authInfo: AuthInfo | undefined): string {
  const id = authInfo?.extra?.userId;
  if (typeof id !== 'string' || !id) {
    throw new Error('Not authenticated: no user id on the request.');
  }
  return id;
}
