import { useEffect, useRef, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { knowledgeBankService, ProfileEntry } from '../lib/knowledgeBankService';

const guestKey = 'hiretrack_kb_entries_guest';
const userKey = (id: string) => `hiretrack_kb_entries_user_${id}`;

export type KbSyncStatus = 'local' | 'loading' | 'synced' | 'error';

function readLocal(key: string): ProfileEntry[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ProfileEntry[]) : [];
  } catch {
    return [];
  }
}

// Knowledge-bank entries with the app's optimistic-UI + localStorage-mirror
// pattern: every mutation updates local state + localStorage first, then fires
// the cloud call in the background. Signed-in users load from / sync to
// profile_entries; guests stay local-only.
export function useKnowledgeBank(user: SupabaseUser | null) {
  const storageKey = user ? userKey(user.id) : guestKey;
  const [entries, setEntries] = useState<ProfileEntry[]>(() => readLocal(storageKey));
  const [status, setStatus] = useState<KbSyncStatus>('local');
  const hydrated = useRef(false);

  // (Re)load when the active scope (user/guest) changes.
  useEffect(() => {
    hydrated.current = false;
    const local = readLocal(storageKey);
    setEntries(local);

    if (!user) {
      setStatus('local');
      hydrated.current = true;
      return;
    }

    let cancelled = false;
    setStatus('loading');
    knowledgeBankService
      .fetchEntries(user.id)
      .then((rows) => {
        if (cancelled) return;
        if (rows) {
          setEntries(rows);
          localStorage.setItem(storageKey, JSON.stringify(rows));
          setStatus('synced');
        } else {
          setStatus('local');
        }
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

  const persistLocal = (next: ProfileEntry[]) => {
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const addEntry = (input: Omit<ProfileEntry, 'id' | 'createdAt'>) => {
    const entry: ProfileEntry = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setEntries((prev) => {
      const next = [entry, ...prev];
      persistLocal(next);
      return next;
    });
    if (user) {
      knowledgeBankService
        .addEntry(user.id, entry)
        .then(() => setStatus('synced'))
        .catch(() => setStatus('error'));
    }
    return entry;
  };

  const updateEntry = (id: string, patch: Partial<ProfileEntry>) => {
    let updated: ProfileEntry | undefined;
    setEntries((prev) => {
      const next = prev.map((e) => {
        if (e.id !== id) return e;
        updated = { ...e, ...patch };
        return updated;
      });
      persistLocal(next);
      return next;
    });
    if (user && updated) {
      knowledgeBankService
        .updateEntry(user.id, updated)
        .then(() => setStatus('synced'))
        .catch(() => setStatus('error'));
    }
  };

  const deleteEntry = (id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      persistLocal(next);
      return next;
    });
    if (user) {
      knowledgeBankService
        .deleteEntry(user.id, id)
        .then(() => setStatus('synced'))
        .catch(() => setStatus('error'));
    }
  };

  return { entries, status, addEntry, updateEntry, deleteEntry };
}
