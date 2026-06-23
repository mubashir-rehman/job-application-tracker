import React, { useState, useEffect } from 'react';
import { JobApplication } from './types';
import { INITIAL_APPLICATIONS } from './data';
import { StatsGrid } from './components/StatsGrid';
import { ApplicationTable } from './components/ApplicationTable';
import { DetailSlideOver } from './components/DetailSlideOver';
import { NewApplicationModal } from './components/NewApplicationModal';
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
  BookOpen
} from 'lucide-react';

export default function App() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [isNewAppOpen, setIsNewAppOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'dashboard' | 'matrix' | 'about'>('dashboard');

  // Load from local storage or fall back to mock data
  useEffect(() => {
    const saved = localStorage.getItem('hiretrack_applications');
    if (saved) {
      try {
        setApplications(JSON.parse(saved));
      } catch (e) {
        console.error("Error reading saved applications, restoring defaults", e);
        setApplications(INITIAL_APPLICATIONS);
      }
    } else {
      setApplications(INITIAL_APPLICATIONS);
    }
  }, []);

  // Save to local storage on changes
  const saveApplications = (updatedList: JobApplication[]) => {
    setApplications(updatedList);
    localStorage.setItem('hiretrack_applications', JSON.stringify(updatedList));

    // Update selected app if it was open
    if (selectedApplication) {
      const freshSelected = updatedList.find(app => app.id === selectedApplication.id);
      if (freshSelected) {
        setSelectedApplication(freshSelected);
      }
    }
  };

  // Add Application
  const handleAddApplication = (newApp: JobApplication) => {
    const updated = [newApp, ...applications];
    saveApplications(updated);
  };

  // Update Application (Sync from slide over details)
  const handleUpdateApplication = (updatedApp: JobApplication) => {
    const updated = applications.map(app => app.id === updatedApp.id ? updatedApp : app);
    saveApplications(updated);
  };

  // Delete Application
  const handleDeleteApplication = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this job application track?')) {
      const updated = applications.filter(app => app.id !== id);
      saveApplications(updated);
      if (selectedApplication?.id === id) {
        setSelectedApplication(null);
      }
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

  return (
    <div className="ambient-bg min-h-screen text-slate-800 font-sans flex flex-col lg:flex-row">
      
      {/* 1. SIDEBAR NAVIGATION */}
      <aside className="w-full lg:w-64 bg-slate-900 text-white lg:fixed lg:h-full flex flex-col z-40 border-r border-slate-800 shadow-xl" id="sidebar">
        {/* Logo/Branding Block */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center lg:block">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center font-black tracking-tighter text-white font-display shadow-lg shadow-indigo-500/20">
              HT
            </div>
            <div>
              <span className="text-lg font-black tracking-tight font-display block leading-none">HireTrack<span className="text-indigo-400">.pro</span></span>
              <span className="text-[9px] text-indigo-300 font-mono tracking-widest uppercase mt-1 block">Developer Suite</span>
            </div>
          </div>

          <button 
            onClick={() => setIsNewAppOpen(true)}
            className="lg:hidden p-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white"
            title="New Application"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="p-4 flex-1 space-y-2.5 flex flex-row lg:flex-col justify-around lg:justify-start overflow-x-auto lg:overflow-x-visible">
          <button
            onClick={() => setActiveSidebarTab('dashboard')}
            className={`flex items-center gap-3 w-full p-3 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all ${
              activeSidebarTab === 'dashboard' 
                ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
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
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <BrainCircuit className="w-4.5 h-4.5" />
            <span>Technical Skill Matrix</span>
          </button>

          <button
            onClick={() => setActiveSidebarTab('about')}
            className={`flex items-center gap-3 w-full p-3 rounded-xl text-xs sm:text-sm font-bold tracking-tight transition-all ${
              activeSidebarTab === 'about' 
                ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <BookOpen className="w-4.5 h-4.5" />
            <span>Developer Guide</span>
          </button>
        </nav>

        {/* User Block at bottom */}
        <div className="hidden lg:flex p-6 border-t border-slate-800 items-center justify-between mt-auto bg-slate-950/40">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
              <User className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100">Senior Staff Engineer</p>
              <p className="text-[10px] text-slate-400 font-mono uppercase">Local Workspace</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. MAIN APPLICATION CONTENT AREA */}
      <main className="flex-1 lg:ml-64 p-4 md:p-8 lg:p-10 pb-24 overflow-x-hidden">
        
        {/* DASHBOARD TAB */}
        {activeSidebarTab === 'dashboard' && (
          <div className="space-y-8" id="tab-dashboard-view">
            {/* Upper Header Row */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/50 pb-6">
              <div>
                <h1 className="text-3xl font-black font-display text-slate-900 tracking-tight flex items-center gap-2">
                  Application Pipeline
                </h1>
                <p className="text-slate-500 text-sm font-medium mt-1">
                  Tracking active developer interviews, logistics, and feedback cycles.
                </p>
              </div>

              {/* Action Suite */}
              <div className="flex items-center gap-3.5 w-full sm:w-auto">
                <button
                  onClick={handleExportData}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs border border-slate-200/80 shadow-sm flex items-center gap-1.5 transition-all w-1/2 sm:w-auto justify-center cursor-pointer"
                  title="Export tracking JSON for Phase 2 Supabase Import"
                >
                  <Download className="w-4 h-4 text-slate-400" />
                  <span>Export JSON</span>
                </button>

                <button
                  onClick={() => setIsNewAppOpen(true)}
                  id="add-application-main-btn"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-500/10 hover:shadow flex items-center gap-1.5 transition-all w-1/2 sm:w-auto justify-center cursor-pointer"
                >
                  <Plus className="w-4.5 h-4.5" />
                  <span>New Application</span>
                </button>
              </div>
            </header>

            {/* Metrics cards dynamic state */}
            <StatsGrid applications={applications} />

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
            <header className="border-b border-slate-200/50 pb-6">
              <h1 className="text-3xl font-black font-display text-slate-900 tracking-tight">Technical Skill Matrix</h1>
              <p className="text-slate-500 text-sm font-medium mt-1">
                Refine key engineering topics extracted from target Job Spec (JD) requirements.
              </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: CUDA / High-Performance */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-extrabold text-slate-800 text-base">HPC & CUDA Optimizations</h3>
                  </div>
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100">GPU Core</span>
                </div>
                
                <p className="text-xs text-slate-500 leading-relaxed">
                  Review requirements logged in job specs. Ensure competence in:
                </p>

                <ul className="space-y-2.5 text-xs text-slate-600">
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
              <div className="glass-panel p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-extrabold text-slate-800 text-base">Distributed Backend Ledgers</h3>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">Systems</span>
                </div>
                
                <p className="text-xs text-slate-500 leading-relaxed">
                  Stripe-targeted & distributed platform concepts:
                </p>

                <ul className="space-y-2.5 text-xs text-slate-600">
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

        {/* DEVELOPER GUIDE TAB */}
        {activeSidebarTab === 'about' && (
          <div className="space-y-8" id="tab-guide-view">
            <header className="border-b border-slate-200/50 pb-6">
              <h1 className="text-3xl font-black font-display text-slate-900 tracking-tight">HireTrack Developer Guide</h1>
              <p className="text-slate-500 text-sm font-medium mt-1">
                A modern framework overview for tracking complex technical pipelines.
              </p>
            </header>

            <div className="glass-panel p-8 rounded-3xl border border-slate-200/60 max-w-4xl space-y-6">
              <div className="space-y-3">
                <h3 className="text-lg font-black text-slate-900">Phase 1: Glassmorphic PoC with Full State Engine</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  This local interface demonstrates both premium front-end fidelity and highly detailed data fields. All edits, 7-phase remarks, pros, cons, and self-ratings update dynamically in real-time, saved directly in your browser's persistent cache.
                </p>
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-6">
                <h3 className="text-lg font-black text-indigo-600 flex items-center gap-1.5">
                  <TrendingUp className="w-5 h-5" />
                  Transitioning to Phase 2 (Production Relational database / Supabase)
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  When you are ready to migrate to Phase 2, follow these steps:
                </p>
                <ol className="list-decimal list-inside text-xs text-slate-600 space-y-2 leading-relaxed">
                  <li>Use the <strong>"Export JSON"</strong> button to download a complete backup containing your active tracking records.</li>
                  <li>Our Phase 2 schema maps each application cleanly to a relational database table with foreign keys for the seven child-timeline stages.</li>
                  <li>Enable Supabase/Firebase Auth to authenticate logins. Each user tracks their own secure pipelines.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* 3. APPLICATION SLIDE-OVER DETAIL PANEL */}
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

    </div>
  );
}
