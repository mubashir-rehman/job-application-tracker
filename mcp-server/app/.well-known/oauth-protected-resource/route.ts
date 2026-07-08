import {
  protectedResourceHandler,
  metadataCorsOptionsRequestHandler,
} from 'mcp-handler';
import { supabaseAuthServerUrl } from '@/lib/env';

/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728).
 *
 * This is the discovery document Claude reads after a 401. It declares that the
 * authorization server for this MCP resource is *your Supabase project's* OAuth
 * 2.1 server. A spec-compliant client then fetches Supabase's authorization-
 * server metadata, dynamically registers itself, runs the Google sign-in flow,
 * and returns with a bearer token we can verify.
 *
 * Supabase's auth-server issuer is https://<project-ref>.supabase.co/auth/v1.
 *
 * The handler is built lazily inside the request so that `next build` (which has
 * no env vars) never evaluates the env-dependent setup at module load.
 */
export async function GET(req: Request): Promise<Response> {
  const handler = protectedResourceHandler({
    authServerUrls: [supabaseAuthServerUrl()],
  });
  return handler(req);
}

export const OPTIONS = metadataCorsOptionsRequestHandler();

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
