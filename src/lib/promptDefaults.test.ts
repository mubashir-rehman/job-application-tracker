import { describe, it, expect } from 'vitest';
import { resolvePrompt, PROMPT_REGISTRY } from './promptDefaults';

describe('resolvePrompt — resolution order (override > default)', () => {
  it('uses the override when present and non-blank', () => {
    expect(resolvePrompt('default text', 'custom text')).toBe('custom text');
  });
  it('falls back to the default when override is undefined', () => {
    expect(resolvePrompt('default text', undefined)).toBe('default text');
  });
  it('falls back to the default when override is null', () => {
    expect(resolvePrompt('default text', null)).toBe('default text');
  });
  it('falls back to the default when override is blank/whitespace-only', () => {
    expect(resolvePrompt('default text', '   ')).toBe('default text');
  });
  it('trims the override', () => {
    expect(resolvePrompt('default text', '  custom  ')).toBe('custom');
  });
});

describe('PROMPT_REGISTRY', () => {
  it('lists all four configurable prompts with a non-empty shipped default', () => {
    const keys = PROMPT_REGISTRY.map((p) => p.key);
    expect(keys).toEqual(['tailoring', 'visualQaRules', 'researchBrief', 'coverEmail']);
    for (const p of PROMPT_REGISTRY) {
      expect(p.default.trim().length).toBeGreaterThan(0);
    }
  });

  it('only tailoring uses dedicated storage — the rest share prompt_overrides', () => {
    const dedicated = PROMPT_REGISTRY.filter((p) => p.storage === 'dedicated').map((p) => p.key);
    expect(dedicated).toEqual(['tailoring']);
  });
});
