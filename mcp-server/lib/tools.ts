import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { userIdFromAuth } from './auth';
import { APPLICATIONS_TABLE, createUserClient } from './supabase';
import {
  buildNewApplication,
  normalizeJobUrl,
  normalizeText,
  toSummary,
} from './applications';
import type { ApplicationSummary, JobApplication } from './types';

/** Shape of the `extra` arg the MCP runtime passes to every tool handler. */
type ToolExtra = { authInfo?: AuthInfo };

/** JSON tool result. */
function ok(payload: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] };
}
function fail(message: string, payload: Record<string, unknown> = {}) {
  return {
    isError: true,
    content: [
      { type: 'text' as const, text: JSON.stringify({ error: message, ...payload }, null, 2) },
    ],
  };
}

/** Resolve the per-request, RLS-scoped client + user id, or throw a clear error. */
function ctx(extra: ToolExtra) {
  const authInfo = extra.authInfo;
  const userId = userIdFromAuth(authInfo);
  const supabase = createUserClient(authInfo!.token);
  return { supabase, userId };
}

/**
 * Find an existing application that matches the given identifiers, scoped to the
 * user. Primary key is the normalized job_url; falls back to company (+ role).
 * Returns the first match or null.
 */
async function findDuplicate(
  supabase: ReturnType<typeof createUserClient>,
  userId: string,
  args: { company?: string; role?: string; job_url?: string },
): Promise<ApplicationSummary | null> {
  const { data, error } = await supabase
    .from(APPLICATIONS_TABLE)
    .select('*')
    .eq('userId', userId);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as JobApplication[];
  const targetUrl = normalizeJobUrl(args.job_url);

  // 1) Strongest signal: same normalized posting URL.
  if (targetUrl) {
    const hit = rows.find((r) => normalizeJobUrl(r.jdUrl) === targetUrl);
    if (hit) return toSummary(hit);
  }

  // 2) Fallback: same company (and role, if provided), case-insensitively.
  const company = normalizeText(args.company);
  const role = normalizeText(args.role);
  if (company) {
    const hit = rows.find((r) => {
      const sameCompany = normalizeText(r.companyName) === company;
      const sameRole = role ? normalizeText(r.targetRole) === role : true;
      return sameCompany && sameRole;
    });
    if (hit) return toSummary(hit);
  }

  return null;
}

export function registerTools(server: McpServer): void {
  // ── list_applications ────────────────────────────────────────────────────
  server.registerTool(
    'list_applications',
    {
      title: 'List my job applications',
      description:
        'List the job applications you are tracking, most recent first. ' +
        'Optionally filter by status (case-insensitive substring match against ' +
        "the application's current status, e.g. \"interview\", \"offer\", \"submitted\").",
      inputSchema: {
        status: z
          .string()
          .optional()
          .describe('Filter to applications whose current status contains this text.'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('Max applications to return (default 25, max 100).'),
      },
    },
    async (args, extra: ToolExtra) => {
      try {
        const { supabase, userId } = ctx(extra);
        let query = supabase
          .from(APPLICATIONS_TABLE)
          .select('*')
          .eq('userId', userId)
          .order('createdAt', { ascending: false })
          .limit(args.limit ?? 25);
        if (args.status?.trim()) {
          query = query.ilike('currentStatus', `%${args.status.trim()}%`);
        }
        const { data, error } = await query;
        if (error) return fail(`Could not list applications: ${error.message}`);
        const applications = (data ?? []).map((r) => toSummary(r as JobApplication));
        return ok({ count: applications.length, applications });
      } catch (e) {
        return fail((e as Error).message);
      }
    },
  );

  // ── get_application ──────────────────────────────────────────────────────
  server.registerTool(
    'get_application',
    {
      title: 'Get one job application',
      description:
        'Fetch the full detail of a single tracked application by its id ' +
        '(use list_applications or check_duplicate to find ids).',
      inputSchema: {
        id: z.string().min(1).describe('The application id.'),
      },
    },
    async (args, extra: ToolExtra) => {
      try {
        const { supabase, userId } = ctx(extra);
        const { data, error } = await supabase
          .from(APPLICATIONS_TABLE)
          .select('*')
          .eq('id', args.id)
          .eq('userId', userId)
          .maybeSingle();
        if (error) return fail(`Could not fetch application: ${error.message}`);
        if (!data)
          return fail(
            `No application with id "${args.id}" was found in your account.`,
            { id: args.id },
          );
        return ok({ application: data });
      } catch (e) {
        return fail((e as Error).message);
      }
    },
  );

  // ── check_duplicate ──────────────────────────────────────────────────────
  server.registerTool(
    'check_duplicate',
    {
      title: 'Check for a duplicate application',
      description:
        'Before applying again, check whether you have already tracked this ' +
        'posting. Pass a job_url (best — it is normalized to ignore tracking ' +
        'params, www, and trailing slashes) and/or company + role. Returns ' +
        'whether a match exists and the matching record if so.',
      inputSchema: {
        company: z.string().optional().describe('Company name.'),
        role: z.string().optional().describe('Role / job title.'),
        job_url: z.string().optional().describe('The job posting URL.'),
      },
    },
    async (args, extra: ToolExtra) => {
      try {
        if (!args.job_url?.trim() && !args.company?.trim()) {
          return fail('Provide at least a job_url or a company to check.');
        }
        const { supabase, userId } = ctx(extra);
        const match = await findDuplicate(supabase, userId, args);
        return ok({
          is_duplicate: !!match,
          matched_on: match ? (normalizeJobUrl(args.job_url) ? 'job_url' : 'company_role') : null,
          match: match ?? null,
        });
      } catch (e) {
        return fail((e as Error).message);
      }
    },
  );

  // ── add_application ──────────────────────────────────────────────────────
  server.registerTool(
    'add_application',
    {
      title: 'Add (auto-populate) a job application',
      description:
        'Track a new job application. This runs a duplicate check first and ' +
        'will NOT insert if a matching posting already exists — it returns the ' +
        'existing record instead, so you never apply twice by accident. ' +
        'Creates the standard 7-phase pipeline with phase 1 active. ' +
        'work_model defaults to "Remote" and applied_via to "Other" unless given.',
      inputSchema: {
        company: z.string().min(1).describe('Company name (required).'),
        role: z.string().min(1).describe('Role / job title (required).'),
        job_url: z.string().optional().describe('The job posting URL (used for dedupe).'),
        status: z
          .string()
          .optional()
          .describe('Initial status label (default "Application Submitted").'),
        notes: z
          .string()
          .optional()
          .describe('Free-text notes / key requirements; stored on the application.'),
        work_model: z
          .enum(['Remote', 'Hybrid', 'Onsite'])
          .optional()
          .describe('Work model (default "Remote").'),
        applied_via: z
          .enum(['LinkedIn', 'Email', 'Company Form', 'Referral', 'Other'])
          .optional()
          .describe('Application channel (default "Other").'),
      },
    },
    async (args, extra: ToolExtra) => {
      try {
        const { supabase, userId } = ctx(extra);

        const existing = await findDuplicate(supabase, userId, args);
        if (existing) {
          return ok({
            created: false,
            duplicate: true,
            message:
              `You have already tracked this posting (matched on ` +
              `${normalizeJobUrl(args.job_url) ? 'job URL' : 'company + role'}). ` +
              `Use update_status to change its status, or get_application for detail.`,
            existing,
          });
        }

        const record = buildNewApplication({ ...args, userId });
        const { error } = await supabase.from(APPLICATIONS_TABLE).insert([record]);
        if (error) return fail(`Could not add application: ${error.message}`);

        return ok({ created: true, duplicate: false, application: toSummary(record) });
      } catch (e) {
        return fail((e as Error).message);
      }
    },
  );

  // ── update_status ────────────────────────────────────────────────────────
  server.registerTool(
    'update_status',
    {
      title: 'Update an application status',
      description:
        "Update an application's current status label (e.g. \"Phone Screen\", " +
        '"Technical Interview", "Offer", "Rejected"). Identify it by id ' +
        '(from list_applications / check_duplicate).',
      inputSchema: {
        id: z.string().min(1).describe('The application id.'),
        status: z.string().min(1).describe('The new status label.'),
      },
    },
    async (args, extra: ToolExtra) => {
      try {
        const { supabase, userId } = ctx(extra);
        const { data, error } = await supabase
          .from(APPLICATIONS_TABLE)
          .update({ currentStatus: args.status.trim() })
          .eq('id', args.id)
          .eq('userId', userId)
          .select('*');
        if (error) return fail(`Could not update status: ${error.message}`);
        if (!data || data.length === 0)
          return fail(
            `No application with id "${args.id}" was found in your account.`,
            { id: args.id },
          );
        return ok({ updated: true, application: toSummary(data[0] as JobApplication) });
      } catch (e) {
        return fail((e as Error).message);
      }
    },
  );
}
