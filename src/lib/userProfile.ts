// Track 4 — User Profile: hard rules that pre-screen a JD before any research/
// tailor token spend (feeds src/lib/triage.ts and lib/server/triage.ts). Shape
// matches docs/CLAUDE-CODE-HANDOVER.md § Track 4 item 1 exactly, and is
// structurally compatible with both triage modules' `UserProfileRules`.
import { WorkModel } from './triage';

export interface CompFloor {
  amount: number;
  currency: string;
  per: 'year' | 'month' | 'hour';
  byWorkModel?: Partial<Record<WorkModel, number>>;
}

export interface UserProfile {
  seniorityLevel: string | null;
  yearsExperience: number | null;
  compFloor: CompFloor | null;
  workModels: WorkModel[];
  locations: string[];
  targetTracks: string[];
  neverClaim: string[];
  dealbreakers: string[];
}

export const EMPTY_USER_PROFILE: UserProfile = {
  seniorityLevel: null,
  yearsExperience: null,
  compFloor: null,
  workModels: [],
  locations: [],
  targetTracks: [],
  neverClaim: [],
  dealbreakers: [],
};

// Merge a possibly-partial/untrusted object (LLM extraction output, a stale
// localStorage/cloud row) onto the empty defaults, so a UserProfile consumer
// never has to null-check every field individually.
export function normalizeUserProfile(input: Partial<UserProfile> | null | undefined): UserProfile {
  if (!input || typeof input !== 'object') return { ...EMPTY_USER_PROFILE };
  return {
    seniorityLevel: typeof input.seniorityLevel === 'string' ? input.seniorityLevel : null,
    yearsExperience: typeof input.yearsExperience === 'number' ? input.yearsExperience : null,
    compFloor: input.compFloor && typeof input.compFloor === 'object'
      ? {
        amount: Number(input.compFloor.amount) || 0,
        currency: typeof input.compFloor.currency === 'string' ? input.compFloor.currency : 'USD',
        per: input.compFloor.per === 'month' || input.compFloor.per === 'hour' ? input.compFloor.per : 'year',
        byWorkModel: input.compFloor.byWorkModel && typeof input.compFloor.byWorkModel === 'object' ? input.compFloor.byWorkModel : undefined,
      }
      : null,
    workModels: Array.isArray(input.workModels) ? input.workModels.filter((m): m is WorkModel => ['Remote', 'Hybrid', 'Onsite'].includes(m)) : [],
    locations: Array.isArray(input.locations) ? input.locations.filter((x) => typeof x === 'string' && x.trim()) : [],
    targetTracks: Array.isArray(input.targetTracks) ? input.targetTracks.filter((x) => typeof x === 'string' && x.trim()) : [],
    neverClaim: Array.isArray(input.neverClaim) ? input.neverClaim.filter((x) => typeof x === 'string' && x.trim()) : [],
    dealbreakers: Array.isArray(input.dealbreakers) ? input.dealbreakers.filter((x) => typeof x === 'string' && x.trim()) : [],
  };
}

export function isEmptyUserProfile(p: UserProfile): boolean {
  return (
    !p.seniorityLevel && p.yearsExperience == null && !p.compFloor &&
    p.workModels.length === 0 && p.locations.length === 0 && p.targetTracks.length === 0 &&
    p.neverClaim.length === 0 && p.dealbreakers.length === 0
  );
}
