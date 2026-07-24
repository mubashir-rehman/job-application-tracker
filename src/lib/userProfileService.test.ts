import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Supabase client boundary so this test never makes a real network
// call regardless of whether VITE_SUPABASE_* env vars are set in this
// environment — service-mapping tests exercise userProfileService's query
// shape only (no existing supabase-mock convention in this repo to follow;
// this is the "unit-test the service mapping" fallback the handover permits).
const state: { configured: boolean; row: any } = { configured: true, row: null };
const chain: any = {
  select: vi.fn(() => chain),
  eq: vi.fn(() => chain),
  order: vi.fn(() => chain),
  limit: vi.fn(() => chain),
  maybeSingle: vi.fn(async () => ({ data: state.row, error: null })),
  update: vi.fn(() => chain),
  insert: vi.fn(async () => ({ data: null, error: null })),
};
const fromMock = vi.fn(() => chain);
vi.mock('../supabaseClient', () => ({
  get isSupabaseConfigured() { return state.configured; },
  get supabase() { return state.configured ? { from: fromMock } : null; },
}));

import { userProfileService } from './userProfileService';
import { UserProfile, EMPTY_USER_PROFILE } from './userProfile';

const PROFILE: UserProfile = { ...EMPTY_USER_PROFILE, seniorityLevel: 'Senior', workModels: ['Remote'] };

beforeEach(() => {
  state.configured = true;
  state.row = null;
  fromMock.mockClear();
  Object.values(chain).forEach((fn: any) => fn.mockClear?.());
});

describe('userProfileService — not configured (offline/guest)', () => {
  it('fetchCurrent and save both no-op without touching supabase', async () => {
    state.configured = false;
    expect(await userProfileService.fetchCurrent('u1')).toBeNull();
    expect(await userProfileService.save('u1', PROFILE)).toBe(false);
    expect(fromMock).not.toHaveBeenCalled();
  });
});

describe('userProfileService — configured', () => {
  it('fetchCurrent queries user_profile scoped to the user + is_current', async () => {
    state.row = { id: 'row1', content: PROFILE, version: 1 };
    const row = await userProfileService.fetchCurrent('u1');
    expect(fromMock).toHaveBeenCalledWith('user_profile');
    expect(chain.eq).toHaveBeenCalledWith('userId', 'u1');
    expect(chain.eq).toHaveBeenCalledWith('is_current', true);
    expect(row).toEqual({ id: 'row1', content: PROFILE, version: 1 });
  });

  it('save() inserts version 1 when no current row exists', async () => {
    state.row = null;
    await userProfileService.save('u1', PROFILE);
    expect(chain.insert).toHaveBeenCalledWith([{ userId: 'u1', content: PROFILE, version: 1, is_current: true }]);
  });

  it('save() updates the existing current row in place', async () => {
    state.row = { id: 'row1', content: EMPTY_USER_PROFILE, version: 1 };
    await userProfileService.save('u1', PROFILE);
    expect(chain.update).toHaveBeenCalledWith({ content: PROFILE });
  });
});
