import { describe, it, expect } from 'vitest';
import { normalizeUserProfile, isEmptyUserProfile, EMPTY_USER_PROFILE } from './userProfile';

describe('normalizeUserProfile', () => {
  it('returns the empty defaults for null/undefined/non-object input', () => {
    expect(normalizeUserProfile(null)).toEqual(EMPTY_USER_PROFILE);
    expect(normalizeUserProfile(undefined)).toEqual(EMPTY_USER_PROFILE);
    expect(normalizeUserProfile('garbage' as any)).toEqual(EMPTY_USER_PROFILE);
  });

  it('passes through a well-formed profile unchanged', () => {
    const p = {
      seniorityLevel: 'Senior', yearsExperience: 6,
      compFloor: { amount: 120000, currency: 'USD', per: 'year' as const },
      workModels: ['Remote' as const], locations: ['Lahore'], targetTracks: ['Backend'],
      neverClaim: ['Kubernetes'], dealbreakers: ['on-call 24/7'],
    };
    expect(normalizeUserProfile(p)).toEqual(p);
  });

  it('drops an invalid work model rather than trusting it', () => {
    const r = normalizeUserProfile({ workModels: ['Remote', 'Flying'] as any });
    expect(r.workModels).toEqual(['Remote']);
  });

  it('defaults an invalid compFloor.per to "year"', () => {
    const r = normalizeUserProfile({ compFloor: { amount: 100, currency: 'USD', per: 'fortnight' as any } });
    expect(r.compFloor?.per).toBe('year');
  });

  it('filters non-string entries out of string-array fields', () => {
    const r = normalizeUserProfile({ locations: ['Lahore', 42, null, ''] as any });
    expect(r.locations).toEqual(['Lahore']);
  });

  it('normalizes a partial object onto full defaults', () => {
    const r = normalizeUserProfile({ seniorityLevel: 'Mid' });
    expect(r).toEqual({ ...EMPTY_USER_PROFILE, seniorityLevel: 'Mid' });
  });
});

describe('isEmptyUserProfile', () => {
  it('is true for the shipped empty defaults', () => {
    expect(isEmptyUserProfile(EMPTY_USER_PROFILE)).toBe(true);
  });
  it('is false once any field is set', () => {
    expect(isEmptyUserProfile({ ...EMPTY_USER_PROFILE, seniorityLevel: 'Senior' })).toBe(false);
    expect(isEmptyUserProfile({ ...EMPTY_USER_PROFILE, dealbreakers: ['x'] })).toBe(false);
  });
});
