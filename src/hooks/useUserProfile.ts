import { useEffect, useRef, useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { userProfileService } from '../lib/userProfileService';
import { UserProfile, EMPTY_USER_PROFILE, normalizeUserProfile } from '../lib/userProfile';
import type { SyncStatus } from './useMasterResume';

const PROFILE_KEY = 'hiretrack_user_profile';

function loadLocal(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? normalizeUserProfile(JSON.parse(raw)) : { ...EMPTY_USER_PROFILE };
  } catch {
    return { ...EMPTY_USER_PROFILE };
  }
}

// Owns the User Profile hard rules (Track 4). Mirrors useMasterResume /
// useInstructions: localStorage always (offline/guest), cloud user_profile
// table for signed-in users, debounce-saved. Feeds src/lib/triage.ts.
export function useUserProfile(user: SupabaseUser | null) {
  const [profile, setProfile] = useState<UserProfile>(loadLocal);
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
    userProfileService
      .fetchCurrent(user.id)
      .then((row) => {
        if (cancelled) return;
        if (row?.content) {
          const normalized = normalizeUserProfile(row.content);
          setProfile(normalized);
          localStorage.setItem(PROFILE_KEY, JSON.stringify(normalized));
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

  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    if (!user || !hydrated.current) return;
    setStatus('saving');
    const t = setTimeout(() => {
      userProfileService
        .save(user.id, profile)
        .then(() => setStatus('synced'))
        .catch(() => setStatus('error'));
    }, 1000);
    return () => clearTimeout(t);
  }, [profile, user?.id]);

  return { profile, setProfile, status };
}
