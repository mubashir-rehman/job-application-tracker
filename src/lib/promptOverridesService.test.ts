import { describe, it, expect, vi, beforeEach } from 'vitest';

const state: { configured: boolean; rows: any[] } = { configured: true, rows: [] };
const selectChain: any = {
  select: vi.fn(() => selectChain),
  eq: vi.fn(async () => ({ data: state.rows, error: null })),
};
const deleteChain: any = {
  delete: vi.fn(() => deleteChain),
  eq: vi.fn(() => deleteChain),
};
const upsertMock = vi.fn(async () => ({ data: null, error: null }));
const fromMock = vi.fn(() => ({ ...selectChain, ...deleteChain, upsert: upsertMock }));
vi.mock('../supabaseClient', () => ({
  get isSupabaseConfigured() { return state.configured; },
  get supabase() { return state.configured ? { from: fromMock } : null; },
}));

import { promptOverridesService } from './promptOverridesService';

beforeEach(() => {
  state.configured = true;
  state.rows = [];
  fromMock.mockClear();
  upsertMock.mockClear();
  selectChain.eq.mockClear();
});

describe('promptOverridesService — not configured', () => {
  it('all methods no-op without touching supabase', async () => {
    state.configured = false;
    expect(await promptOverridesService.fetchAll('u1')).toEqual([]);
    expect(await promptOverridesService.save('u1', 'visualQaRules', 'x')).toBe(false);
    expect(await promptOverridesService.reset('u1', 'visualQaRules')).toBe(false);
    expect(fromMock).not.toHaveBeenCalled();
  });
});

describe('promptOverridesService — configured', () => {
  it('fetchAll scopes to the user only (no prompt_key filter — returns every override)', async () => {
    state.rows = [{ prompt_key: 'visualQaRules', content: 'custom rules', updated_at: '2026-07-20T00:00:00Z' }];
    const rows = await promptOverridesService.fetchAll('u1');
    expect(fromMock).toHaveBeenCalledWith('prompt_overrides');
    expect(selectChain.eq).toHaveBeenCalledWith('userId', 'u1');
    expect(rows).toEqual(state.rows);
  });

  it('save() upserts on (userId, prompt_key)', async () => {
    await promptOverridesService.save('u1', 'coverEmail', 'custom email prompt');
    expect(upsertMock).toHaveBeenCalledWith(
      [expect.objectContaining({ userId: 'u1', prompt_key: 'coverEmail', content: 'custom email prompt' })],
      { onConflict: 'userId,prompt_key' },
    );
  });
});
