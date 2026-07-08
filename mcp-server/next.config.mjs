import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The MCP server is a pure API surface — no pages/UI to speak of.
  // `serverExternalPackages` keeps the Supabase + jose libs out of the
  // bundler so they run as normal Node deps in the serverless function.
  serverExternalPackages: ['@supabase/supabase-js', 'jose'],
  // This package lives inside the HireTrack monorepo (which has its own
  // lockfile). Pin the tracing root to THIS folder so Vercel bundles the
  // right files when the project root is set to /mcp-server.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
