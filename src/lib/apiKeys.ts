// Canonical BYOK API-key model — shared by SettingsModal and ResumeBuilder.
// Keys live in localStorage only and never touch Supabase or logs.

export type Provider = 'openai' | 'anthropic' | 'gemini' | 'mimo' | 'custom';

export interface ApiKeys {
  openai?: string;
  anthropic?: string;
  gemini?: string;
  mimo?: string;
  custom?: string;
}

export const PROVIDERS: { id: Provider; label: string; placeholder: string; hint: string }[] = [
  { id: 'anthropic', label: 'Anthropic (Claude)', placeholder: 'sk-ant-api03-...', hint: 'claude.ai/settings' },
  { id: 'openai',    label: 'OpenAI (GPT-4o)',    placeholder: 'sk-proj-...',       hint: 'platform.openai.com' },
  { id: 'gemini',    label: 'Google Gemini',       placeholder: 'AIzaSy...',         hint: 'aistudio.google.com' },
  { id: 'mimo',      label: 'Xiaomi MiMo',         placeholder: 'tp-...',            hint: 'xiaomimimo.com' },
];

const STORAGE_KEY = 'hiretrack_api_keys';

export function loadApiKeys(): ApiKeys {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

export function persistApiKeys(keys: ApiKeys): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function hasAnyApiKey(): boolean {
  const keys = loadApiKeys();
  return PROVIDERS.some(p => !!keys[p.id]) || !!keys.custom;
}

// Masked preview of a stored key, e.g. "sk-ant-a••••••••••••••••".
export function maskKey(key: string, head = 8, dots = 16): string {
  return `${key.slice(0, head)}${'•'.repeat(dots)}`;
}
