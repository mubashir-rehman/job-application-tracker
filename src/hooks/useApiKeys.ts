import { useState } from 'react';
import { ApiKeys, Provider, PROVIDERS, loadApiKeys, persistApiKeys } from '../lib/apiKeys';

// Owns the persisted BYOK key set. Components keep their own draft/reveal
// UI state; this hook is the single read/write path to localStorage.
export function useApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKeys>(loadApiKeys);

  const saveKey = (provider: Provider, value: string) => {
    const key = value.trim();
    if (!key) return;
    const updated = { ...apiKeys, [provider]: key };
    setApiKeys(updated);
    persistApiKeys(updated);
  };

  const removeKey = (provider: Provider) => {
    const updated = { ...apiKeys };
    delete updated[provider];
    setApiKeys(updated);
    persistApiKeys(updated);
  };

  const hasAnyKey = PROVIDERS.some(p => !!apiKeys[p.id]) || !!apiKeys.custom;

  return { apiKeys, saveKey, removeKey, hasAnyKey };
}
