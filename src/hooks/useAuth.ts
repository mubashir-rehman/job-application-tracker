import { useState, useEffect } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

export function useAuth() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isGuest, setIsGuest] = useState(
    () => localStorage.getItem('hiretrack_is_guest') === 'true'
  );

  // Session sync + auth state listener
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsGuest(false);
        localStorage.removeItem('hiretrack_is_guest');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
        setIsGuest(false);
        localStorage.removeItem('hiretrack_is_guest');
      } else if (session?.user) {
        setIsGuest(false);
        localStorage.removeItem('hiretrack_is_guest');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cross-tab / popup auth message
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('vercel.app')) return;
      if (event.data?.type === 'SUPABASE_AUTH_SUCCESS' && isSupabaseConfigured && supabase) {
        supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // OAuth popup callback handler
  useEffect(() => {
    const hasHash = window.location.hash && (
      window.location.hash.includes('access_token=') ||
      window.location.hash.includes('error=')
    );
    if (!window.opener || (!hasHash && !window.location.search.includes('code='))) return;

    const checkSession = async () => {
      if (supabase) {
        for (let i = 0; i < 5; i++) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) break;
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      try { window.opener.postMessage({ type: 'SUPABASE_AUTH_SUCCESS' }, '*'); }
      catch (err) { console.error('Failed to post message to opener', err); }
      window.close();
    };
    checkSession();
  }, []);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
  };

  const signIn = () => {
    setIsGuest(false);
    localStorage.removeItem('hiretrack_is_guest');
  };

  const enterGuestMode = () => {
    setIsGuest(true);
    localStorage.setItem('hiretrack_is_guest', 'true');
  };

  return { user, isGuest, signOut, signIn, enterGuestMode };
}
