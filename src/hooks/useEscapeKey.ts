import { useEffect } from 'react';

// Calls `onEscape` when Escape is pressed, but only while `active`.
// Replaces the copy-pasted keydown effect in every modal/overlay.
export function useEscapeKey(active: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onEscape(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, onEscape]);
}
