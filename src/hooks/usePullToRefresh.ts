import { RefObject, useEffect, useRef, useState } from 'react';

const THRESHOLD = 70;   // px pulled before a refresh fires
const MAX = 110;        // max visual pull distance
const RESISTANCE = 0.5; // drag feels rubber-banded

/**
 * Touch pull-to-refresh for a scrollable element. Only engages when the
 * element is scrolled to the top and `enabled` (mobile). Returns the current
 * pull distance (for a visual indicator) and whether a refresh is running.
 */
export function usePullToRefresh(
  ref: RefObject<HTMLElement | null>,
  onRefresh: () => Promise<void> | void,
  enabled: boolean,
) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let startY = 0;
    let active = false;

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current || el.scrollTop > 0) return;
      startY = e.touches[0].clientY;
      active = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!active) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0) { active = false; pullRef.current = 0; setPull(0); return; }
      // Pulling down at the top — take over from native overscroll.
      if (e.cancelable) e.preventDefault();
      const dist = Math.min(MAX, dy * RESISTANCE);
      pullRef.current = dist;
      setPull(dist);
    };

    const onEnd = async () => {
      if (!active) return;
      active = false;
      if (pullRef.current >= THRESHOLD) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPull(THRESHOLD);
        try { await onRefresh(); } finally {
          refreshingRef.current = false;
          setRefreshing(false);
          pullRef.current = 0;
          setPull(0);
        }
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [ref, onRefresh, enabled]);

  return { pull, refreshing };
}
