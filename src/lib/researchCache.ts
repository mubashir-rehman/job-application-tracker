// Track 3 — client-side cache for company research briefs (JdResearch), keyed
// by a normalized company name. Avoids re-spending search/LLM tokens researching
// the same company again within the TTL window.
import { JdResearch } from './apiClient';

const PREFIX = 'hiretrack_research_';
const TTL_MS = 24 * 60 * 60 * 1000; // 24h — company facts don't change minute to minute

interface CacheEntry {
  research: JdResearch;
  savedAt: number;
}

function keyFor(company: string): string {
  return PREFIX + company.trim().toLowerCase().replace(/\s+/g, '-');
}

export function loadCachedResearch(company: string): JdResearch | null {
  if (!company.trim()) return null;
  try {
    const raw = localStorage.getItem(keyFor(company));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (!entry?.research || Date.now() - entry.savedAt > TTL_MS) return null;
    return entry.research;
  } catch {
    return null;
  }
}

export function saveResearchCache(company: string, research: JdResearch): void {
  if (!company.trim()) return;
  try {
    const entry: CacheEntry = { research, savedAt: Date.now() };
    localStorage.setItem(keyFor(company), JSON.stringify(entry));
  } catch {
    // localStorage unavailable/full — cache is best-effort, never fatal.
  }
}
