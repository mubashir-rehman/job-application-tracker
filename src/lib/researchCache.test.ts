import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadCachedResearch, saveResearchCache } from './researchCache';

// Minimal in-memory localStorage stand-in (this repo's vitest environment is
// 'node', with no browser storage global) — same "install a fake global"
// pattern used by pdfRaster.test.ts for canvas/document.
function installFakeLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  });
}

beforeEach(() => installFakeLocalStorage());
afterEach(() => vi.unstubAllGlobals());

describe('research cache', () => {
  it('returns null for a company with no cached entry', () => {
    expect(loadCachedResearch('Acme Corp')).toBeNull();
  });

  it('round-trips a saved brief', () => {
    saveResearchCache('Acme Corp', { summary: 'Builds rockets.', via: 'anthropic-native' });
    expect(loadCachedResearch('Acme Corp')).toEqual({ summary: 'Builds rockets.', via: 'anthropic-native' });
  });

  it('normalizes company name casing/whitespace for the cache key', () => {
    saveResearchCache('  Acme Corp  ', { summary: 'x' });
    expect(loadCachedResearch('acme corp')).toEqual({ summary: 'x' });
  });

  it('expires an entry older than the TTL', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    saveResearchCache('Acme Corp', { summary: 'x' });
    vi.spyOn(Date, 'now').mockReturnValue(now + 25 * 60 * 60 * 1000); // 25h later
    expect(loadCachedResearch('Acme Corp')).toBeNull();
  });

  it('ignores a blank company name', () => {
    saveResearchCache('  ', { summary: 'x' });
    expect(loadCachedResearch('  ')).toBeNull();
  });

  it('returns null instead of throwing on corrupted cache data', () => {
    localStorage.setItem('hiretrack_research_acme-corp', 'not json');
    expect(loadCachedResearch('Acme Corp')).toBeNull();
  });
});
