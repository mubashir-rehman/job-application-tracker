import { useEffect, useRef, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { promptOverridesService } from '../lib/promptOverridesService';
import type { SyncStatus } from './useMasterResume';

const KEY = 'hiretrack_prompt_overrides';

export interface PromptOverrideEntry {
  content: string;
  updatedAt: string;
}
type OverrideMap = Record<string, PromptOverrideEntry>;

function loadLocal(): OverrideMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Owns Track 4 Prompt Manager overrides (every configurable prompt except
// tailoring instructions, which keeps useInstructions/resume_instructions).
// Mirrors useInstructions: localStorage always, cloud prompt_overrides table
// for signed-in users, per-key explicit save (not debounced — Prompt Manager
// saves are deliberate button presses, not live-typing autosave).
export function usePromptOverrides(user: SupabaseUser | null) {
  const [overrides, setOverrides] = useState<OverrideMap>(loadLocal);
  const [status, setStatus] = useState<SyncStatus>('local');
  const hydrated = useRef(false);

  useEffect(() => {
    hydrated.current = false;
    if (!user) {
      setStatus('local');
      hydrated.current = true;
      return;
    }
    let cancelled = false;
    setStatus('loading');
    promptOverridesService
      .fetchAll(user.id)
      .then((rows) => {
        if (cancelled) return;
        if (rows.length) {
          const map: OverrideMap = {};
          for (const r of rows) map[r.prompt_key] = { content: r.content, updatedAt: r.updated_at };
          setOverrides(map);
          localStorage.setItem(KEY, JSON.stringify(map));
        }
        setStatus('synced');
        hydrated.current = true;
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
        hydrated.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const setOverride = (key: string, content: string) => {
    const entry: PromptOverrideEntry = { content, updatedAt: new Date().toISOString() };
    setOverrides((prev) => {
      const next = { ...prev, [key]: entry };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
    if (user && hydrated.current) {
      setStatus('saving');
      promptOverridesService.save(user.id, key, content).then(() => setStatus('synced')).catch(() => setStatus('error'));
    }
  };

  const resetOverride = (key: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
    if (user && hydrated.current) {
      promptOverridesService.reset(user.id, key).catch(() => setStatus('error'));
    }
  };

  return { overrides, setOverride, resetOverride, status };
}
