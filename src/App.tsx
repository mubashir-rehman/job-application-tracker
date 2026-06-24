import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { JobApplication } from './types';
import { INITIAL_APPLICATIONS } from './data';
import { StatsGrid } from './components/StatsGrid';
import { PerformanceTelemetry } from './components/PerformanceTelemetry';
import { ApplicationTable } from './components/ApplicationTable';
import { DetailSlideOver } from './components/DetailSlideOver';
import { NewApplicationModal } from './components/NewApplicationModal';
import { Footer } from './components/Footer';
import { 
  Briefcase, 
  Layers, 
  Award, 
  Plus, 
  TrendingUp, 
  Download, 
  CheckCircle2, 
  Terminal, 
  User, 
  BrainCircuit, 
  ChevronRight,
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
  EyeOff
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { supabaseService } from './lib/supabaseService';
import { LoginScreen } from './components/LoginScreen';
import { ProfileModal } from './components/ProfileModal';
import { Button } from '@/components/ui/button';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('hiretrack_theme') as 'light' | 'dark') || 'light';
  });
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [isNewAppOpen, setIsNewAppOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'dashboard' | 'matrix'>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem('hiretrack_is_guest') === 'true');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState<boolean>(() => {
    return localStorage.getItem('hiretrack_show_telemetry') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('hiretrack_show_telemetry', String(showTelemetry));
  }, [showTelemetry]);

  // Synchronize document theme class
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('hiretrack_theme', theme);
  }, [theme]);
  
  // Custom non-blocking states
  const [appToDelete, setAppToDelete] = useState<JobApplication | null>(null);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Isolate localStorage cache by user ID to prevent data leakage between sessions/guests
  const getStorageKey = () => {
    if (user) {
      return `hiretrack_applications_user_${user.id}`;
    }
    return 'hiretrack_applications_guest';
  };

  // Listen for session and popup messages
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          setIsGuest(false);
          localStorage.removeItem('hiretrack_is_guest');
        }
      });

      // Listen for auth changes
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
      // Validate origin
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('vercel.app')) {
        return;
      }
      if (event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
        if (isSupabaseConfigured && supabase) {
          supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
          });
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Check if popup callback
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
        
        try {
          window.opener.postMessage({ type: 'SUPABASE_AUTH_SUCCESS' }, '*');
        } catch (err) {
          console.error("Failed to post message to opener", err);
        }
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
        if (legacyData) {
          localStorage.setItem('hiretrack_applications_guest', legacyData);
        }
      }

      const key = getStorageKey();

      // Check if Supabase is active
      if (isSupabaseConfigured) {
        try {
          const cloudData = await supabaseService.fetchApplications(user?.id);
          if (cloudData && cloudData.length > 0) {
            setApplications(cloudData);
            // Also update local cache for quick loading next time
            localStorage.setItem(key, JSON.stringify(cloudData));
          } else {
            // Supabase is empty, check if we have local storage data to start with
            const saved = localStorage.getItem(key);
            if (saved) {
              setApplications(JSON.parse(saved));
            } else {
              // Authenticated user starts completely clean. Guest starts with mock dashboard.
              setApplications(user ? [] : INITIAL_APPLICATIONS);
            }
          }
        } catch (err: any) {
          console.error("Supabase load failed, falling back to local storage", err);
          let userFriendlyMessage = "Could not retrieve cloud data. Loading offline backup.";
          
          if (err && err.message) {
            if (err.message.includes("relation") && (err.message.includes("does not exist") || err.message.includes("not found"))) {
              userFriendlyMessage = "Supabase connection is active, but the 'job_applications' table was not found. Please refer to 'supabase/migrations/' or the project README.md to run the data[...]
            } else if ((err.message.includes("column") || err.message.includes("attribute")) && (err.message.toLowerCase().includes("userid") || err.message.toLowerCase().includes("user_id"))) {
              userFriendlyMessage = "Database Schema Error: The relational 'userId' column is missing or misconfigured in your 'job_applications' table. Please run the SQL schema migration script[...]
            } else if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError") || err.message.includes("network")) {
              userFriendlyMessage = "Network Connection Error: Unable to reach Supabase. Check your internet connection or verify VITE_SUPABASE_URL in your Vercel configurations.";
            } else if (err.message.includes("JWT") || err.message.includes("invalid") || err.message.includes("key")) {
              userFriendlyMessage = "Authentication Key Error: Your Supabase API key (anon key) is invalid or expired. Check your VITE_SUPABASE_ANON_KEY on Vercel.";
            } else {
              userFriendlyMessage = `Supabase Error: ${err.message}. Loading offline backup.`;
            }
          } else if (err && err.code) {
            userFriendlyMessage = `Supabase query failed (code ${err.code}). Loaded offline backup instead.`;
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
      const key = getStorageKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          setApplications(JSON.parse(saved));
        } catch (e) {
          console.error("Error reading saved applications, restoring defaults", e);
          setApplications(user ? [] : INITIAL_APPLICATIONS);
        }
      } else {
        setApplications(user ? [] : INITIAL_APPLICATIONS);
      }
    };

    loadData();
  }, [user]);

  // Save locally (Optimistic UI fallback cache)
  const saveLocalOnly = (updatedList: JobApplication[]) => {
    setApplications(updatedList);
    localStorage.setItem(getStorageKey(), JSON.stringify(updatedList));

    // Update selected app if it was open
    if (selectedApplication) {
      const freshSelected = updatedList.find(app => app.id === selectedApplication.id);
      if (freshSelected) {
        setSelectedApplication(freshSelected);
      }
    }
  };

  // Add Application
  const handleAddApplication = async (newApp: JobApplication) => {
    // 1. Optimistic update
    const updated = [newApp, ...applications];
    saveLocalOnly(updated);
    showToast(`Successfully added ${newApp.companyName} to your pipeline.`, 'success');

    // 2. Cloud sync if active
    if (isSupabaseConfigured) {
      try {
        await supabaseService.addApplication(newApp, user?.id);
      } catch (err) {
        console.error("Cloud save failed", err);
        showToast("Failed to save to cloud database. Saved locally in offline sandbox mode.", "warning");
      }
    }
  };

  // Update Application (Sync from slide over details)
  const handleUpdateApplication = async (updatedApp: JobApplication) => {
    // 1. Optimistic update
    const updated = applications.map(app => app.id === updatedApp.id ? updatedApp : app);
    saveLocalOnly(updated);
    showToast(`Successfully updated details for ${updatedApp.companyName}.`, 'success');

    // 2. Cloud sync if active
    if (isSupabaseConfigured) {
      try {
        await supabaseService.updateApplication(updatedApp, user?.id);
      } catch (err) {
        console.error("Cloud update failed", err);
        showToast("Failed to update on cloud database. Updated locally in offline sandbox mode.", "warning");
      }
    }
  };

  // Trigger delete confirmation modal (non-blocking)
  const handleDeleteApplication = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const app = applications.find(a => a.id === id);
    if (app) {
      setAppToDelete(app);
    }
  };

  // Execute actual deletion
  const executeDeleteApplication = async () => {
    if (!appToDelete) return;
    const id = appToDelete.id;
    const company = appToDelete.companyName;

    // 1. Optimistic update
    const updated = applications.filter(app => app.id !== id);
    saveLocalOnly(updated);
    if (selectedApplication?.id === id) {
      setSelectedApplication(null);
    }
    
    setAppToDelete(null); // Close modal instantly for seamless UI response
    showToast(`Successfully deleted ${company} from your pipeline.`, 'success');

    // 2. Cloud sync if active
    if (isSupabaseConfigured) {
      try {
        await supabaseService.deleteApplication(id, user?.id);
      } catch (err) {
        console.error("Cloud delete failed", err);
        showToast("Failed to delete from cloud database, but deleted locally in offline sandbox.", "warning");
      }
    }
  };

  // Refresh data from cloud manually
  const handleRefreshFromCloud = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const cloudData = await supabaseService.fetchApplications(user?.id);
      if (cloudData) {
        saveLocalOnly(cloudData);
      }
    } catch (err) {
      console.error("Force sync failed", err);
      throw err;
    }
  };

  // Export JSON backup for phase 2 Supabase import
  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(applications, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "hiretrack_applications_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
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
    <div className="ambient-bg min-h-screen text-slate-100/90 font-sans flex flex-col lg:flex-row">
      
      {/* 1. SIDEBAR NAVIGATION */}
      <aside className="w-full lg:w-64 bg-slate-900 text-slate-200 lg:fixed lg:h-full flex flex-col z-40 border-r border-slate-800 shadow-xl" id="sidebar">
        {/* Logo/Branding Block */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center lg:block">
          <div className="flex items-center justify-between w-full lg:mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center font-black tracking-tighter text-white font-display shadow-lg shadow-indigo-500/20">
                HT
              </div>
              <div>
                <span className="text-lg font-black tracking-tight font-display block leading-none text-slate-100">HireTrack<span className="text-indigo-400">.pro</span></span>
                <span className="text-[9px] text-indigo-300 font-mono tracking-widest uppercase mt-1 block">Developer Suite</span>
              </div>
            </div>

            {/* Desktop Theme Switcher Button */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 hover:bg-slate-800/60 text-slate-400 hover:text-indigo-400 rounded-xl border border-slate-800/80 transition-all cursor-pointer hidden lg:flex"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500 dark:text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
            </button>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            {/* Mobile Theme Switcher */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 hover:bg-slate-800/60 text-slate-400 hover:text-indigo-400 rounded-xl border border-slate-800/80 transition-all cursor-pointer"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500 dark:text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
            </button>

            <button 
              onClick={() => setIsNewAppOpen(true)}
              className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white"
              title="New Application"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="p-4 flex-1 space-y-2.5 flex flex-row lg:flex-col justify-around lg:justify-start overflow-x-auto lg:overflow-x-visible">
          <button
            onClick={() => setActiveSidebarTab('dashboard')}
            className={`flex items-center gap-3 w-full p-3 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all ${
              activeSidebarTab === 'dashboard' 
                ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
            }`}
          >
            <Layers className="w-4.5 h-4.5" />
            <span>Dashboard Pipeline</span>
          </button>

          <button
            onClick={() => setActiveSidebarTab('matrix')}
            className={`flex items-center gap-3 w-full p-3 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all ${
              activeSidebarTab === 'matrix' 
                ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
            }`}
          >
            <BrainCircuit className="w-4.5 h-4.5" />
            <span>Technical Skill Matrix</span>
          </button>



          {user && (
            <button
              onClick={() => setIsProfileOpen(true)}
              className="lg:hidden flex items-center gap-3 p-3 rounded-xl text-xs sm:text-sm font-bold tracking-tight text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 transition-all shri[...]
              title="My Profile"
            >
              <User className="w-4.5 h-4.5 text-indigo-400" />
              <span>Profile</span>
            </button>
          )}
        </nav>

        {/* User Block at bottom */}
        <div 
          onClick={() => {
            if (user) {
              setIsProfileOpen(true);
            } else {
              setIsGuest(false);
              localStorage.removeItem('hiretrack_is_guest');
            }
          }}
          className="hidden lg:flex p-6 border-t border-slate-800 items-center justify-between mt-auto bg-slate-950/40 hover:bg-slate-900/60 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3.5 w-full">
            {user?.user_metadata?.avatar_url ? (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="Avatar" 
                className="w-10 h-10 rounded-xl object-cover border border-slate-700"
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
                  {user ? (user.user_metadata?.full_name || user.email?.split('@')[0]) : "Guest Developer"}
                </p>
                <p className="text-[10px] text-slate-400 font-mono uppercase truncate">
                  {user ? "Cloud Workspace" : "Offline Sandbox"}
                </p>
              </div>
              {user ? (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await supabase.auth.signOut();
                  }}
                  className="p-1.5 hover:bg-slate-800 text-rose-400 hover:text-rose-300 rounded-lg transition shrink-0"
                  title="Sign Out of Cloud"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsGuest(false);
                    localStorage.removeItem('hiretrack_is_guest');
                  }}
                  className="p-1.5 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 rounded-lg transition shrink-0"
                  title="Sign In / Setup Cloud"
                >
                  <LogIn className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* 2. MAIN APPLICATION CONTENT AREA */}
      <main className="flex-1 lg:ml-64 p-4 md:p-8 lg:p-10 pb-24 overflow-x-hidden">
        
        {isLoading && (
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-6 max-w-sm animate-pulse">
            <RefreshCw className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400 animate-spin" />
            <span className="text-xs font-bold text-slate-300">Synchronizing database with Supabase cloud...</span>
          </div>
        )}

        {dbError && (
          <div className="bg-slate-900 border border-amber-500/30 p-5 rounded-2xl text-xs text-slate-300 mb-6 max-w-2xl shadow-lg flex flex-col sm:flex-row items-start gap-3.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <span className="font-bold text-amber-600 dark:text-amber-400 block uppercase tracking-wider text-[10px]">Cloud Connection Status</span>
              <p className="leading-relaxed font-medium">{dbError}</p>
            </div>
          </div>
        )}
        
        {/* DASHBOARD TAB */}
        {activeSidebarTab === 'dashboard' && (
          <div className="space-y-8" id="tab-dashboard-view">
            {/* Upper Header Row */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-6">
              <div>
                <h1 className="text-3xl font-black font-display text-slate-100 tracking-tight flex flex-wrap items-center gap-3">
                  <span>Application Pipeline</span>
                  <button
                    onClick={() => setShowTelemetry(!showTelemetry)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl border border-[...]
                    title={showTelemetry ? "Hide Analytics Dashboard" : "Show Analytics Dashboard"}
                  >
                    {showTelemetry ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showTelemetry ? "Hide Telemetry" : "Show Telemetry"}</span>
                  </button>
                </h1>
                <p className="text-slate-400 text-sm font-medium mt-1">
                  Tracking active developer interviews, logistics, and feedback cycles.
                </p>
              </div>

              {/* Action Suite */}
              <div className="flex items-center gap-3.5 w-full sm:w-auto">
                <Button
                  onClick={handleExportData}
                  variant="outline"
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-200 rounded-xl font-bold text-xs border border-slate-800 shadow-sm flex items-center gap-1.5 transition-all w-1[...]
                  title="Export tracking JSON for Phase 2 Supabase Import"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>Export JSON</span>
                </Button>

                <Button
                  onClick={() => setIsNewAppOpen(true)}
                  id="add-application-main-btn"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-500/10 hover:shadow flex items-center gap-1.5 transitio[...]
                >
                  <Plus className="w-4.5 h-4.5" />
                  <span>New Application</span>
                </Button>
              </div>
            </header>

            {/* Metrics cards dynamic state */}
            <StatsGrid applications={applications} />

            {/* Candidate Performance Index & System Telemetry */}
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

            {/* Pipeline search, multi filter, table-grid list */}
            <ApplicationTable 
              applications={applications} 
              onSelectApplication={setSelectedApplication}
              onDeleteApplication={handleDeleteApplication}
            />
          </div>
        )}

        {/* SKILL MATRIX TAB */}
        {activeSidebarTab === 'matrix' && (
          <div className="space-y-8" id="tab-matrix-view">
            <header className="border-b border-slate-800 pb-6">
              <h1 className="text-3xl font-black font-display text-slate-100 tracking-tight">Technical Skill Matrix</h1>
              <p className="text-slate-400 text-sm font-medium mt-1">
                Refine key engineering topics extracted from target Job Spec (JD) requirements.
              </p>
            </header>
 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: CUDA / High-Performance */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-extrabold text-slate-100 text-base">HPC & CUDA Optimizations</h3>
                  </div>
                  <span className="text-[10px] font-bold bg-indigo-100/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-200/50 dark:border-in[...]
                </div>
                
                <p className="text-xs text-slate-400 leading-relaxed">
                  Review requirements logged in job specs. Ensure competence in:
                </p>
 
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Memory Hierarchy: Shared memory banks, global memory coalescence, and L1/L2 caching.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Warp Execution Mechanics: Thread divergent branch avoidance and instruction latency hiding.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Profiler Analysis: Utilizing Nsight Compute and Systems for bottleneck discovery.</span>
                  </li>
                </ul>
              </div>
 
              {/* Card 2: Distributed Systems */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-extrabold text-slate-100 text-base">Distributed Backend Ledgers</h3>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-100/70 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-200/50 dark:border-blue-900/40"[...]
                </div>
                
                <p className="text-xs text-slate-400 leading-relaxed">
                  Stripe-targeted & distributed platform concepts:
                </p>
 
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Idempotency Keys: Designing database unique indices and Redis key expiry loops for payments.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Replication and Consensus: Raft, Paxos, and active-active multi-region synchronization trade-offs.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Isolation Levels: Understanding Dirty Reads, Phantom Reads, and Postgres Serialized transactions.</span>
                  </li>
                </ul>
              </div>

            </div>
          </div>
        )}

        {/* Footer with Credits and Links */}
        <Footer />

      </main>

      {/* 3. CENTERED DETAILED JOB APPLICATION DIALOG */}
      <DetailSlideOver 
        application={selectedApplication}
        isOpen={selectedApplication !== null}
        onClose={() => setSelectedApplication(null)}
        onUpdateApplication={handleUpdateApplication}
      />

      {/* 4. NEW APPLICATION MODAL */}
      <NewApplicationModal 
        isOpen={isNewAppOpen}
        onClose={() => setIsNewAppOpen(false)}
        onAddApplication={handleAddApplication}
      />

      {/* 5. USER PROFILE MODAL */}
      <ProfileModal 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
      />

      {/* 6. NON-BLOCKING CUSTOM DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {appToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAppToDelete(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative w-full max-w-md glass-panel p-6 rounded-2xl border border-rose-950 bg-slate-900 shadow-xl overflow-hidden"
              id="delete-confirm-modal"
            >
              <div className="flex items-center gap-3 text-rose-400 mb-4">
                <div className="p-2.5 bg-rose-950/50 rounded-xl border border-rose-900/30">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-100 text-lg tracking-tight">Delete Tracking Record?</h3>
                  <p className="text-xs text-rose-400 font-medium">This operation cannot be reversed.</p>
                </div>
              </div>

              <div className="space-y-3.5 mb-6">
                <p className="text-sm text-slate-300 leading-relaxed">
                  Are you sure you want to permanently remove <strong className="text-slate-100 font-extrabold">{appToDelete.companyName}</strong> ({appToDelete.targetRole}) from your recruitment[...]
                </p>
                {isSupabaseConfigured && user && (
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
                    <Database className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>This will delete the record from both local cache and active Supabase Cloud.</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setAppToDelete(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700/80 text-slate-300 rounded-xl font-bold text-xs transition cursor-pointer"
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

      {/* 7. TOAST NOTIFICATIONS */}
      <div className="fixed bottom-6 right-6 z-[110] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              className={`p-4 rounded-xl shadow-lg border flex items-start gap-3 pointer-events-auto backdrop-blur-md ${
                toast.type === 'success'
                  ? 'bg-slate-950/95 border-emerald-950/80 text-slate-100 shadow-emerald-950/10'
                  : toast.type === 'error'
                  ? 'bg-slate-950/95 border-rose-950/80 text-slate-100 shadow-rose-950/10'
                  : toast.type === 'warning'
                  ? 'bg-slate-950/95 border-amber-950/80 text-slate-100 shadow-amber-950/10'
                  : 'bg-slate-950/95 border-indigo-950/80 text-slate-100 shadow-indigo-950/10'
              }`}
            >
              <div className="flex-1 text-xs font-semibold leading-relaxed">
                {toast.message}
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-slate-400 hover:text-white transition p-0.5 rounded-md hover:bg-slate-800"
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
