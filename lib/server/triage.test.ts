import { describe, it, expect } from 'vitest';
import { runTriage, UserProfileRules, TriageJdInput } from './triage.js';

const BASE_PROFILE: UserProfileRules = {
  seniorityLevel: 'Senior',
  yearsExperience: 6,
  compFloor: { amount: 120000, currency: 'USD', per: 'year' },
  workModels: ['Remote', 'Hybrid'],
  locations: ['Lahore', 'Karachi'],
  targetTracks: ['Backend'],
  neverClaim: ['Kubernetes'],
  dealbreakers: ['on-call 24/7'],
};

const BASE_JD: TriageJdInput = {
  targetRole: 'Senior Backend Engineer',
  workModel: 'Remote',
  location: 'Lahore, Pakistan',
  salaryRange: '$150k - $180k',
  keyRequirements: 'Node.js, PostgreSQL',
  techTags: ['Node.js', 'PostgreSQL'],
  jdText: 'We are hiring a Senior Backend Engineer to join our platform team.',
};

describe('runTriage', () => {
  it('passes a JD that satisfies every rule', () => {
    const r = runTriage({ profile: BASE_PROFILE, jd: BASE_JD });
    expect(r).toEqual({ verdict: 'pass', reasons: [] });
  });

  it('flags a significant seniority stretch (JD wants Principal, profile is Senior)', () => {
    const r = runTriage({ profile: BASE_PROFILE, jd: { ...BASE_JD, targetRole: 'Principal Backend Engineer' } });
    expect(r.verdict).toBe('flag');
    expect(r.reasons[0]).toMatch(/stretch/i);
  });

  it('flags a significant step down (JD wants Intern, profile is Senior)', () => {
    const r = runTriage({ profile: BASE_PROFILE, jd: { ...BASE_JD, targetRole: 'Intern Backend Engineer', keyRequirements: '' } });
    expect(r.verdict).toBe('flag');
    expect(r.reasons[0]).toMatch(/step back/i);
  });

  it('does not flag a one-band gap (Senior vs Staff)', () => {
    const r = runTriage({ profile: BASE_PROFILE, jd: { ...BASE_JD, targetRole: 'Staff Backend Engineer' } });
    expect(r.verdict).toBe('pass');
  });

  it('flags a posted range below the comp floor', () => {
    const r = runTriage({ profile: BASE_PROFILE, jd: { ...BASE_JD, salaryRange: '$80k - $95k' } });
    expect(r.verdict).toBe('flag');
    expect(r.reasons[0]).toMatch(/comp floor/i);
  });

  it('applies a byWorkModel comp floor override', () => {
    const profile: UserProfileRules = {
      ...BASE_PROFILE,
      workModels: ['Remote', 'Hybrid', 'Onsite'],
      compFloor: { amount: 120000, currency: 'USD', per: 'year', byWorkModel: { Onsite: 90000 } },
    };
    const r = runTriage({ profile, jd: { ...BASE_JD, workModel: 'Onsite', salaryRange: '$95k - $100k' } });
    expect(r.verdict).toBe('pass'); // above the Onsite-specific floor, though below the base floor
  });

  it('flags a work model outside the accepted list', () => {
    const r = runTriage({ profile: BASE_PROFILE, jd: { ...BASE_JD, workModel: 'Onsite' } });
    expect(r.verdict).toBe('flag');
    expect(r.reasons[0]).toMatch(/work model/i);
  });

  it('flags a location outside the accepted list for a non-Remote job', () => {
    const r = runTriage({ profile: BASE_PROFILE, jd: { ...BASE_JD, workModel: 'Onsite', location: 'Berlin, Germany' } });
    expect(r.verdict).toBe('flag');
    expect(r.reasons.some((x) => /location/i.test(x))).toBe(true);
  });

  it('does not flag location for a Remote job even outside the accepted list', () => {
    const r = runTriage({ profile: BASE_PROFILE, jd: { ...BASE_JD, workModel: 'Remote', location: 'Berlin, Germany' } });
    expect(r.verdict).toBe('pass');
  });

  it('flags a JD requiring a never-claim stack', () => {
    const r = runTriage({ profile: BASE_PROFILE, jd: { ...BASE_JD, techTags: ['Node.js', 'Kubernetes'] } });
    expect(r.verdict).toBe('flag');
    expect(r.reasons[0]).toMatch(/never claim/i);
  });

  it('flags a JD containing a dealbreaker phrase', () => {
    const r = runTriage({ profile: BASE_PROFILE, jd: { ...BASE_JD, jdText: 'Note: this role requires on-call 24/7 coverage.' } });
    expect(r.verdict).toBe('flag');
    expect(r.reasons[0]).toMatch(/dealbreaker/i);
  });

  it('accumulates multiple reasons when several rules are violated', () => {
    const r = runTriage({
      profile: BASE_PROFILE,
      jd: { ...BASE_JD, workModel: 'Onsite', location: 'Berlin, Germany', salaryRange: '$60k' },
    });
    expect(r.verdict).toBe('flag');
    expect(r.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it('passes when the profile has no rules configured at all', () => {
    const r = runTriage({ profile: {}, jd: BASE_JD });
    expect(r).toEqual({ verdict: 'pass', reasons: [] });
  });
});
