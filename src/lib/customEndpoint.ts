// Config for a user-supplied OpenAI-compatible endpoint (freellmapi self-host,
// OpenRouter, LM Studio, vLLM, local Ollama, LiteLLM, …). Base URL + model live
// here; the API key reuses the BYOK store (apiKeys.custom) so masking/remove
// work uniformly. Like all BYOK config it stays in localStorage only.

export interface CustomEndpoint {
  baseUrl: string; // e.g. https://my-freellmapi.example.com/v1
  model: string;   // e.g. gemini-2.0-flash, llama-3.3-70b, etc.
}

const STORAGE_KEY = 'hiretrack_custom_endpoint';

const EMPTY: CustomEndpoint = { baseUrl: '', model: '' };

export function loadCustomEndpoint(): CustomEndpoint {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

export function saveCustomEndpoint(cfg: CustomEndpoint): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

// Normalize a base URL to its /v1 root (tolerate trailing slash or a pasted
// /chat/completions path). The caller appends /chat/completions.
export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
}
