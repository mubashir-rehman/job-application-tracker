import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { JobApplication } from './types';
import { StatsGrid } from './components/StatsGrid';
import { PerformanceTelemetry } from './components/PerformanceTelemetry';
import { ApplicationTable } from './components/ApplicationTable';
import { ResumeBuilder } from './components/ResumeBuilder';
import { DetailSlideOver } from './components/DetailSlideOver';
import { NewApplicationModal } from './components/NewApplicationModal';
import { Plus, Download, Database, RefreshCw, AlertTriangle, X, Trash2, Eye, EyeOff, Sun, Moon, Settings, User } from 'lucide-react';
import { isSupabaseConfigured } from './supabaseClient';
import { LoginScreen } from './components/LoginScreen';
import { ProfileModal } from './components/ProfileModal';
import { SettingsModal } from './components/SettingsModal';
import { hasAnyApiKey } from './lib/apiKeys';
import { AppShell } from './components/shell/AppShell';
import { ViewKey } from './components/shell/Sidebar';
import { CommandPalette, CommandAction } from './components/shell/CommandPalette';
import { Button } from '@/components/ui/button';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import { useApplications } from './hooks/useApplications';
import { useMediaQuery } from './hooks/usePlatform';
import { useEscapeKey } from './hooks/useEscapeKey';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { user, isGuest, signOut, signIn, enterGuestMode } = useAuth();
  const { applications, isLoading, dbError, addApplication, updateApplication, deleteApplication, refreshFromCloud, exportData } = useApplications(user);

  // UI-only state (stays in App)
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [isNewAppOpen, setIsNewAppOpen]   = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [activeView, setActiveView]       = useState<ViewKey>('applications');
  const [appToDelete, setAppToDelete]     = useState<JobApplication | null>(null);
  const [showTelemetry, setShowTelemetry] = useState<boolean>(
    () => localStorage.getItem('hiretrack_show_telemetry') === 'true'
  );
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }[]>([]);

  // Wide screens get an inline detail pane beside a compacted list; narrower
  // screens fall back to the overlay sheet.
  const isWide = useMediaQuery('(min-width: 1280px)');
  const paneOpen = isWide && selectedApplication !== null;

  useEffect(() => {
    localStorage.setItem('hiretrack_show_telemetry', String(showTelemetry));
  }, [showTelemetry]);

  // Escape key dismisses delete confirmation
  useEscapeKey(!!appToDelete, () => setAppToDelete(null));

  // ⌘K / Ctrl+K opens the command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen(o => !o);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const handleAddApplication = (newApp: JobApplication) => addApplication(newApp, showToast);
  const handleUpdateApplication = (updatedApp: JobApplication) => {
    updateApplication(updatedApp, showToast);
    setSelectedApplication(prev => prev?.id === updatedApp.id ? updatedApp : prev);
  };
  const handleDeleteApplication = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const app = applications.find(a => a.id === id);
    if (app) setAppToDelete(app);
  };
  const executeDeleteApplication = async () => {
    if (!appToDelete) return;
    if (selectedApplication?.id === appToDelete.id) setSelectedApplication(null);
    await deleteApplication(appToDelete.id, showToast);
    setAppToDelete(null);
  };

  if (!user && !isGuest) {
    return (
      <LoginScreen
        onGuestLogin={enterGuestMode}
        onAuthSuccess={() => { signIn(); }}
      />
    );
  }

  const commandActions: CommandAction[] = [
    { id: 'new',       label: 'New Application',                                   icon: Plus,                         run: () => setIsNewAppOpen(true) },
    { id: 'analytics', label: showTelemetry ? 'Hide Analytics' : 'Show Analytics', icon: showTelemetry ? EyeOff : Eye, run: () => setShowTelemetry(v => !v) },
    { id: 'theme',     label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`, icon: theme === 'dark' ? Sun : Moon, run: toggleTheme },
    { id: 'export',    label: 'Export applications as JSON',                       icon: Download,                     run: () => exportData(applications) },
    { id: 'settings',  label: 'Open Settings (AI keys & resume)',                  icon: Settings,                     run: () => setIsSettingsOpen(true) },
    { id: 'profile',   label: 'Open Profile',                                      icon: User,                         run: () => setIsProfileOpen(true) },
  ];

  const isResume = activeView === 'resume';

  const appsTopBar = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-xl font-black font-display text-slate-100 tracking-tight truncate">Application Pipeline</h1>
        <button
          onClick={() => setShowTelemetry(v => !v)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 glass-panel rounded-lg text-slate-400 hover:text-indigo-400 text-[10px] font-bold font-mono tracking-wider uppercase transition cursor-pointer h-7 shrink-0"
          aria-label={showTelemetry ? 'Hide analytics' : 'Show analytics'}
          aria-expanded={showTelemetry}
        >
          {showTelemetry ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{showTelemetry ? 'Hide Analytics' : 'Show Analytics'}</span>
        </button>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <Button
          onClick={() => exportData(applications)}
          variant="outline"
          className="px-3.5 py-2 glass-panel glass-panel-hover text-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer h-auto"
          aria-label="Export applications as JSON"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span className="hidden sm:inline">Export JSON</span>
        </Button>
        <Button
          onClick={() => setIsNewAppOpen(true)}
          id="add-application-main-btn"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-500/10 flex items-center gap-1.5 transition cursor-pointer h-auto"
          aria-label="Add new application"
        >
          <Plus className="w-4 h-4" />
          <span>New Application</span>
        </Button>
      </div>
    </div>
  );

  const resumeTopBar = (
    <h1 className="text-xl font-black font-display text-slate-100 tracking-tight">Resume Builder</h1>
  );

  return (
    <>
      <AppShell
        theme={theme}
        onToggleTheme={toggleTheme}
        user={user}
        isGuest={isGuest}
        onSignOut={signOut}
        onSignIn={signIn}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCommand={() => setIsCommandOpen(true)}
        hasApiKey={hasAnyApiKey()}
        activeView={activeView}
        onChangeView={setActiveView}
        onNewApplication={() => setIsNewAppOpen(true)}
        onRefresh={refreshFromCloud}
        topBar={isResume ? resumeTopBar : appsTopBar}
        detailPane={!isResume && paneOpen ? (
          <DetailSlideOver
            application={selectedApplication}
            isOpen
            asPane
            onClose={() => setSelectedApplication(null)}
            onUpdateApplication={handleUpdateApplication}
          />
        ) : undefined}
      >
        {isResume ? <ResumeBuilder user={user} /> : <>
        {isLoading && (
          <div className="flex items-center gap-3 glass-panel p-4 rounded-2xl mb-6 max-w-sm animate-pulse">
            <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
            <span className="text-xs font-bold text-slate-300">Synchronizing with Supabase cloud...</span>
          </div>
        )}

        {dbError && (
          <div className="glass-panel border-amber-500/30 p-5 rounded-2xl text-xs text-slate-300 mb-6 max-w-2xl flex flex-col sm:flex-row items-start gap-3.5">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <span className="font-bold text-amber-400 block uppercase tracking-wider text-[10px]">Cloud Connection Status</span>
              <p className="leading-relaxed font-medium">{dbError}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {showTelemetry && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden space-y-4"
              >
                <StatsGrid applications={applications} />
                <PerformanceTelemetry applications={applications} />
              </motion.div>
            )}
          </AnimatePresence>

          <ApplicationTable
            applications={applications}
            onSelectApplication={setSelectedApplication}
            onDeleteApplication={handleDeleteApplication}
            onUpdateApplication={handleUpdateApplication}
            compact={paneOpen}
          />
        </div>
        </>}
      </AppShell>

      {/* ── OVERLAYS ─────────────────────────────────────── */}
      {/* Overlay sheet — used on narrower screens (wide screens use the inline pane) */}
      <DetailSlideOver
        application={selectedApplication}
        isOpen={selectedApplication !== null && !isWide}
        onClose={() => setSelectedApplication(null)}
        onUpdateApplication={handleUpdateApplication}
      />

      <NewApplicationModal
        isOpen={isNewAppOpen}
        onClose={() => setIsNewAppOpen(false)}
        onAddApplication={handleAddApplication}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
      />

      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      <CommandPalette open={isCommandOpen} onOpenChange={setIsCommandOpen} actions={commandActions} />

      {/* Delete confirmation */}
      <AnimatePresence>
        {appToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAppToDelete(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="relative w-full max-w-md glass-panel p-6 rounded-2xl border border-rose-950 bg-slate-900 elevation-3 overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-modal-title"
            >
              <div className="flex items-center gap-3 text-rose-400 mb-4">
                <div className="p-2.5 bg-rose-950/50 rounded-xl border border-rose-900/30">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 id="delete-modal-title" className="font-extrabold text-slate-100 text-lg tracking-tight">Delete Tracking Record?</h3>
                  <p className="text-xs text-rose-400 font-medium">This operation cannot be reversed.</p>
                </div>
              </div>

              <div className="space-y-3.5 mb-6">
                <p className="text-sm text-slate-300 leading-relaxed">
                  Are you sure you want to permanently remove{' '}
                  <strong className="text-slate-100 font-extrabold">{appToDelete.companyName}</strong>{' '}
                  ({appToDelete.targetRole}) from your pipeline?
                </p>
                {isSupabaseConfigured && user && (
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
                    <Database className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>This will delete from both local cache and Supabase Cloud.</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setAppToDelete(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeDeleteApplication}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs transition shadow-lg shadow-rose-900/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Record</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-[110] flex flex-col gap-2 max-w-sm w-full pointer-events-none" aria-live="polite" aria-atomic="false">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              role="status"
              className={`p-4 rounded-xl elevation-2 border flex items-start gap-3 pointer-events-auto backdrop-blur-md ${
                toast.type === 'success' ? 'bg-slate-950/95 border-emerald-950/80 text-slate-100' :
                toast.type === 'error'   ? 'bg-slate-950/95 border-rose-950/80 text-slate-100' :
                toast.type === 'warning' ? 'bg-slate-950/95 border-amber-950/80 text-slate-100' :
                                           'bg-slate-950/95 border-indigo-950/80 text-slate-100'
              }`}
            >
              <div className="flex-1 text-xs font-semibold leading-relaxed">{toast.message}</div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-slate-400 hover:text-white transition p-0.5 rounded-md hover:bg-slate-800"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
