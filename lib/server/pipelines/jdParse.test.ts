import { describe, it, expect, vi, afterEach } from 'vitest';
import { runJdParse } from './jdParse.js';

function jsonResponse(data: any, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}
function bodyOf(fn: any, n = 0) {
  return JSON.parse(fn.mock.calls[n][1].body);
}

afterEach(() => vi.unstubAllGlobals());

const JD_TEXT = `Company: Acme Corp
Role: Senior Backend Engineer
We are hiring a Senior Backend Engineer to work on our Python/PostgreSQL platform.`;

describe('runJdParse — keyless (deterministic path, no LLM call)', () => {
  it('extracts fields without calling fetch', async () => {
    const fn = vi.fn();
    vi.stubGlobal('fetch', fn);
    const r = await runJdParse({ jdText: JD_TEXT });
    expect(fn).not.toHaveBeenCalled();
    expect(r.usedLLM).toBe(false);
    expect(r.fields.companyName).toBe('Acme Corp');
  });
});

describe('runJdParse — with apiKey (structured extraction)', () => {
  it('forces the Anthropic structured tool call for extraction', async () => {
    const fn = vi.fn(async () => jsonResponse({
      content: [{
        type: 'tool_use',
        name: 'jd_fields',
        input: {
          companyName: 'Acme Corp', targetRole: 'Senior Backend Engineer', workModel: 'Remote',
          location: null, salaryRange: null, otherBenefits: null, hrContact: null,
          keyRequirements: 'Python, PostgreSQL', techTags: ['Python', 'PostgreSQL'],
        },
      }],
    }));
    vi.stubGlobal('fetch', fn);
    const r = await runJdParse({ jdText: JD_TEXT, apiKey: 'sk-ant', provider: 'anthropic' });
    expect(fn).toHaveBeenCalledTimes(1); // no enrich requested — only the extraction call
    const body = bodyOf(fn);
    expect(body.tools[0].name).toBe('jd_fields');
    expect(r.usedLLM).toBe(true);
    expect(r.fields).toMatchObject({ companyName: 'Acme Corp', targetRole: 'Senior Backend Engineer', workModel: 'Remote' });
  });

  it('falls back to the deterministic extractor if the structured call throws', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: { message: 'bad key' } }, 401)));
    const r = await runJdParse({ jdText: JD_TEXT, apiKey: 'bad-key', provider: 'anthropic' });
    expect(r.usedLLM).toBe(false);
    expect(r.fields.companyName).toBe('Acme Corp'); // deterministic backstop still finds it
  });
});

describe('runJdParse — enrich (research brief)', () => {
  it('routes an apiKey (even with a searchKey present) through the grounded LLM path for the full brief', async () => {
    let call = 0;
    const fn = vi.fn(async () => {
      call += 1;
      if (call === 1) {
        // Extraction (structured tool call).
        return jsonResponse({
          content: [{ type: 'tool_use', name: 'jd_fields', input: { companyName: 'Acme Corp', targetRole: 'Backend Engineer', workModel: null, location: null, salaryRange: null, otherBenefits: null, hrContact: null, keyRequirements: null, techTags: [] } }],
        });
      }
      // Enrich (grounded call — native anthropic search dialect, plain-text JSON brief).
      return jsonResponse({
        content: [
          { type: 'web_search_tool_result', content: [{ type: 'web_search_result', title: 'Acme', url: 'https://acme.com' }] },
          {
            type: 'text',
            text: JSON.stringify({
              companyWebsite: 'https://acme.com', summary: 'Acme builds rockets.', marketSalaryHint: null,
              productOverview: 'Reusable orbital rockets.', engCulture: null,
              stackSignals: ['Kubernetes', 'Go'], recentNews: ['Raised Series C'], experienceMatch: null,
            }),
          },
        ],
      });
    });
    vi.stubGlobal('fetch', fn);
    const r = await runJdParse({ jdText: JD_TEXT, apiKey: 'sk-ant', provider: 'anthropic', searchKey: 'serper-key', enrich: true });
    expect(call).toBe(2); // extraction + enrich, serper never called directly
    expect(r.research?.via).toBe('anthropic-native');
    expect(r.research?.productOverview).toBe('Reusable orbital rockets.');
    expect(r.research?.stackSignals).toEqual(['Kubernetes', 'Go']);
    expect(r.research?.recentNews).toEqual(['Raised Series C']);
  });

  it('layers a researchPromptOverride on top of the built-in JSON contract', async () => {
    let call = 0;
    const fn = vi.fn(async () => {
      call += 1;
      if (call === 1) {
        return jsonResponse({ content: [{ type: 'tool_use', name: 'jd_fields', input: { companyName: 'Acme Corp', targetRole: null, workModel: null, location: null, salaryRange: null, otherBenefits: null, hrContact: null, keyRequirements: null, techTags: [] } }] });
      }
      return jsonResponse({ content: [{ type: 'text', text: '{"companyWebsite":null,"summary":null,"marketSalaryHint":null,"productOverview":null,"engCulture":null,"stackSignals":[],"recentNews":[],"experienceMatch":null}' }] });
    });
    vi.stubGlobal('fetch', fn);
    await runJdParse({ jdText: JD_TEXT, apiKey: 'sk-ant', provider: 'anthropic', enrich: true, researchPromptOverride: 'Focus heavily on funding history.' });
    const enrichBody = bodyOf(fn, 1);
    const sentPrompt = enrichBody.messages[0].content as string;
    expect(sentPrompt).toContain('ADDITIONAL USER RESEARCH FOCUS');
    expect(sentPrompt).toContain('Focus heavily on funding history.');
  });

  it('uses the serper-only path (basic fields only) when there is no apiKey', async () => {
    const fn = vi.fn(async (url: string) => {
      expect(url).toBe('https://google.serper.dev/search');
      return jsonResponse({
        knowledgeGraph: { website: 'https://acme.com', description: 'Acme builds rockets.' },
        organic: [{ title: 'Acme', link: 'https://acme.com' }],
      });
    });
    vi.stubGlobal('fetch', fn);
    const r = await runJdParse({ jdText: JD_TEXT, searchKey: 'serper-key', enrich: true });
    expect(r.research?.via).toBe('serper');
    expect(r.research?.companyWebsite).toBe('https://acme.com');
    expect(r.research?.productOverview).toBeUndefined(); // no LLM synthesis without an apiKey
  });
});
