// serper.dev (Google Search API) key for JD company research. Like all BYOK
// keys it lives in localStorage only and travels in the X-Search-Key header.

const STORAGE_KEY = 'hiretrack_serper_key';

export function loadSearchKey(): string {
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function saveSearchKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key.trim());
}

export function removeSearchKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasSearchKey(): boolean {
  return !!loadSearchKey();
}
