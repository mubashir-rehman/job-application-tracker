import { describe, it, expect, vi, afterEach } from 'vitest';
import { runProfileExtract, PROFILE_EXTRACT_SCHEMA } from './profileExtract.js';

function jsonResponse(data: any, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}
function stubFetchOnce(data: any, status = 200) {
  const fn = vi.fn(async () => jsonResponse(data, status));
  vi.stubGlobal('fetch', fn);
  return fn;
}
function bodyOf(fn: any, n = 0) {
  return JSON.parse(fn.mock.calls[n][1].body);
}

afterEach(() => vi.unstubAllGlobals());

describe('PROFILE_EXTRACT_SCHEMA', () => {
  it('requires all five fields and enumerates valid seniority/work-model values', () => {
    expect(PROFILE_EXTRACT_SCHEMA.required).toEqual(['seniorityLevel', 'yearsExperience', 'workModels', 'locations', 'targetTracks']);
  });
});

describe('runProfileExtract', () => {
  it('forces the Anthropic structured tool call with the profile schema', async () => {
    const fn = stubFetchOnce({
      content: [{
        type: 'tool_use', name: 'candidate_profile',
        input: { seniorityLevel: 'Senior', yearsExperience: 6, workModels: ['Remote'], locations: ['Lahore'], targetTracks: ['Backend'] },
      }],
    });
    const r = await runProfileExtract({ masterMd: 'Senior Backend Engineer, 6 years...', apiKey: 'k', provider: 'anthropic' });
    const body = bodyOf(fn);
    expect(body.tools[0].name).toBe('candidate_profile');
    expect(body.tools[0].input_schema).toEqual(PROFILE_EXTRACT_SCHEMA);
    expect(r).toEqual({ seniorityLevel: 'Senior', yearsExperience: 6, workModels: ['Remote'], locations: ['Lahore'], targetTracks: ['Backend'] });
  });

  it('filters out invalid enum values instead of trusting the model blindly', async () => {
    stubFetchOnce({
      content: [{
        type: 'tool_use', name: 'candidate_profile',
        input: { seniorityLevel: 'Rockstar Ninja', yearsExperience: 'a lot', workModels: ['Remote', 'Flying'], locations: 123, targetTracks: null },
      }],
    });
    const r = await runProfileExtract({ masterMd: 'CV text', apiKey: 'k', provider: 'anthropic' });
    expect(r).toEqual({ seniorityLevel: null, yearsExperience: null, workModels: ['Remote'], locations: [], targetTracks: [] });
  });

  it('returns all-empty defaults when the structured call fails entirely', async () => {
    stubFetchOnce({ content: [{ type: 'text', text: 'no tool use here' }] });
    const r = await runProfileExtract({ masterMd: 'CV text', apiKey: 'k', provider: 'anthropic' });
    expect(r).toEqual({ seniorityLevel: null, yearsExperience: null, workModels: [], locations: [], targetTracks: [] });
  });
});
