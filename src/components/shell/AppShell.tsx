import React from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Search, Sun, Moon, Settings, User } from 'lucide-react';
import { Sidebar, ViewKey } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Footer } from '../Footer';

interface AppShellProps {
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
  /** Mobile FAB action (bottom nav). */
  onNewApplication: () => void;
  topBar?: React.ReactNode;
  children: React.ReactNode;
  /** Inline detail pane (desktop/wide). When set, renders as a right-hand column. */
  detailPane?: React.ReactNode;
}

export function AppShell({
  theme, onToggleTheme, user, isGuest, onSignOut, onSignIn,
  onOpenProfile, onOpenSettings, onOpenCommand, hasApiKey,
  activeView, onChangeView, onNewApplication, topBar, children, detailPane,
}: AppShellProps) {
  return (
    <div className="ambient-bg h-screen flex overflow-hidden text-slate-100 font-sans">
      <Sidebar
        theme={theme}
        onToggleTheme={onToggleTheme}
        user={user}
        isGuest={isGuest}
        onSignOut={onSignOut}
        onSignIn={onSignIn}
        onOpenProfile={onOpenProfile}
        onOpenSettings={onOpenSettings}
        onOpenCommand={onOpenCommand}
        hasApiKey={hasApiKey}
        activeView={activeView}
        onChangeView={onChangeView}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top strip (sidebar is hidden < md) */}
        <div
          className="md:hidden flex items-center justify-between h-14 px-4 shrink-0 border-b border-slate-800/70 bg-slate-900/70 backdrop-blur-xl"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center font-black text-white text-[10px] font-display shrink-0">HT</div>
            <span className="text-sm font-black font-display text-slate-100">HireTrack<span className="text-indigo-400">.pro</span></span>
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={onOpenCommand} className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition" aria-label="Search commands">
              <Search className="w-4 h-4" />
            </button>
            <button onClick={onToggleTheme} className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>
            <button onClick={onOpenSettings} className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition relative" aria-label="Settings">
              <Settings className="w-4 h-4" />
              {hasApiKey && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
            </button>
            <button onClick={onOpenProfile} className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition" aria-label="Open profile">
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Slim top bar — page title + actions */}
        {topBar && (
          <div className="shrink-0 border-b border-slate-800/70 bg-slate-900/30 backdrop-blur-md px-4 md:px-8 py-3">
            {topBar}
          </div>
        )}

        {/* Scrollable content region — extra bottom padding on mobile clears the fixed tab bar */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-28 md:pb-6 min-w-0">
          {children}
        </main>

        {/* Persistent sticky footer (desktop only — mobile uses the bottom tab bar) */}
        <div className="hidden md:block shrink-0 border-t border-slate-800/70 bg-slate-900/40 backdrop-blur-md px-8 py-2.5">
          <Footer compact />
        </div>
      </div>

      {/* Inline detail pane (wide screens) */}
      {detailPane && (
        <aside className="hidden xl:flex w-[460px] 2xl:w-[560px] shrink-0 h-screen">
          {detailPane}
        </aside>
      )}

      {/* Mobile bottom navigation + FAB */}
      <BottomNav activeView={activeView} onChangeView={onChangeView} onNewApplication={onNewApplication} />
    </div>
  );
}
