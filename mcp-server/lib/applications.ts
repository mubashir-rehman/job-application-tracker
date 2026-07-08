import { randomUUID } from 'node:crypto';
import type {
  ApplicationSummary,
  InterviewPhase,
  JobApplication,
} from './types';

/**
 * The fixed 7-phase pipeline — mirrors src/data.ts DEFAULT_PHASES.
 * The `phases` array is ALWAYS exactly these 7 items; never change its length.
 */
export const DEFAULT_PHASES = [
  'Phase 1: Application Submitted',
  'Phase 2: Initial HR Pre-screening',
  'Phase 3: Technical Interview',
  'Phase 4: Personality Interview',
  'Phase 5: Final Technical Interview',
  'Phase 6: HR Negotiation',
  'Phase 7: Offer Letter',
] as const;

/** New application scaffold: phase 0 active, the rest upcoming (mirrors createDefaultPhases). */
export function createDefaultPhases(): InterviewPhase[] {
  return DEFAULT_PHASES.map((name, i) => ({
    name,
    date: '',
    pros: '',
    cons: '',
    remarks: '',
    feedback: '',
    status: i === 0 ? 'active' : 'upcoming',
  }));
}

/**
 * Single source of truth for a derived status label — mirrors
 * deriveCurrentStatus() in src/lib/appUtils.ts so MCP-created rows read the
 * same way the web app would render them.
 */
export function deriveCurrentStatus(phases: InterviewPhase[]): string {
  for (let i = phases.length - 1; i >= 0; i--) {
    if (phases[i].status === 'active') {
      return phases[i].name.replace(/^Phase \d+:\s*/, '');
    }
  }
  for (let i = phases.length - 1; i >= 0; i--) {
    if (phases[i].status === 'completed') {
      if (i === phases.length - 1) return 'Offer Received';
      return phases[i].name.replace(/^Phase \d+:\s*/, '') + ' Complete';
    }
  }
  return 'Application Submitted';
}

/**
 * Normalise a job-posting URL so the same posting is recognised across the
 * cosmetic variations job boards add (tracking params, trailing slashes,
 * protocol/host casing, www, fragments).
 * Returns null for empty/invalid input.
 */
export function normalizeJobUrl(raw?: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  let input = raw.trim();
  if (!/^https?:\/\//i.test(input)) input = `https://${input}`;
  try {
    const u = new URL(input);
    const host = u.host.toLowerCase().replace(/^www\./, '');
    // Drop common tracking / session params that don't identify the posting.
    const STRIP = /^(utm_|fbclid$|gclid$|ref$|referrer$|source$|trk$|trackingId$|src$|sid$)/i;
    const params = [...u.searchParams.entries()]
      .filter(([k]) => !STRIP.test(k))
      .sort(([a], [b]) => a.localeCompare(b));
    const qs = params.map(([k, v]) => `${k}=${v}`).join('&');
    const path = u.pathname.replace(/\/+$/, '');
    return `${host}${path}${qs ? `?${qs}` : ''}`;
  } catch {
    return input.toLowerCase().replace(/\/+$/, '');
  }
}

/** Loose key for company+role fallback dedupe. */
export function normalizeText(s?: string | null): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Project a full row down to the compact shape we hand back to the model. */
export function toSummary(app: JobApplication): ApplicationSummary {
  return {
    id: app.id,
    company: app.companyName,
    role: app.targetRole,
    status: app.currentStatus,
    job_url: app.jdUrl ?? null,
    work_model: app.workModel,
    applied_via: app.appliedVia,
    created_at: app.createdAt,
  };
}

export interface NewApplicationInput {
  company: string;
  role: string;
  job_url?: string;
  status?: string;
  notes?: string;
  work_model?: JobApplication['workModel'];
  applied_via?: JobApplication['appliedVia'];
  userId: string;
}

/**
 * Build a complete, schema-valid job_applications row. We never invent data:
 * unknown channel defaults to "Other", and optional detail fields are left
 * blank. work_model has no "unknown" option in the schema, so it defaults to
 * "Remote" and is overridable via the tool input.
 */
export function buildNewApplication(input: NewApplicationInput): JobApplication {
  const phases = createDefaultPhases();
  return {
    id: randomUUID(),
    companyName: input.company.trim(),
    targetRole: input.role.trim(),
    workModel: input.work_model ?? 'Remote',
    location: '',
    salaryRange: '',
    otherBenefits: '',
    hrContact: '',
    appliedVia: input.applied_via ?? 'Other',
    resumeLink: '',
    portfolioLink: '',
    keyJdRequirements: input.notes?.trim() ?? '',
    jdUrl: input.job_url?.trim() || undefined,
    jdText: undefined,
    currentStatus: input.status?.trim() || deriveCurrentStatus(phases),
    phases,
    postMortem: { skillsImprovements: '', preparationNotes: '', selfRating: 0 },
    createdAt: new Date().toISOString(),
    userId: input.userId,
  };
}
