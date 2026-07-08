import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { registerTools } from '@/lib/tools';
import { verifyToken } from '@/lib/auth';

/**
 * The MCP server (Streamable HTTP transport).
 *
 * `createMcpHandler` builds the official @modelcontextprotocol/sdk server and
 * exposes it over Streamable HTTP. We run it statelessly (no Redis) — every
 * tool here is a plain request/response call, which is ideal for Vercel
 * serverless functions on the Hobby plan.
 */
const handler = createMcpHandler(
  (server) => {
    registerTools(server);
  },
  {
    serverInfo: { name: 'hiretrack', version: '0.1.0' },
  },
  {
    basePath: '/api',
    // Stay within the Vercel Hobby 60s function limit.
    maxDuration: 60,
  },
);

/**
 * Wrap the handler with OAuth enforcement. `verifyToken` validates the
 * Supabase-issued bearer token; on failure withMcpAuth returns 401 with a
 * WWW-Authenticate header pointing at our protected-resource metadata, which is
 * what kicks off Claude's sign-in flow.
 */
const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
});

export { authHandler as GET, authHandler as POST };

// Avoid build-time evaluation of env-dependent code.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
