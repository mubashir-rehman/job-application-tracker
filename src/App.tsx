import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { JobApplication } from './types';
import { StatsGrid } from './components/StatsGrid';
import { PerformanceTelemetry } from './components/PerformanceTelemetry';
import { ApplicationTable } from './components/ApplicationTable';
import { DetailSlideOver } from './components/DetailSlideOver';
import { NewApplicationModal } from './components/NewApplicationModal';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Plus, Download, Database, RefreshCw, AlertTriangle, X, Trash2, Eye, EyeOff } from 'lucide-react';
import { isSupabaseConfigured } from './supabaseClient';
import { LoginScreen } from './components/LoginScreen';
import { ProfileModal } from './components/ProfileModal';
import { Button } from '@/components/ui/button';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import { useApplications } from './hooks/useApplications';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const { user, isGuest, signOut, signIn, enterGuestMode } = useAuth();
  const { applications, isLoading, dbError, addApplication, updateApplication, deleteApplication, exportData } = useApplications(user);

  // UI-only state (stays in App)
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [isNewAppOpen, setIsNewAppOpen]               = useState(false);
  const [isProfileOpen, setIsProfileOpen]             = useState(false);
  const [appToDelete, setAppToDelete]                 = useState<JobApplication | null>(null);
  const [showTelemetry, setShowTelemetry]             = useState<boolean>(
    () => localStorage.getItem('hiretrack_show_telemetry') === 'true'
  );
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }[]>([]);

  useEffect(() => {
    localStorage.setItem('hiretrack_show_telemetry', String(showTelemetry));
  }, [showTelemetry]);

  // Escape key dismisses delete confirmation
  useEffect(() => {
    if (!appToDelete) return;
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setAppToDelete(null); };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [appToDelete]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const handleAddApplication = (newApp: JobApplication) => addApplication(newApp, showToast);
  const handleUpdateApplication = (updatedApp: JobApplication) => {
    updateApplication(updatedApp, showToast);
    // Keep slide-over in sync
    setSelectedApplication(prev => prev?.id === updatedApp.id ? updatedApp : prev);
  };
  const handleDeleteApplication = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
        onAuthSuccess={(loggedInUser) => {
          signIn();
          // user state updates via useAuth's onAuthStateChange
        }}
      />
    );
  }

  return (
    <div className="ambient-bg min-h-screen text-slate-100 font-sans flex flex-col">

      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        user={user}
        isGuest={isGuest}
        onSignOut={signOut}
        onSignIn={signIn}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* ── MAIN CONTENT ───────────────────────────────────── */}
      <main className="flex-1 flex flex-col p-4 md:p-8 lg:p-10 min-w-0">

        {isLoading && (
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-6 max-w-sm animate-pulse">
            <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
            <span className="text-xs font-bold text-slate-300">Synchronizing with Supabase cloud...</span>
          </div>
        )}

        {dbError && (
          <div className="bg-slate-900 border border-amber-500/30 p-5 rounded-2xl text-xs text-slate-300 mb-6 max-w-2xl shadow-lg flex flex-col sm:flex-row items-start gap-3.5">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <span className="font-bold text-amber-400 block uppercase tracking-wider text-[10px]">Cloud Connection Status</span>
              <p className="leading-relaxed font-medium">{dbError}</p>
            </div>
          </div>
        )}

        {/* ── APPLICATIONS VIEW ─── */}
        <div className="flex-1 space-y-4" id="applications-view">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-6">
            <div>
              <h1 className="text-3xl font-black font-display text-slate-100 tracking-tight flex flex-wrap items-center gap-3">
                <span>Application Pipeline</span>
                <button
                  onClick={() => setShowTelemetry(v => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 rounded-xl border border-slate-800 text-[10px] font-bold font-mono tracking-wider uppercase transition-all cursor-pointer h-7"
                  aria-label={showTelemetry ? 'Hide analytics' : 'Show analytics'}
                  aria-expanded={showTelemetry}
                >
                  {showTelemetry ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showTelemetry ? 'Hide Analytics' : 'Show Analytics'}</span>
                </button>
              </h1>
              <p className="text-slate-400 text-sm font-medium mt-1">
                Track your interviews, feedback cycles, and pipeline progress.
              </p>
            </div>

            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              <Button
                onClick={() => exportData(applications)}
                variant="outline"
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl font-bold text-xs border border-slate-800 shadow-sm flex items-center gap-1.5 transition-all w-1/2 sm:w-auto justify-center cursor-pointer h-auto"
                aria-label="Export applications as JSON"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Export JSON</span>
              </Button>

              <Button
                onClick={() => setIsNewAppOpen(true)}
                id="add-application-main-btn"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-500/10 flex items-center gap-1.5 transition-all w-1/2 sm:w-auto justify-center cursor-pointer h-auto"
                aria-label="Add new application"
              >
                <Plus className="w-4 h-4" />
                <span>New Application</span>
              </Button>
            </div>
          </header>

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
          />
        </div>

        <Footer />
      </main>

      {/* ── MODALS ─────────────────────────────────────────── */}
      <DetailSlideOver
        application={selectedApplication}
        isOpen={selectedApplication !== null}
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
              className="relative w-full max-w-md glass-panel p-6 rounded-2xl border border-rose-950 bg-slate-900 shadow-xl overflow-hidden"
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
              className={`p-4 rounded-xl shadow-lg border flex items-start gap-3 pointer-events-auto backdrop-blur-md ${
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

    </div>
  );
}
