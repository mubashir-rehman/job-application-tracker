import { describe, it, expect } from 'vitest';
import { runTriage, UserProfileRules, TriageJdInput } from './triage';

// This is the client-side twin of lib/server/triage.ts (see that file's test for the
// full rule matrix) — kept lighter here since the rule logic itself is identical;
// this suite exists to confirm the client copy stays in sync and integrates cleanly
// with a UserProfile-shaped object (Track 4's persisted profile → triage rules).

const PROFILE: UserProfileRules = {
  seniorityLevel: 'Senior',
  compFloor: { amount: 120000, currency: 'USD', per: 'year' },
  workModels: ['Remote'],
  locations: ['Lahore'],
  neverClaim: ['Kubernetes'],
  dealbreakers: ['on-call 24/7'],
};

const JD: TriageJdInput = {
  targetRole: 'Senior Backend Engineer',
  workModel: 'Remote',
  location: 'Lahore, Pakistan',
  salaryRange: '$150k - $180k',
  techTags: ['Node.js'],
  jdText: 'We are hiring a Senior Backend Engineer.',
};

describe('runTriage (client)', () => {
  it('passes a JD satisfying every configured rule', () => {
    expect(runTriage({ profile: PROFILE, jd: JD })).toEqual({ verdict: 'pass', reasons: [] });
  });

  it('flags on a rule violation (work model)', () => {
    const r = runTriage({ profile: PROFILE, jd: { ...JD, workModel: 'Onsite' } });
    expect(r.verdict).toBe('flag');
    expect(r.reasons[0]).toMatch(/work model/i);
  });

  it('integrates with an empty (not-yet-configured) profile as a pass-through', () => {
    expect(runTriage({ profile: {}, jd: JD })).toEqual({ verdict: 'pass', reasons: [] });
  });

  it('flags a never-claim stack requirement', () => {
    const r = runTriage({ profile: PROFILE, jd: { ...JD, techTags: ['Kubernetes'] } });
    expect(r.verdict).toBe('flag');
  });
});
