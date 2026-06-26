import { useEffect, useRef, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { masterResumeService } from '../lib/masterResumeService';

const MASTER_CV_KEY = 'hiretrack_master_cv';

export type SyncStatus = 'local' | 'loading' | 'saving' | 'synced' | 'error';

// Owns the master CV text. Mirrors to localStorage always (offline/guest),
// and for signed-in users loads from / debounce-saves to the master_resume
// cloud table. Won't overwrite cloud with stale local until the initial
// cloud load has hydrated.
export function useMasterResume(user: SupabaseUser | null) {
  const [masterMd, setMasterMd] = useState(() => localStorage.getItem(MASTER_CV_KEY) || '');
  const [status, setStatus] = useState<SyncStatus>('local');
  const hydrated = useRef(false);

  // Load the cloud copy when the signed-in user changes.
  useEffect(() => {
    hydrated.current = false;
    if (!user) {
      setStatus('local');
      hydrated.current = true;
      return;
    }
    let cancelled = false;
    setStatus('loading');
    masterResumeService
      .fetchCurrent(user.id)
      .then((row) => {
        if (cancelled) return;
        if (row?.content_md) {
          setMasterMd(row.content_md);
          localStorage.setItem(MASTER_CV_KEY, row.content_md);
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

  // Always mirror to localStorage; debounce-save to cloud for signed-in users.
  useEffect(() => {
    localStorage.setItem(MASTER_CV_KEY, masterMd);
    if (!user || !hydrated.current) return;
    setStatus('saving');
    const t = setTimeout(() => {
      masterResumeService
        .save(user.id, masterMd)
        .then(() => setStatus('synced'))
        .catch(() => setStatus('error'));
    }, 1000);
    return () => clearTimeout(t);
  }, [masterMd, user?.id]);

  return { masterMd, setMasterMd, status };
}
