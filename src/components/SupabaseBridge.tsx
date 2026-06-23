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
  Sparkles
} from 'lucide-react';
import { isSupabaseConfigured } from '../supabaseClient';
import { supabaseService } from '../lib/supabaseService';
import { JobApplication } from '../types';

interface SupabaseBridgeProps {
  applications: JobApplication[];
  onSyncComplete: (updatedApps: JobApplication[]) => void;
  onRefreshFromCloud: () => Promise<void>;
}

export function SupabaseBridge({ applications, onSyncComplete, onRefreshFromCloud }: SupabaseBridgeProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';

  const sqlSchema = `-- 1. Execute this in your Supabase SQL Editor to create the table
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
  "createdAt" text not null
);

-- 2. Disable Row Level Security (RLS) for testing or basic access,
-- or configure a public insert/update policy.
alter table public.job_applications disable row level security;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncToCloud = async () => {
    if (applications.length === 0) {
      setSyncMessage({ type: 'error', text: 'No local applications to sync.' });
      return;
    }

    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const success = await supabaseService.bulkSync(applications);
      if (success) {
        setSyncMessage({ 
          type: 'success', 
          text: `Successfully synced ${applications.length} applications from your local browser storage to Supabase!` 
        });
        // Retrieve fresh state to make sure all is in sync
        const fresh = await supabaseService.fetchApplications();
        if (fresh) {
          onSyncComplete(fresh);
        }
      } else {
        setSyncMessage({ 
          type: 'error', 
          text: 'Sync failed. Ensure your table schema is created and double check your Vercel/local variables.' 
        });
      }
    } catch (err: any) {
      console.error(err);
      setSyncMessage({ 
        type: 'error', 
        text: `Sync error: ${err.message || 'Please verify that you executed the SQL script in Supabase first.'}` 
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
      setSyncMessage({ type: 'success', text: 'Cache synchronized with Supabase cloud storage successfully!' });
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
            Link your local developer tracking records with your cloud-hosted Supabase PostgreSQL instance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold font-mono">Deployment target:</span>
          <a 
            href="https://job-application-tracker-sigma-liard.vercel.app/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs bg-slate-900 border border-slate-800 text-indigo-400 hover:text-indigo-300 px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition"
          >
            <span>Vercel Live App</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Grid Layout: Status Overview & Action Center */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Connection Status & Control (Left Side) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 shadow-xl space-y-6 relative overflow-hidden">
            {/* Absolute accent circle */}
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full filter blur-3xl opacity-10 transition-colors ${
              isSupabaseConfigured ? 'bg-emerald-500' : 'bg-amber-500'
            }`} />

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Connection Status
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
              <h3 className="text-xl font-bold font-display text-white">
                {isSupabaseConfigured ? 'Cloud Backend Sync Active' : 'Offline Mode Only'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isSupabaseConfigured 
                  ? `Your application is bridged with your Supabase schema! Opportunities are saved directly to PostgreSQL.` 
                  : 'Currently relying on local browser cache persistence. If you clear cookies or use another browser, data will reset. Migrate to Supabase below.'}
              </p>
            </div>

            {isSupabaseConfigured && (
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 font-mono text-[10px] text-slate-400 break-all space-y-1">
                <span className="text-slate-600 block uppercase font-bold text-[8px] tracking-wider">PROJECT INSTANCE URL</span>
                <span>{supabaseUrl}</span>
              </div>
            )}

            {/* Sync and Migration Panel */}
            <div className="space-y-3 pt-4 border-t border-slate-800/60">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                Sync Operations
              </span>

              {/* Local Storage migrate button */}
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
                    <span>Migrating Data...</span>
                  </>
                ) : (
                  <>
                    <Server className="w-4 h-4" />
                    <span>Push Local State to Supabase ({applications.length} apps)</span>
                  </>
                )}
              </button>

              {/* Refresh from cloud button */}
              {isSupabaseConfigured && (
                <button
                  onClick={handleForceRefresh}
                  disabled={isRefreshing}
                  className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 cursor-pointer transition"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh Cloud Data Cache</span>
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
              <h4 className="text-xs font-bold text-indigo-300">Data Preservation Shield</h4>
              <p className="text-[11px] text-indigo-200/70 leading-relaxed">
                By design, our database bridge uses a zero-loss schema. Synced local records map perfectly into Supabase without losing any of your 7-phase details, pros, cons, or key requirements.
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
