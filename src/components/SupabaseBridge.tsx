import React, { useState } from 'react';
import { 
  Database, 
  Server, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  RefreshCw, 
  ArrowUpRight, 
  Info, 
  Sparkles,
  User,
  Lock,
  Mail,
  LogIn,
  LogOut,
  UserPlus,
  ShieldCheck
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { supabaseService } from '../lib/supabaseService';
import { JobApplication } from '../types';

interface SupabaseBridgeProps {
  applications: JobApplication[];
  onSyncComplete: (updatedApps: JobApplication[]) => void;
  onRefreshFromCloud: () => Promise<void>;
  user?: any;
}

export function SupabaseBridge({ applications, onSyncComplete, onRefreshFromCloud, user }: SupabaseBridgeProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auth States
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';

  const sqlSchema = `-- 1. Execute this in your Supabase SQL Editor to create or update the table with relational user mapping
create table if not exists public.job_applications (
  "id" text primary key,
  "companyName" text not null,
  "targetRole" text not null,
  "workModel" text not null,
  "location" text,
  "salaryRange" text,
  "otherBenefits" text,
  "hrContact" text,
  "appliedVia" text not null,
  "resumeLink" text,
  "portfolioLink" text,
  "keyJdRequirements" text,
  "currentStatus" text not null,
  "phases" jsonb not null default '[]'::jsonb,
  "postMortem" jsonb not null default '{}'::jsonb,
  "createdAt" text not null,
  "userId" uuid references auth.users(id) on delete cascade -- Relational foreign key linked directly to Supabase Auth users
);

-- If you already have the table, you can run this block to migrate and add the relational userId column:
-- alter table public.job_applications add column if not exists "userId" uuid references auth.users(id) on delete cascade;

-- 2. Enable Row Level Security (RLS) for enterprise-grade privacy and data isolation
alter table public.job_applications enable row level security;

-- 3. Create RLS Policies to automatically isolate and protect user-specific data
drop policy if exists "Users can view own applications" on public.job_applications;
create policy "Users can view own applications" 
  on public.job_applications for select 
  using (auth.uid() = "userId" or "userId" is null);

drop policy if exists "Users can insert own applications" on public.job_applications;
create policy "Users can insert own applications" 
  on public.job_applications for insert 
  with check (auth.uid() = "userId" or "userId" is null);

drop policy if exists "Users can update own applications" on public.job_applications;
create policy "Users can update own applications" 
  on public.job_applications for update 
  using (auth.uid() = "userId" or "userId" is null)
  with check (auth.uid() = "userId" or "userId" is null);

drop policy if exists "Users can delete own applications" on public.job_applications;
create policy "Users can delete own applications" 
  on public.job_applications for delete 
  using (auth.uid() = "userId" or "userId" is null);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Google OAuth Popup Trigger
  const handleGoogleAuth = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Open authorization popup window directly (safe for cross-origin iframe embedding!)
        const popup = window.open(data.url, 'supabase_oauth_popup', 'width=600,height=700');
        if (!popup) {
          setAuthError("Popup was blocked by your browser. Please allow popups for this site and try again.");
        }
      } else {
        throw new Error("No OAuth URL returned from Supabase.");
      }
    } catch (err: any) {
      setAuthError(err.message || "An error occurred starting Google sign-in.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Email & Password Auth Handlers
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) return;
    if (!authEmail || !authPassword) {
      setAuthError("Please provide both email and password.");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        
        if (data.user && data.session === null) {
          setAuthSuccess("Sign up successful! Please check your email to confirm your account.");
        } else {
          setAuthSuccess("Account created and signed in successfully!");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        setAuthSuccess("Signed in successfully!");
      }
      
      // Clear inputs
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed. Double check your credentials.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setAuthSuccess("Signed out successfully. Reverted to local sandbox mode.");
    } catch (err: any) {
      setAuthError(err.message || "Failed to sign out.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSyncToCloud = async () => {
    if (applications.length === 0) {
      setSyncMessage({ type: 'error', text: 'No local applications to sync.' });
      return;
    }

    setIsSyncing(true);
    setSyncMessage(null);

    try {
      // Pass user ID if logged in to link the opportunities to this user
      const success = await supabaseService.bulkSync(applications, user?.id);
      if (success) {
        setSyncMessage({ 
          type: 'success', 
          text: `Successfully synchronized ${applications.length} applications to your cloud-backed workspace!` 
        });
        
        // Retrieve fresh user-scoped state to make sure all is in sync
        const fresh = await supabaseService.fetchApplications(user?.id);
        if (fresh) {
          onSyncComplete(fresh);
        }
      } else {
        setSyncMessage({ 
          type: 'error', 
          text: 'Sync failed. Ensure your table schema is created and your credentials are correct.' 
        });
      }
    } catch (err: any) {
      console.error(err);
      setSyncMessage({ 
        type: 'error', 
        text: `Sync error: ${err.message || 'Please verify that you executed the SQL schema script in your Supabase SQL Editor.'}` 
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    setSyncMessage(null);
    try {
      await onRefreshFromCloud();
      setSyncMessage({ type: 'success', text: 'Browser cache synchronized with cloud database successfully!' });
    } catch (err: any) {
      setSyncMessage({ type: 'error', text: `Failed to fetch: ${err.message || 'Database connection error.'}` });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in" id="supabase-bridge-view">
      
      {/* Header Panel */}
      <header className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-display text-white tracking-tight flex items-center gap-2.5">
            <Database className="w-8 h-8 text-indigo-400" />
            Supabase Cloud Bridge
          </h1>
          <p className="text-slate-400 text-sm font-medium mt-1">
            Secure cloud identity, multi-user accounts, and relational database pipeline tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold font-mono">Deployment target:</span>
          <a 
            href="https://job-application-tracker-sigma-liard.vercel.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs bg-slate-900 border border-slate-800 text-indigo-400 hover:text-indigo-300 px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition animate-pulse"
          >
            <span>Vercel Live App</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Grid Layout: Status Overview & Action Center */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Authentication Panel & Sync Center */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* USER CLOUD IDENTITY & AUTHENTICATION */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden space-y-6">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-indigo-500/10 filter blur-3xl opacity-30 pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                Cloud Authentication
              </span>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                user 
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40' 
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}>
                {user ? "Session Active" : "Offline Sandbox"}
              </span>
            </div>

            {/* Profile view if logged in */}
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                  {user.user_metadata?.avatar_url ? (
                    <img 
                      src={user.user_metadata.avatar_url} 
                      alt="Avatar" 
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-700"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700">
                      <User className="w-6 h-6 text-indigo-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-100 truncate">
                      {user.user_metadata?.full_name || "Cloud Developer"}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    You are signed in! Your job applications are now saved privately to your personal Supabase cloud profile.
                  </p>
                </div>

                <button
                  onClick={handleSignOut}
                  disabled={authLoading}
                  className="w-full py-2.5 px-4 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-rose-400 hover:text-rose-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Account</span>
                </button>
              </div>
            ) : (
              /* Auth Forms if logged out */
              <div className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-100">Unlock Cloud Workspace</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Log in to save opportunities to PostgreSQL and track pipelines across all your devices.
                  </p>
                </div>

                {/* Google Auth Button (Popup Optimized) */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={authLoading || !isSupabaseConfigured}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-3 transition-all cursor-pointer ${
                    isSupabaseConfigured
                      ? 'bg-white hover:bg-slate-100 text-slate-950 shadow-md hover:shadow-lg'
                      : 'bg-slate-850 text-slate-600 border border-slate-800 cursor-not-allowed'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Sign In with Google</span>
                </button>

                <div className="flex items-center gap-3">
                  <div className="h-px bg-slate-800 flex-1" />
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest font-mono">OR EMAIL</span>
                  <div className="h-px bg-slate-800 flex-1" />
                </div>

                {/* Email Signup/Login form */}
                <form onSubmit={handleEmailAuth} className="space-y-3.5">
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input 
                        type="email" 
                        placeholder="your@email.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        disabled={authLoading || !isSupabaseConfigured}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                      <input 
                        type="password" 
                        placeholder="••••••••"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        disabled={authLoading || !isSupabaseConfigured}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {authError && (
                    <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-xl text-[11px] text-rose-300 leading-relaxed">
                      {authError}
                    </div>
                  )}

                  {authSuccess && (
                    <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-[11px] text-emerald-300 leading-relaxed">
                      {authSuccess}
                    </div>
                  )}

                  <div className="pt-1 flex flex-col gap-2.5">
                    <button
                      type="submit"
                      disabled={authLoading || !isSupabaseConfigured}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      {authLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : isSignUp ? (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Create Developer Account</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" />
                          <span>Sign In to Account</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setAuthError(null);
                        setAuthSuccess(null);
                      }}
                      disabled={authLoading || !isSupabaseConfigured}
                      className="text-center text-[11px] text-slate-400 hover:text-indigo-400 transition cursor-pointer font-medium"
                    >
                      {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up Now"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Connection Status & Control */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl space-y-6 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full filter blur-3xl opacity-10 transition-colors ${
              isSupabaseConfigured ? 'bg-emerald-500' : 'bg-amber-500'
            }`} />

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Database Syncer
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  isSupabaseConfigured ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]'
                }`} />
                <span className={`text-xs font-black uppercase ${
                  isSupabaseConfigured ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {isSupabaseConfigured ? 'Connected' : 'Local Sandbox'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold font-display text-white">
                {isSupabaseConfigured ? 'PostgreSQL Backend Persistence' : 'Offline Mode Only'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isSupabaseConfigured 
                  ? (user 
                      ? "Cloud sync is unlocked! You can push local offline tracks into PostgreSQL or retrieve existing tracks." 
                      : "Cloud sync is locked. Log in above with Google or email to persistent records under your account.")
                  : 'Currently relying on local browser cache persistence. If you clear cookies or use another browser, data will reset. Configure credentials to unlock.'}
              </p>
            </div>

            {isSupabaseConfigured && (
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 font-mono text-[10px] text-slate-400 break-all space-y-1">
                <span className="text-slate-600 block uppercase font-bold text-[8px] tracking-wider">PROJECT INSTANCE URL</span>
                <span>{supabaseUrl}</span>
              </div>
            )}

            {/* Sync operations */}
            <div className="space-y-3 pt-4 border-t border-slate-800/60">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                Sync Operations
              </span>

              {/* Push local data to cloud */}
              <button
                onClick={handleSyncToCloud}
                disabled={isSyncing || !isSupabaseConfigured}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all ${
                  isSupabaseConfigured
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/10 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/40'
                }`}
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Synchronizing Tracks...</span>
                  </>
                ) : (
                  <>
                    <Server className="w-4 h-4" />
                    <span>Sync Local Sandbox to Cloud ({applications.length})</span>
                  </>
                )}
              </button>

              {/* Refresh cache */}
              {isSupabaseConfigured && (
                <button
                  onClick={handleForceRefresh}
                  disabled={isRefreshing}
                  className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 cursor-pointer transition"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Pull Cloud Records Cache</span>
                </button>
              )}
            </div>

            {/* Status Feedback Message */}
            {syncMessage && (
              <div className={`p-4 rounded-xl text-xs border flex items-start gap-3 animate-fade-in ${
                syncMessage.type === 'success' 
                  ? 'bg-emerald-950/30 text-emerald-300 border-emerald-900/40' 
                  : 'bg-rose-950/30 text-rose-300 border-rose-900/40'
              }`}>
                {syncMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{syncMessage.text}</span>
              </div>
            )}
          </div>

          {/* Prompt/Info Banner */}
          <div className="bg-indigo-950/20 border border-indigo-900/30 p-5 rounded-2xl flex gap-3.5">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-indigo-300">Data Isolation Protection</h4>
              <p className="text-[11px] text-indigo-200/70 leading-relaxed">
                Once logged in, applications are filtered dynamically by your authenticated profile ID. This ensures your pipelines remain secure, isolated, and visible only to you.
              </p>
            </div>
          </div>
        </div>

        {/* Integration Instructions & SQL Schema (Right Side - 7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* SQL Editor card */}
          <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-xl flex flex-col">
            <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-black text-slate-300 uppercase tracking-widest font-mono">
                  Database Initialization Script
                </span>
                <span className="text-[9px] font-mono font-bold bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 px-2 py-0.5 rounded">
                  PostgreSQL
                </span>
              </div>
              <button
                onClick={handleCopySql}
                className="text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-slate-850 cursor-pointer transition font-bold"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 bg-slate-950 font-mono text-[10px] text-indigo-200/80 leading-relaxed overflow-x-auto max-h-[220px]">
              <pre>{sqlSchema}</pre>
            </div>

            <div className="p-5 bg-slate-900/50 border-t border-slate-800 text-xs text-slate-400 space-y-2">
              <p className="font-semibold text-slate-300 flex items-center gap-1">
                <Info className="w-4 h-4 text-indigo-400" />
                Where do I run this?
              </p>
              <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[11px] text-slate-400 leading-relaxed">
                <li>Log in to your <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline hover:text-indigo-300">Supabase Dashboard</a>.</li>
                <li>Select your newly created project and click on the <strong>SQL Editor</strong> tab in the sidebar.</li>
                <li>Click <strong>New query</strong>, paste the copied script directly, and hit <strong>Run</strong>.</li>
              </ol>
            </div>
          </div>

          {/* Google OAuth Provider Setup Card */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-slate-850 pb-2 flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
              Google Sign-In Provider Setup (Supabase & Google Cloud)
            </h3>
            
            <div className="space-y-4 text-xs text-slate-400 leading-relaxed">
              <p>
                To enable <strong>Google Sign-In</strong>, you need to configure Google as an Authentication Provider in both your Google Cloud Developer Console and your Supabase dashboard:
              </p>

              <div className="space-y-4 pl-1">
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold text-[11px] border border-indigo-900/40 shrink-0 mt-0.5">1</span>
                  <div>
                    <strong className="text-slate-200 block mb-0.5">Google Cloud Console Setup</strong>
                    <ul className="list-disc list-inside space-y-1.5 pl-1 text-[11px] text-slate-400 leading-relaxed">
                      <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">Google Cloud Console</a>.</li>
                      <li>Create a new project or select an existing one.</li>
                      <li>Go to <strong>APIs & Services &gt; OAuth consent screen</strong>, select <strong>External</strong>, and fill in basic fields (app name, developer email).</li>
                      <li>Go to <strong>Credentials &gt; Create Credentials &gt; OAuth client ID</strong>. Select <strong>Web Application</strong> as the application type.</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold text-[11px] border border-indigo-900/40 shrink-0 mt-0.5">2</span>
                  <div>
                    <strong className="text-slate-200 block mb-0.5">Retrieve Callback URL from Supabase</strong>
                    <ul className="list-disc list-inside space-y-1.5 pl-1 text-[11px] text-slate-400 leading-relaxed">
                      <li>Open your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">Supabase Dashboard</a>.</li>
                      <li>Go to <strong>Authentication &gt; Providers &gt; Google</strong>.</li>
                      <li>Copy the **Redirect URI** provided there (e.g. <code className="text-indigo-300 font-mono text-[10px]">https://esetdrtkuduprymgskgg.supabase.co/auth/v1/callback</code>).</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold text-[11px] border border-indigo-900/40 shrink-0 mt-0.5">3</span>
                  <div>
                    <strong className="text-slate-200 block mb-0.5">Enter Authorized Redirect URI in Google</strong>
                    <ul className="list-disc list-inside space-y-1.5 pl-1 text-[11px] text-slate-400 leading-relaxed">
                      <li>Back in Google Cloud Console, paste that Redirect URI into the <strong>Authorized redirect URIs</strong> section.</li>
                      <li>Click <strong>Create</strong> to get your **Client ID** and **Client Secret**.</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold text-[11px] border border-indigo-900/40 shrink-0 mt-0.5">4</span>
                  <div>
                    <strong className="text-slate-200 block mb-0.5">Enable Google Provider in Supabase</strong>
                    <ul className="list-disc list-inside space-y-1.5 pl-1 text-[11px] text-slate-400 leading-relaxed">
                      <li>In Supabase, enable Google, paste your Client ID and Client Secret, and save.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vercel instructions */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-slate-850 pb-2">
              Connecting your Vercel Deployment
            </h3>
            
            <div className="space-y-4 text-xs text-slate-400 leading-relaxed">
              <p>
                To bridge your Vercel-deployed application (<span className="text-slate-300 font-mono">job-application-tracker-sigma-liard.vercel.app</span>) to your Supabase tables, follow this sequence:
              </p>

              <div className="space-y-3.5 pl-1">
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold text-[11px] border border-indigo-900/40 shrink-0 mt-0.5">1</span>
                  <div>
                    <strong className="text-slate-200 block mb-0.5">Gather Supabase credentials</strong>
                    <span>In your Supabase project, navigate to <strong>Settings &gt; API</strong> and copy your <strong>Project URL</strong> and <strong>anon (public) API key</strong>.</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold text-[11px] border border-indigo-900/40 shrink-0 mt-0.5">2</span>
                  <div>
                    <strong className="text-slate-200 block mb-0.5">Add environment variables in Vercel</strong>
                    <span>Go to your <strong>Vercel Dashboard</strong>, click your project, select <strong>Settings &gt; Environment Variables</strong>, and add:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 font-mono text-[10px] text-indigo-300">
                      <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                        <span className="text-slate-500 font-bold block text-[8px] tracking-wider mb-0.5">VARIABLE KEY 1</span>
                        <span>VITE_SUPABASE_URL</span>
                      </div>
                      <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                        <span className="text-slate-500 font-bold block text-[8px] tracking-wider mb-0.5">VARIABLE KEY 2</span>
                        <span>VITE_SUPABASE_ANON_KEY</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold text-[11px] border border-indigo-900/40 shrink-0 mt-0.5">3</span>
                  <div>
                    <strong className="text-slate-200 block mb-0.5">Re-deploy on Vercel</strong>
                    <span>Because environment variables are built into the production client bundle at compilation time, you must <strong>trigger a deployment/redeploy</strong> on Vercel to bind these keys successfully. Once complete, your site will operate dynamically with Supabase!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
