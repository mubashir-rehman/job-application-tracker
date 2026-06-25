import { useState, useEffect } from 'react';

export type Platform = 'desktop' | 'mobile';

const MOBILE_BREAKPOINT = 768; // matches Tailwind `md`

/**
 * Reports the current layout platform based on viewport width.
 * Drives the adaptive shell — desktop gets the persistent 3-pane rail,
 * mobile (later) gets bottom nav + sheets.
 */
export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>(() =>
    typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT ? 'mobile' : 'desktop'
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const update = () => setPlatform(mql.matches ? 'mobile' : 'desktop');
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  return platform;
}

/**
 * Generic media-query subscription. Used to gate the inline detail pane to
 * wide viewports (the list+detail layout needs room); narrower screens fall
 * back to the overlay sheet.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [query]);

  return matches;
}
