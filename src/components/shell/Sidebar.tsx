import React from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import {
  LayoutGrid, Sparkles, BrainCircuit, Search, Sun, Moon,
  Settings, LogOut, LogIn, User,
} from 'lucide-react';

export type ViewKey = 'applications' | 'resume' | 'knowledge';

export interface NavItem {
  key: ViewKey;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  soon?: boolean;
}

// Single source of truth for the primary views — shared by Sidebar (desktop)
// and BottomNav (mobile).
export const NAV: NavItem[] = [
  { key: 'applications', label: 'Applications',  shortLabel: 'Apps',      icon: LayoutGrid },
  { key: 'resume',       label: 'Resume Builder', shortLabel: 'Resume',    icon: Sparkles },
  { key: 'knowledge',    label: 'Knowledge Bank', shortLabel: 'Knowledge', icon: BrainCircuit },
];

interface SidebarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  user: SupabaseUser | null;
  isGuest: boolean;
  onSignOut: () => void;
  onSignIn: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenCommand: () => void;
  hasApiKey: boolean;
  activeView: ViewKey;
  onChangeView: (v: ViewKey) => void;
}

export function Sidebar({
  theme, onToggleTheme, user, isGuest, onSignOut, onSignIn,
  onOpenProfile, onOpenSettings, onOpenCommand, hasApiKey,
  activeView, onChangeView,
}: SidebarProps) {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900/60 backdrop-blur-xl">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-16 shrink-0 border-b border-slate-800/70">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-black text-white text-xs font-display shadow shadow-indigo-500/30 shrink-0">
          HT
        </div>
        <div className="leading-tight min-w-0">
          <span className="text-sm font-black tracking-tight font-display text-slate-100 block leading-none truncate">
            HireTrack<span className="text-indigo-400">.pro</span>
          </span>
          <span className="text-[9px] text-indigo-300 font-mono tracking-widest uppercase leading-none mt-0.5 block">
            Developer Suite
          </span>
        </div>
      </div>

      {/* Command trigger */}
      <div className="px-3 pt-3">
        <button
          onClick={onOpenCommand}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/50 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition text-xs font-semibold"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="text-[9px] font-mono bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">⌘K</kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-1">
        {NAV.map(({ key, label, icon: Icon, soon }) => {
          const active = activeView === key;
          return (
            <button
              key={key}
              onClick={() => !soon && onChangeView(key)}
              disabled={soon}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition relative ${
                active
                  ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20'
                  : soon
                    ? 'text-slate-500 cursor-not-allowed'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {soon && (
                <span className="text-[8px] font-mono uppercase tracking-wider bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="px-3 py-3 border-t border-slate-800/70 space-y-2">
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition relative"
            aria-label="Settings — AI keys & master resume"
            title="Settings — AI Keys & Master Resume"
          >
            <Settings className="w-4 h-4" />
            {hasApiKey && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
          </button>
        </div>

        {/* User block */}
        {user ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition flex-1 min-w-0"
              aria-label="Open profile"
            >
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover border border-slate-700 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                </div>
              )}
              <span className="text-xs font-bold text-slate-300 truncate">
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </span>
            </button>
            <button
              onClick={onSignOut}
              className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition shrink-0"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onSignIn}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition"
            aria-label="Sign in"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{isGuest ? 'Sign In to Sync' : 'Sign In'}</span>
          </button>
        )}
      </div>
    </aside>
  );
}
