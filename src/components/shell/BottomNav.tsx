import { Plus } from 'lucide-react';
import { NAV, ViewKey } from './Sidebar';

interface BottomNavProps {
  activeView: ViewKey;
  onChangeView: (v: ViewKey) => void;
  onNewApplication: () => void;
}

// Mobile-only bottom tab bar + a floating "New application" FAB.
// Hidden ≥ md (desktop uses the Sidebar). Honors the bottom safe-area inset.
export function BottomNav({ activeView, onChangeView, onNewApplication }: BottomNavProps) {
  return (
    <>
      {/* Floating action button — sits just above the tab bar */}
      <button
        onClick={onNewApplication}
        aria-label="New application"
        className="md:hidden fixed right-4 z-50 w-14 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white flex items-center justify-center elevation-3 shadow-lg shadow-indigo-600/30 transition"
        style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Tab bar */}
      <nav
        className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-slate-800/70 bg-slate-900/80 backdrop-blur-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Primary"
      >
        <div className="flex items-stretch justify-around h-16">
          {NAV.map(({ key, shortLabel, icon: Icon, soon }) => {
            const active = activeView === key;
            return (
              <button
                key={key}
                onClick={() => !soon && onChangeView(key)}
                disabled={soon}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-1 flex-col items-center justify-center gap-1 transition ${
                  active
                    ? 'text-indigo-600 dark:text-indigo-300'
                    : soon
                      ? 'text-slate-600'
                      : 'text-slate-400 active:text-slate-200'
                }`}
              >
                {active && <span className="absolute top-0 h-0.5 w-10 rounded-full bg-indigo-500" />}
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[10px] font-bold tracking-wide leading-none">{shortLabel}</span>
                {soon && (
                  <span className="absolute top-2.5 right-[22%] w-1.5 h-1.5 rounded-full bg-slate-600" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
