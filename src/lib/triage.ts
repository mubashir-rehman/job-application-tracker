// Track 4 — client-side twin of lib/server/triage.ts. Triage is a pure function
// (no I/O, no secrets) so it's duplicated here rather than crossing the src/ ↔
// lib/server/ boundary — the same reasoning atsCheck.ts already documents for its
// own client-side tech-tag detection. Keep in sync with the server copy if the
// rules ever change; the two have an identical test suite for exactly that reason.

export type WorkModel = 'Remote' | 'Hybrid' | 'Onsite';

export interface CompFloor {
  amount: number;
  currency: string; // ISO 4217, e.g. "USD"
  per: 'year' | 'month' | 'hour';
  byWorkModel?: Partial<Record<WorkModel, number>>; // override the floor for a specific work model
}

export interface UserProfileRules {
  seniorityLevel?: string | null;  // e.g. "Junior","Mid","Senior","Staff","Lead","Principal","Director"
  yearsExperience?: number | null;
  compFloor?: CompFloor | null;
  workModels?: WorkModel[];        // acceptable models; empty/undefined = any
  locations?: string[];            // acceptable city/region/country substrings; empty = any (Remote bypasses)
  targetTracks?: string[];         // free-text tracks the candidate is targeting (informational, not screened)
  neverClaim?: string[];           // stacks/claims the candidate does not have and won't claim
  dealbreakers?: string[];         // free-text phrases — an automatic flag if found in the JD
}

export interface TriageJdInput {
  targetRole?: string | null;
  workModel?: string | null;
  location?: string | null;
  salaryRange?: string | null;
  keyRequirements?: string | null;
  techTags?: string[];
  jdText?: string; // full JD text — used only for dealbreaker phrase matching
}

export interface TriageInput {
  profile: UserProfileRules;
  jd: TriageJdInput;
}

export interface TriageResult {
  verdict: 'pass' | 'flag';
  reasons: string[];
}

const LADDER = ['Intern', 'Junior', 'Mid', 'Senior', 'Staff', 'Lead', 'Principal', 'Director'];

function ladderIndex(level?: string | null): number {
  if (!level) return -1;
  const norm = level.trim().toLowerCase();
  return LADDER.findIndex((l) => l.toLowerCase() === norm);
}

function jdSeniorityIndex(jd: TriageJdInput): number {
  const hay = `${jd.targetRole || ''} ${jd.keyRequirements || ''}`.toLowerCase();
  for (let i = LADDER.length - 1; i >= 0; i--) {
    if (hay.includes(LADDER[i].toLowerCase())) return i;
  }
  return -1;
}

function parseSalaryBounds(range?: string | null): { min: number; max: number } | null {
  if (!range?.trim()) return null;
  const hasK = /\d+\s*k\b/i.test(range);
  const nums = range.replace(/[$,]/g, '').match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (!nums.length) return null;
  const scaled = nums.map((n) => (hasK && n < 10000 ? n * 1000 : n));
  return { min: Math.min(...scaled), max: Math.max(...scaled) };
}

function compFloorFor(profile: UserProfileRules, workModel?: string | null): number | null {
  const cf = profile.compFloor;
  if (!cf) return null;
  const override = workModel && cf.byWorkModel ? cf.byWorkModel[workModel as WorkModel] : undefined;
  return override ?? cf.amount;
}

export function runTriage(input: TriageInput): TriageResult {
  const { profile, jd } = input;
  const reasons: string[] = [];

  const profileIdx = ladderIndex(profile.seniorityLevel);
  const jdIdx = jdSeniorityIndex(jd);
  if (profileIdx !== -1 && jdIdx !== -1) {
    const gap = jdIdx - profileIdx;
    if (gap >= 2) reasons.push(`JD targets "${LADDER[jdIdx]}" — a significant stretch above your "${LADDER[profileIdx]}" level.`);
    else if (gap <= -2) reasons.push(`JD targets "${LADDER[jdIdx]}" — well below your "${LADDER[profileIdx]}" level (may be a step back).`);
  }

  const bounds = parseSalaryBounds(jd.salaryRange);
  const floor = compFloorFor(profile, jd.workModel);
  if (bounds && floor != null && bounds.max < floor) {
    reasons.push(
      `Posted range (up to ${bounds.max.toLocaleString()}) is below your comp floor ` +
      `(${floor.toLocaleString()} ${profile.compFloor?.currency || ''}/${profile.compFloor?.per || 'year'}).`,
    );
  }

  if (profile.workModels?.length && jd.workModel && !profile.workModels.includes(jd.workModel as WorkModel)) {
    reasons.push(`Work model "${jd.workModel}" is not in your accepted models (${profile.workModels.join(', ')}).`);
  }

  if (
    profile.locations?.length && jd.location && jd.workModel !== 'Remote' &&
    !profile.locations.some((l) => jd.location!.toLowerCase().includes(l.toLowerCase()) || l.toLowerCase().includes(jd.location!.toLowerCase()))
  ) {
    reasons.push(`Location "${jd.location}" is outside your accepted locations (${profile.locations.join(', ')}).`);
  }

  if (profile.neverClaim?.length && jd.techTags?.length) {
    const hit = profile.neverClaim.filter((tech) => jd.techTags!.some((t) => t.toLowerCase() === tech.toLowerCase()));
    if (hit.length) reasons.push(`JD lists ${hit.join(', ')} — on your "never claim" list.`);
  }

  if (profile.dealbreakers?.length && jd.jdText) {
    const hay = jd.jdText.toLowerCase();
    const hit = profile.dealbreakers.filter((d) => d.trim() && hay.includes(d.trim().toLowerCase()));
    if (hit.length) reasons.push(`JD mentions dealbreaker: ${hit.join(', ')}.`);
  }

  return { verdict: reasons.length ? 'flag' : 'pass', reasons };
}
