import { useEffect, useRef, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { tailoredResumeService, TailoredResume } from '../lib/tailoredResumeService';

const guestKey = 'hiretrack_tailored_guest';
const userKey = (id: string) => `hiretrack_tailored_user_${id}`;

function readLocal(key: string): TailoredResume[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as TailoredResume[]) : [];
  } catch {
    return [];
  }
}

// Tailored-resume history with the app's optimistic-UI + localStorage-mirror
// pattern. Signed-in users load from / sync to tailored_resumes (job-linked
// entries only); quick-paste entries (no jobId) and guests stay local-only.
export function useTailoredResumes(user: SupabaseUser | null) {
  const storageKey = user ? userKey(user.id) : guestKey;
  const [items, setItems] = useState<TailoredResume[]>(() => readLocal(storageKey));
  const hydrated = useRef(false);

  useEffect(() => {
    hydrated.current = false;
    setItems(readLocal(storageKey));
    if (!user) {
      hydrated.current = true;
      return;
    }
    let cancelled = false;
    tailoredResumeService
      .fetchAll(user.id)
      .then((rows) => {
        if (cancelled) return;
        if (rows) {
          // Keep local-only quick-paste entries (no jobId) the cloud doesn't have.
          const byId = new Set(rows.map((r) => r.id));
          const localOnly = readLocal(storageKey).filter((t) => !t.jobId && !byId.has(t.id));
          const merged = [...localOnly, ...rows].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
          setItems(merged);
          localStorage.setItem(storageKey, JSON.stringify(merged));
        }
        hydrated.current = true;
      })
      .catch(() => {
        hydrated.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const persist = (next: TailoredResume[]) => localStorage.setItem(storageKey, JSON.stringify(next));

  const add = (input: { jobId: string | null; label: string; contentMd: string }) => {
    const version = input.jobId ? items.filter((t) => t.jobId === input.jobId).length + 1 : 1;
    const item: TailoredResume = {
      ...input,
      version,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => {
      const next = [item, ...prev];
      persist(next);
      return next;
    });
    if (user && item.jobId) tailoredResumeService.add(user.id, item).catch(() => {});
    return item;
  };

  const remove = (id: string) => {
    let had: TailoredResume | undefined;
    setItems((prev) => {
      had = prev.find((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);
      persist(next);
      return next;
    });
    if (user && had?.jobId) tailoredResumeService.remove(user.id, id).catch(() => {});
  };

  return { items, add, remove };
}
