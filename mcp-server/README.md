# HireTrack MCP Server

A **remote [Model Context Protocol](https://modelcontextprotocol.io) server** that lets Claude (or any MCP client) read and write your HireTrack job applications — so it can auto-populate entries, track status, and **check for duplicates before you apply to the same posting twice**.

It is a small, **isolated package** inside the HireTrack repo. It does **not** touch the Vite PWA build and deploys as its **own** Vercel project.

- **Transport:** Streamable HTTP (the current MCP transport — not stdio, not legacy SSE), via Vercel's [`mcp-handler`](https://github.com/vercel/mcp-handler), built on the official [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk).
- **Auth:** OAuth 2.1 delegated to **your Supabase project's** native [OAuth 2.1 server](https://supabase.com/docs/guides/auth/oauth-server) (Google provider). You sign in with Google through Supabase — **Claude never sees your password**.
- **Isolation:** every request runs on **your own access token**, so the database's existing **Row-Level Security** scopes all reads/writes to you. We never use the `service_role` key, and queries additionally filter by `userId` so legacy guest rows (`userId IS NULL`) are never returned.

---

## How auth works (no custom OAuth bridge)

```
Claude ──(1) POST /api/mcp ──────────────► MCP server
       ◄─(2) 401 + WWW-Authenticate ───────  (points at /.well-known/oauth-protected-resource)
       ──(3) GET protected-resource metadata►
       ◄─(4) { authorization_servers:[ <your-project>.supabase.co/auth/v1 ] }
       ──(5) Dynamic client registration + Google sign-in ► Supabase OAuth 2.1 server
       ◄─(6) access token ─────────────────  (issued by Supabase)
       ──(7) POST /api/mcp  + Bearer token ► MCP server
                                              └─ verifies JWT vs Supabase JWKS,
                                                 calls Supabase as YOU (RLS applies)
```

Supabase shipped a native OAuth 2.1 server with **Dynamic Client Registration** built for MCP (public beta, Nov 2025), so the MCP server is just an OAuth **Protected Resource** — no hand-rolled OAuth bridge required.

---

## Tools

| Tool | Input | What it does |
|---|---|---|
| `list_applications` | `status?`, `limit?` | Your tracked applications, newest first. `status` is a case-insensitive substring filter; `limit` defaults to 25 (max 100). |
| `get_application` | `id` | Full detail of one application. |
| `check_duplicate` | `company?`, `role?`, `job_url?` | Whether you've already tracked this posting. `job_url` is **normalized** (drops `utm_*`/tracking params, `www.`, trailing slashes) for robust matching; falls back to company (+ role). Returns the matching record. |
| `add_application` | `company`, `role`, `job_url?`, `status?`, `notes?`, `work_model?`, `applied_via?` | Adds a new application. **Runs a duplicate check first and refuses to insert a duplicate**, returning the existing record instead. Creates the standard 7-phase pipeline with phase 1 active. |
| `update_status` | `id`, `status` | Updates an application's status label. |

All tools return structured JSON and actionable error messages, and every query is scoped to the authenticated user.

> **Data mapping notes (adapted to the real `job_applications` schema):** there is no `applied_at` column — `createdAt` (ISO string) is set on insert. There is no dedicated notes column, so `notes` is stored in `keyJdRequirements` (the free-text field). `work_model` has no "unknown" value in the schema, so it defaults to `Remote` (overridable); `applied_via` defaults to `Other`.

---

## 1. One-time Supabase setup

In your **Supabase Dashboard**:

1. **Authentication → OAuth Server** → enable the **OAuth 2.1 server**.
2. Ensure **Dynamic Client Registration** is allowed (it is unless you set `allow_dynamic_registration = false` in `supabase/config.toml`). This lets Claude register itself with no manual client config.
3. Make sure the **Google provider** is enabled (Authentication → Providers → Google) — this is the same provider the HireTrack web app already uses.

No schema changes are needed — this server uses the existing `job_applications` table and its RLS policies.

---

## 2. Environment variables

Copy `.env.example` → `.env.local` (local) and set the same vars in Vercel:

| Var | Value |
|---|---|
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` (Dashboard → Project Settings → Data API) |
| `SUPABASE_ANON_KEY` | the **anon / publishable** key (never `service_role`) |

---

## 3. Local development

```bash
cd mcp-server
npm install
cp .env.example .env.local   # then fill in the two vars
npm run dev                  # http://localhost:3002
```

Quick sanity checks (no auth needed):

```bash
# Discovery document — should list your Supabase auth server
curl -s http://localhost:3002/.well-known/oauth-protected-resource

# MCP endpoint without a token — should be 401 with a WWW-Authenticate header
curl -s -D - -o /dev/null -X POST http://localhost:3002/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

To exercise the tools end-to-end locally with a real token, use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) (`npx @modelcontextprotocol/inspector`) pointed at `http://localhost:3002/api/mcp` — it will run the OAuth flow against Supabase for you. (Add `http://localhost:3002` to your Supabase redirect allow-list while testing.)

`npm run lint` runs `tsc --noEmit`; `npm run build` runs the production Next build.

---

## 4. Deploy to Vercel (Hobby plan)

Claude connects from Anthropic's cloud, so the server must be a **public HTTPS** endpoint. Deploy it as its **own** Vercel project:

1. **New Project** → import this repo.
2. Set **Root Directory** to **`mcp-server`** (this is the key step — it isolates the build from the Vite PWA).
3. Framework preset: **Next.js** (auto-detected).
4. Add the env vars from step 2 (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).
5. Deploy. Your MCP endpoint is `https://<your-project>.vercel.app/api/mcp`.

Hobby notes: the tools are stateless request/response calls, so **no Redis/KV is required** (`mcp-handler` runs stateless by default). Functions are capped at 60s on Hobby, which is far more than these queries need.

> **Why Vercel and not Cloudflare?** Cloudflare's `workers-oauth-provider` is the usual remote-MCP path, but this build targets **Vercel** per project requirements: `mcp-handler` is Vercel's official adapter and runs cleanly on the Hobby plan. The code is portable — the auth logic (`lib/auth.ts`) and tools (`lib/tools.ts`) are framework-agnostic if you ever move it.

---

## 5. Connect it to Claude

In Claude (web/desktop) → **Settings → Connectors → Add custom connector**, enter:

```
https://<your-project>.vercel.app/api/mcp
```

Claude will discover the OAuth server, prompt you to **sign in with Google via Supabase**, and then the tools appear. Try: *"Have I already applied to this posting? <url>"* or *"Add this job to my tracker."*

---

## Security model

- **No `service_role` key.** The server only ever holds the anon key plus the user's own access token; the database enforces RLS.
- **Strict ownership.** Every query filters by `userId = <authenticated uid>`; guest/null rows are excluded.
- **Tokens verified locally** against Supabase's JWKS (`/auth/v1/.well-known/jwks.json`), checking signature, issuer and expiry. Invalid/expired tokens get a clean 401.
- **No secrets logged.** Tokens are never written to logs.
- `add_application` is **duplicate-safe** by design — it will not create a second row for a posting you already track.

## Files

```
mcp-server/
├── app/
│   ├── api/[transport]/route.ts                  # MCP endpoint (Streamable HTTP) + withMcpAuth
│   ├── .well-known/oauth-protected-resource/route.ts  # OAuth Protected Resource Metadata (RFC 9728)
│   ├── layout.tsx · page.tsx                      # minimal info landing page
├── lib/
│   ├── auth.ts          # verifyToken (jose + Supabase JWKS) → AuthInfo
│   ├── supabase.ts      # per-request, user-token-scoped Supabase client (RLS)
│   ├── tools.ts         # the 5 MCP tools
│   ├── applications.ts  # 7-phase scaffold, status derivation, URL/text normalization, dedupe helpers
│   ├── types.ts         # data contract (mirror of ../src/types.ts)
│   └── env.ts           # validated env access
└── .env.example
```
