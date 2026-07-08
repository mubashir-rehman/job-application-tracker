import { useEffect, useRef, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { instructionsService } from '../lib/instructionsService';
import { DEFAULT_INSTRUCTIONS } from '../lib/defaultInstructions';
import type { SyncStatus } from './useMasterResume';

const INSTRUCTIONS_KEY = 'hiretrack_instructions';

// Owns the custom tailoring instructions (the system prompt used to generate
// tailored resumes). Mirrors useMasterResume: localStorage always, cloud
// resume_instructions for signed-in users. Unlike the master CV, this defaults
// to a generic, public-safe prompt so a brand-new user gets sensible tailoring
// out of the box; they can replace it with their own.
export function useInstructions(user: SupabaseUser | null) {
  const [instructions, setInstructions] = useState(
    () => localStorage.getItem(INSTRUCTIONS_KEY) ?? DEFAULT_INSTRUCTIONS,
  );
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
    instructionsService
      .fetchCurrent(user.id)
      .then((row) => {
        if (cancelled) return;
        // Use the saved prompt if the user has one; otherwise keep the default
        // (the save effect below will persist it as their starting point).
        if (row?.content_md) {
          setInstructions(row.content_md);
          localStorage.setItem(INSTRUCTIONS_KEY, row.content_md);
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
    localStorage.setItem(INSTRUCTIONS_KEY, instructions);
    if (!user || !hydrated.current) return;
    setStatus('saving');
    const t = setTimeout(() => {
      instructionsService
        .save(user.id, instructions)
        .then(() => setStatus('synced'))
        .catch(() => setStatus('error'));
    }, 1000);
    return () => clearTimeout(t);
  }, [instructions, user?.id]);

  const isDefault = instructions.trim() === DEFAULT_INSTRUCTIONS.trim();

  return { instructions, setInstructions, status, isDefault };
}
