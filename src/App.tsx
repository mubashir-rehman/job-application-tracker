import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { JobApplication } from './types';
import { StatsGrid } from './components/StatsGrid';
import { PerformanceTelemetry } from './components/PerformanceTelemetry';
import { ApplicationTable } from './components/ApplicationTable';
import { DetailSlideOver } from './components/DetailSlideOver';
import { NewApplicationModal } from './components/NewApplicationModal';
import { ResumeBuilder } from './components/ResumeBuilder';
import { Footer } from './components/Footer';
import {
  Layers,
  Plus,
  Download,
  User,
  Sparkles,
  Database,
  RefreshCw,
  AlertTriangle,
  LogIn,
  LogOut,
  X,
  Trash2,
  Sun,
  Moon,
  Eye,
  EyeOff,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { supabaseService } from './lib/supabaseService';
import { LoginScreen } from './components/LoginScreen';
import { ProfileModal } from './components/ProfileModal';
import { Button } from '@/components/ui/button';
import { User as SupabaseUser } from '@supabase/supabase-js';

type SidebarTab = 'applications' | 'resume-builder';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('hiretrack_theme') as 'light' | 'dark') || 'light';
  });
  const [applications, setApplications]             = useState<JobApplication[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [isNewAppOpen, setIsNewAppOpen]             = useState(false);
  const [activeSidebarTab, setActiveSidebarTab]     = useState<SidebarTab>('applications');
  const [isLoading, setIsLoading]                   = useState(false);
  const [dbError, setDbError]                       = useState<string | null>(null);
  const [user, setUser]                             = useState<SupabaseUser | null>(null);
  const [isGuest, setIsGuest]                       = useState(() => localStorage.getItem('hiretrack_is_guest') === 'true');
  const [isProfileOpen, setIsProfileOpen]           = useState(false);
  const [showTelemetry, setShowTelemetry]           = useState<boolean>(() => {
    return localStorage.getItem('hiretrack_show_telemetry') === 'true';
  });

  // Track whether the smart-default redirect has already fired this session
  const hasAutoRedirected = useRef(false);

  useEffect(() => {
    localStorage.setItem('hiretrack_show_telemetry', String(showTelemetry));
  }, [showTelemetry]);

  // Synchronize document theme class
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('hiretrack_theme', theme);
  }, [theme]);

  // Custom non-blocking states
  const [appToDelete, setAppToDelete] = useState<JobApplication | null>(null);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // Isolate localStorage cache by user ID to prevent data leakage between sessions/guests
  const getStorageKey = () =>
    user ? `hiretrack_applications_user_${user.id}` : 'hiretrack_applications_guest';

  // Listen for session and popup messages
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
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
    }
  }, []);

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

  // Handle OAuth popup callback
  useEffect(() => {
    const hasHash = window.location.hash && (
      window.location.hash.includes('access_token=') ||
      window.location.hash.includes('error=')
    );
    if (window.opener && (hasHash || window.location.search.includes('code='))) {
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
    }
  }, []);

  // Load applications on user change
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setDbError(null);

      // Seamlessly migrate legacy guest data if it exists
      if (!localStorage.getItem('hiretrack_applications_guest') && localStorage.getItem('hiretrack_applications')) {
        const legacyData = localStorage.getItem('hiretrack_applications');
        if (legacyData) localStorage.setItem('hiretrack_applications_guest', legacyData);
      }

      const key = getStorageKey();

      if (isSupabaseConfigured) {
        try {
          const cloudData = await supabaseService.fetchApplications(user?.id);
          if (cloudData && cloudData.length > 0) {
            setApplications(cloudData);
            localStorage.setItem(key, JSON.stringify(cloudData));
          } else {
            const saved = localStorage.getItem(key);
            setApplications(saved ? JSON.parse(saved) : []);
          }
        } catch (err: unknown) {
          console.error('Supabase load failed, falling back to local storage', err);
          let userFriendlyMessage = 'Could not retrieve cloud data. Loading offline backup.';
          const msg = err instanceof Error ? err.message : '';
          if (msg.includes('relation') && (msg.includes('does not exist') || msg.includes('not found'))) {
            userFriendlyMessage = "Supabase connection is active, but the 'job_applications' table was not found. Please refer to 'supabase/migrations/' to run the database setup scripts.";
          } else if ((msg.includes('column') || msg.includes('attribute')) && msg.toLowerCase().includes('userid')) {
            userFriendlyMessage = "Database Schema Error: The 'userId' column is missing. Please run the SQL schema migration from 'supabase/migrations/20260624000000_setup_job_applications.sql'.";
          } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('network')) {
            userFriendlyMessage = 'Network Connection Error: Unable to reach Supabase. Check your internet connection or VITE_SUPABASE_URL.';
          } else if (msg.includes('JWT') || msg.includes('invalid') || msg.includes('key')) {
            userFriendlyMessage = 'Authentication Key Error: Your Supabase API key is invalid or expired. Check VITE_SUPABASE_ANON_KEY.';
          } else if (msg) {
            userFriendlyMessage = `Supabase Error: ${msg}. Loading offline backup.`;
          }
          setDbError(userFriendlyMessage);
          loadLocalFallback();
        }
      } else {
        loadLocalFallback();
      }

      setIsLoading(false);
    };

    const loadLocalFallback = () => {
      const saved = localStorage.getItem(getStorageKey());
      if (saved) {
        try { setApplications(JSON.parse(saved)); }
        catch { setApplications([]); }
      } else {
        setApplications([]);
      }
    };

    loadData();
  }, [user]);

  // Smart default: route to Resume Builder on first load when there are no applications
  useEffect(() => {
    if (!isLoading && !hasAutoRedirected.current) {
      hasAutoRedirected.current = true;
      if (applications.length === 0) {
        setActiveSidebarTab('resume-builder');
      }
    }
  }, [isLoading]);

  // Save locally (Optimistic UI fallback cache)
  const saveLocalOnly = (updatedList: JobApplication[]) => {
    setApplications(updatedList);
    localStorage.setItem(getStorageKey(), JSON.stringify(updatedList));
    if (selectedApplication) {
      const fresh = updatedList.find(app => app.id === selectedApplication.id);
      if (fresh) setSelectedApplication(fresh);
    }
  };

  const handleAddApplication = async (newApp: JobApplication) => {
    const updated = [newApp, ...applications];
    saveLocalOnly(updated);
    showToast(`Successfully added ${newApp.companyName} to your pipeline.`, 'success');
    if (isSupabaseConfigured) {
      try { await supabaseService.addApplication(newApp, user?.id); }
      catch { showToast('Failed to save to cloud. Saved locally in offline sandbox mode.', 'warning'); }
    }
  };

  const handleUpdateApplication = async (updatedApp: JobApplication) => {
    const updated = applications.map(app => app.id === updatedApp.id ? updatedApp : app);
    saveLocalOnly(updated);
    showToast(`Successfully updated details for ${updatedApp.companyName}.`, 'success');
    if (isSupabaseConfigured) {
      try { await supabaseService.updateApplication(updatedApp, user?.id); }
      catch { showToast('Failed to update on cloud. Updated locally in offline sandbox mode.', 'warning'); }
    }
  };

  const handleDeleteApplication = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const app = applications.find(a => a.id === id);
    if (app) setAppToDelete(app);
  };

  const executeDeleteApplication = async () => {
    if (!appToDelete) return;
    const { id, companyName } = appToDelete;
    const updated = applications.filter(app => app.id !== id);
    saveLocalOnly(updated);
    if (selectedApplication?.id === id) setSelectedApplication(null);
    setAppToDelete(null);
    showToast(`Successfully deleted ${companyName} from your pipeline.`, 'success');
    if (isSupabaseConfigured) {
      try { await supabaseService.deleteApplication(id, user?.id); }
      catch { showToast('Failed to delete from cloud, but deleted locally.', 'warning'); }
    }
  };

  const handleRefreshFromCloud = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const cloudData = await supabaseService.fetchApplications(user?.id);
      if (cloudData) saveLocalOnly(cloudData);
    } catch (err) {
      console.error('Force sync failed', err);
      throw err;
    }
  };

  const handleExportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(applications, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', 'hiretrack_applications_backup.json');
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (!user && !isGuest) {
    return (
      <LoginScreen
        onGuestLogin={() => {
          setIsGuest(true);
          localStorage.setItem('hiretrack_is_guest', 'true');
        }}
        onAuthSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          setIsGuest(false);
          localStorage.removeItem('hiretrack_is_guest');
        }}
      />
    );
  }

  return (
    <div className="ambient-bg min-h-screen text-slate-100 font-sans flex flex-col lg:flex-row">

      {/* ── SIDEBAR ────────────────────────────────────────── */}
      <aside className="w-full lg:w-64 bg-slate-900 text-slate-200 lg:fixed lg:h-full flex flex-col z-40 border-r border-slate-800 shadow-xl" id="sidebar">

        {/* Logo / Branding */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center lg:block">
          <div className="flex items-center justify-between w-full lg:mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center font-black tracking-tighter text-white font-display shadow-lg shadow-indigo-500/20">
                HT
              </div>
              <div>
                <span className="text-lg font-black tracking-tight font-display block leading-none text-slate-100">
                  HireTrack<span className="text-indigo-400">.pro</span>
                </span>
                <span className="text-[9px] text-indigo-300 font-mono tracking-widest uppercase mt-1 block">Developer Suite</span>
              </div>
            </div>

            {/* Desktop theme toggle */}
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className="p-2 hover:bg-slate-800/60 text-slate-400 hover:text-indigo-400 rounded-xl border border-slate-800/80 transition-all cursor-pointer hidden lg:flex"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4 text-amber-500" />
                : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className="p-2 hover:bg-slate-800/60 text-slate-400 hover:text-indigo-400 rounded-xl border border-slate-800/80 transition-all cursor-pointer"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4 text-amber-500" />
                : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
            <button
              onClick={() => setIsNewAppOpen(true)}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white"
              aria-label="New Application"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="p-4 flex-1 space-y-2.5 flex flex-row lg:flex-col justify-around lg:justify-start overflow-x-auto lg:overflow-x-visible">
          <button
            onClick={() => setActiveSidebarTab('applications')}
            className={`flex items-center gap-3 p-3 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all whitespace-nowrap ${
              activeSidebarTab === 'applications'
                ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>Applications</span>
          </button>

          <button
            onClick={() => setActiveSidebarTab('resume-builder')}
            className={`flex items-center gap-3 p-3 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all whitespace-nowrap ${
              activeSidebarTab === 'resume-builder'
                ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Resume Builder</span>
          </button>

          {user && (
            <button
              onClick={() => setIsProfileOpen(true)}
              className="lg:hidden flex items-center gap-3 p-3 rounded-xl text-xs sm:text-sm font-bold tracking-tight text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 transition-all shrink-0"
              aria-label="My Profile"
            >
              <User className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Profile</span>
            </button>
          )}
        </nav>

        {/* User block — button for accessibility (fixes issue 3.8) */}
        <button
          type="button"
          onClick={() => {
            if (user) setIsProfileOpen(true);
            else {
              setIsGuest(false);
              localStorage.removeItem('hiretrack_is_guest');
            }
          }}
          className="hidden lg:flex p-6 border-t border-slate-800 items-center justify-between mt-auto bg-slate-950/40 hover:bg-slate-900/60 transition-all cursor-pointer w-full text-left"
          aria-label={user ? 'Open profile' : 'Sign in'}
        >
          <div className="flex items-center gap-3.5 w-full">
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Avatar"
                className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0">
                <User className="w-5 h-5 text-indigo-400" />
              </div>
            )}
            <div className="min-w-0 flex-1 flex justify-between items-center gap-1">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-100 truncate">
                  {user ? (user.user_metadata?.full_name || user.email?.split('@')[0]) : 'Guest Developer'}
                </p>
                <p className="text-[10px] text-slate-400 font-mono uppercase truncate">
                  {user ? 'Cloud Workspace' : 'Offline Sandbox'}
                </p>
              </div>
              {user ? (
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await supabase!.auth.signOut();
                  }}
                  className="p-1.5 hover:bg-slate-800 text-rose-400 hover:text-rose-300 rounded-lg transition shrink-0"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsGuest(false);
                    localStorage.removeItem('hiretrack_is_guest');
                  }}
                  className="p-1.5 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 rounded-lg transition shrink-0"
                  aria-label="Sign in"
                >
                  <LogIn className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </button>
      </aside>

      {/* ── MAIN CONTENT ───────────────────────────────────── */}
      <main className="flex-1 lg:ml-64 p-4 md:p-8 lg:p-10 pb-24 overflow-x-hidden">

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

        {/* ── APPLICATIONS TAB ─── */}
        {activeSidebarTab === 'applications' && (
          <div className="space-y-4" id="tab-applications-view">
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
                  onClick={handleExportData}
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

            <StatsGrid applications={applications} />

            <AnimatePresence initial={false}>
              {showTelemetry && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
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
        )}

        {/* ── RESUME BUILDER TAB ─── */}
        {activeSidebarTab === 'resume-builder' && (
          <div id="tab-resume-builder-view">
            <ResumeBuilder />
          </div>
        )}

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
