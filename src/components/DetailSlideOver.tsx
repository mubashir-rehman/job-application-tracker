import { useState, useEffect } from 'react';
import { JobApplication, InterviewPhase, WorkModelType, AppliedViaType } from '../types';
import { 
  X, 
  Calendar, 
  ExternalLink, 
  Award, 
  CheckCircle2, 
  Circle, 
  Star, 
  Save, 
  Database, 
  Info, 
  Layers, 
  ListChecks, 
  Clock, 
  ThumbsUp, 
  ThumbsDown, 
  Flame, 
  BookOpen, 
  ArrowRight,
  TrendingUp,
  Play
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DetailSlideOverProps {
  application: JobApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateApplication: (app: JobApplication) => void;
}

export function DetailSlideOver({ application, isOpen, onClose, onUpdateApplication }: DetailSlideOverProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'core' | 'mortem'>('timeline');
  const [editedApp, setEditedApp] = useState<JobApplication | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Sync state with selected application
  useEffect(() => {
    if (application) {
      setEditedApp(JSON.parse(JSON.stringify(application))); // deep clone
      setIsSaved(false);
    } else {
      setEditedApp(null);
    }
  }, [application]);

  if (!editedApp) return null;

  const handleFieldChange = (field: keyof JobApplication, value: any) => {
    if (!editedApp) return;
    const updated = { ...editedApp, [field]: value };
    setEditedApp(updated);
  };

  const handlePhaseChange = (index: number, key: keyof InterviewPhase, value: any) => {
    if (!editedApp) return;
    const updatedPhases = [...editedApp.phases];
    updatedPhases[index] = { ...updatedPhases[index], [key]: value };
    
    // Auto-compute current status based on the highest active or completed phase
    let computedStatus = editedApp.currentStatus;
    if (key === 'status') {
      if (value === 'completed' || value === 'active') {
        computedStatus = updatedPhases[index].name.replace(/^Phase \d+:\s*/, '');
      }
    }

    const updated = { 
      ...editedApp, 
      phases: updatedPhases,
      currentStatus: computedStatus
    };
    setEditedApp(updated);
  };

  const handlePostMortemChange = (key: string, value: any) => {
    if (!editedApp) return;
    const updated = {
      ...editedApp,
      postMortem: {
        ...editedApp.postMortem,
        [key]: value
      }
    };
    setEditedApp(updated);
  };

  const handleSave = () => {
    if (!editedApp) return;
    onUpdateApplication(editedApp);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('offer')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (s.includes('reject') || s.includes('archived') || s.includes('failed')) return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (s.includes('phone') || s.includes('screen')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  };

  // Determine elapsed days since application creation
  const getElapsedDays = () => {
    if (!editedApp.createdAt) return 1;
    const diff = Date.now() - new Date(editedApp.createdAt).getTime();
    return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 1);
  };

  // Static preparation resources generated dynamically based on company context
  const getInteractiveResources = () => {
    const name = editedApp.companyName.toLowerCase();
    if (name.includes('nvidia')) {
      return [
        { title: 'CUDA C Programming Guide', type: 'guide', link: 'https://docs.nvidia.com/cuda/cuda-c-programming-guide/index.html' },
        { title: 'NVIDIA GTC Architecture Core Talks', type: 'video', link: 'https://www.nvidia.com/en-us/gtc/' },
        { title: 'Parallel Reduction & Warp Divergence Optimization', type: 'primer', link: 'https://developer.download.nvidia.com/assets/cuda/files/reduction.pdf' },
      ];
    }
    if (name.includes('stripe')) {
      return [
        { title: 'Stripe API Design Guidelines', type: 'guide', link: 'https://github.com/stripe/api-standards' },
        { title: 'Distributed Systems & Consensuses (Raft)', type: 'primer', link: 'https://raft.github.io/' },
        { title: 'System Design Interview: Idempotent FinTech Ledgers', type: 'guide', link: 'https://bytebytego.com' },
      ];
    }
    return [
      { title: 'System Design Primer', type: 'guide', link: 'https://github.com/donnemartin/system-design-primer' },
      { title: 'Front-End System Design Playbook', type: 'primer', link: 'https://github.com/ctripcorp/fe-syse' },
      { title: 'WAI-ARIA Accessibility Design Patterns', type: 'guide', link: 'https://www.w3.org/WAI/ARIA/apg/' },
    ];
  };

  const resources = getInteractiveResources();

  // Helper values for active step indicator
  const completedPhasesCount = editedApp.phases.filter(p => p.status === 'completed').length;
  const activePhaseIndex = editedApp.phases.findIndex(p => p.status === 'active');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="sm:max-w-5xl lg:max-w-7xl h-[92vh] md:h-[86vh] flex flex-col p-0 overflow-hidden bg-slate-950 border border-slate-800 rounded-[2rem] shadow-[0_0_80px_rgba(99,102,241,0.15)] focus:outline-none"
        showCloseButton={false}
      >
        {/* Banner Sticky Header */}
        <div className="bg-slate-950 border-b border-slate-900/80 p-6 flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-4">
          <div className="flex items-center gap-4">
            {/* Logo Initial */}
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 flex items-center justify-center font-black font-display text-xl shrink-0">
              {editedApp.companyName.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-black font-display text-white tracking-tight">{editedApp.companyName}</h2>
                <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider px-3 py-0.5 rounded-full border ${getStatusBadgeStyle(editedApp.currentStatus)}`}>
                  ● {editedApp.currentStatus}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs font-bold text-slate-100">{editedApp.targetRole}</span>
                <span className="text-slate-600 font-bold">•</span>
                <span className="text-[11px] font-bold font-mono text-slate-400">{editedApp.location}</span>
                <span className="text-slate-600 font-bold">•</span>
                <span className="text-[11px] font-bold font-mono text-indigo-400">{editedApp.salaryRange}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4.5">
            {/* Metric widgets inside header */}
            <div className="hidden sm:flex items-center gap-6 pr-6 border-r border-slate-900/80">
              <div className="text-right">
                <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest font-mono block">pipeline state</span>
                <span className="text-xs font-black text-slate-300 font-mono">Phase {completedPhasesCount + (activePhaseIndex !== -1 ? 1 : 0)} / 7</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest font-mono block">time elapsed</span>
                <span className="text-xs font-black text-indigo-400 font-mono">Day {getElapsedDays()}</span>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              {/* Save Button */}
              <Button
                onClick={handleSave}
                id="save-application-btn"
                className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow h-auto ${
                  isSaved 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/10'
                }`}
              >
                <Save className="w-4 h-4 animate-pulse" />
                {isSaved ? 'Synced Successfully!' : 'Sync Changes'}
              </Button>

              {/* Close Button */}
              <button 
                onClick={onClose}
                className="p-2.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-full border border-slate-800/80 transition cursor-pointer"
                title="Exit cockpit"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Progress Tracker (LinearIssueStyle) */}
        <div className="bg-slate-950/40 border-b border-slate-900/80 px-8 py-3.5 shrink-0 overflow-x-auto">
          <div className="flex items-center justify-between min-w-[700px] gap-2">
            {editedApp.phases.map((ph, idx) => {
              const isComp = ph.status === 'completed';
              const isAct = ph.status === 'active';
              return (
                <div key={idx} className="flex-1 flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    {/* Circle badge */}
                    <div 
                      onClick={() => handlePhaseChange(idx, 'status', isComp ? 'active' : isAct ? 'upcoming' : 'completed')}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] cursor-pointer transition-all border shrink-0 ${
                        isComp 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                          : isAct 
                            ? 'bg-indigo-600 text-white border-indigo-500 ring-2 ring-indigo-500/30 animate-pulse' 
                            : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}
                      title="Click to toggle stage status"
                    >
                      {isComp ? '✓' : idx + 1}
                    </div>
                    {/* Text */}
                    <div className="min-w-0">
                      <p className={`text-[10px] font-extrabold uppercase font-mono tracking-wide ${isAct ? 'text-indigo-400' : isComp ? 'text-slate-300' : 'text-slate-600'}`}>
                        {ph.name.replace(/^Phase \d+:\s*/, '').split(' ')[0]}
                      </p>
                      <p className="text-[8px] text-slate-500 font-bold truncate max-w-[80px]" title={ph.name.replace(/^Phase \d+:\s*/, '')}>
                        {ph.name.replace(/^Phase \d+:\s*/, '')}
                      </p>
                    </div>
                  </div>
                  {idx < 6 && (
                    <div className={`h-[1px] flex-1 min-w-[12px] ${isComp ? 'bg-emerald-500/40' : 'bg-slate-800'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tab Selection Layout */}
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="flex-1 flex flex-col min-h-0">
          <div className="bg-slate-950/20 px-8 pt-1.5 border-b border-slate-900/60 flex shrink-0">
            <TabsList variant="line" className="gap-8 bg-transparent p-0">
              <TabsTrigger 
                value="timeline" 
                className="pb-3 text-xs font-black transition-all data-active:border-indigo-500 data-active:text-white border-b-2 border-transparent text-slate-500 hover:text-slate-300 rounded-none bg-transparent data-active:bg-transparent h-auto cursor-pointer uppercase tracking-wider"
              >
                <ListChecks className="w-4 h-4 mr-1.5 text-indigo-400" />
                Pipeline Timeline & Signals
              </TabsTrigger>
              <TabsTrigger 
                value="core" 
                className="pb-3 text-xs font-black transition-all data-active:border-indigo-500 data-active:text-white border-b-2 border-transparent text-slate-500 hover:text-slate-300 rounded-none bg-transparent data-active:bg-transparent h-auto cursor-pointer uppercase tracking-wider"
              >
                <Info className="w-4 h-4 mr-1.5 text-blue-400" />
                Employment & Assets
              </TabsTrigger>
              <TabsTrigger 
                value="mortem" 
                className="pb-3 text-xs font-black transition-all data-active:border-indigo-500 data-active:text-white border-b-2 border-transparent text-slate-500 hover:text-slate-300 rounded-none bg-transparent data-active:bg-transparent h-auto cursor-pointer uppercase tracking-wider"
              >
                <Award className="w-4 h-4 mr-1.5 text-emerald-400" />
                Telemetry Post-Mortem
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content Box - Scrollable */}
          <div className="flex-1 overflow-y-auto px-8 py-6 min-h-0 bg-slate-950/10">
            
            {/* TAB 1: TIMELINE */}
            <TabsContent value="timeline" className="outline-none space-y-8 pl-4 py-2 relative mt-0">
              {/* Dynamic vertical connector line */}
              <div className="absolute left-8 top-4 bottom-8 w-[1px] bg-slate-900" />

              {editedApp.phases.map((phase, i) => {
                const isActive = phase.status === 'active';
                const isCompleted = phase.status === 'completed';
                return (
                  <div key={i} className="relative pl-12 group" id={`phase-row-${i}`}>
                    
                    {/* Circle icon on the left vertical thread line */}
                    <div className="absolute left-3 top-1 z-10">
                      <div 
                        onClick={() => {
                          const nextStatus = isCompleted ? 'active' : isActive ? 'skipped' : 'completed';
                          handlePhaseChange(i, 'status', nextStatus);
                        }}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ring-4 ring-slate-950 cursor-pointer shadow-md transition-all ${
                          isCompleted 
                            ? 'bg-emerald-500 text-white' 
                            : isActive 
                              ? 'bg-indigo-600 text-white ring-indigo-500/20 scale-110 shadow-lg shadow-indigo-600/20'
                              : 'bg-slate-900 text-slate-500 border border-slate-800'
                        }`}
                        title="Click to quickly toggle stage status"
                      >
                        {isCompleted ? '✓' : i + 1}
                      </div>
                    </div>

                    {/* Timeline card container */}
                    <div className={`glass-panel p-6 rounded-[2rem] border transition-all duration-300 ${
                      isActive 
                        ? 'border-indigo-500/30 bg-slate-900/60 shadow-[0_0_40px_rgba(99,102,241,0.06)]' 
                        : isCompleted
                          ? 'border-emerald-500/10 bg-slate-900/10'
                          : 'border-slate-900 bg-slate-900/10 opacity-60 hover:opacity-100'
                    }`}>
                      
                      {/* Card Header: Stage Title & Segmented Button State Switcher */}
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-900 pb-4 mb-5">
                        <div>
                          <span className="text-[9px] font-extrabold text-indigo-400 uppercase tracking-widest font-mono block">Phase {i+1} Calibration</span>
                          <h4 className={`text-base font-black tracking-tight ${isActive ? 'text-indigo-400' : 'text-slate-100'}`}>
                            {phase.name}
                          </h4>
                        </div>

                        {/* Date Picker + Satisfying Segmented State Switcher */}
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Mini Date Block */}
                          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-900">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <input
                              type="date"
                              value={phase.date}
                              onChange={(e) => handlePhaseChange(i, 'date', e.target.value)}
                              className="text-xs bg-transparent border-none p-0 outline-none font-bold text-slate-300 focus:ring-0 w-28"
                            />
                          </div>

                          {/* Segmented Button Selection controls (Satisfying!) */}
                          <div className="bg-slate-950 p-1 rounded-xl border border-slate-900 flex gap-0.5">
                            {(['upcoming', 'active', 'completed', 'skipped'] as const).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handlePhaseChange(i, 'status', st)}
                                className={`px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                  phase.status === st 
                                    ? st === 'completed'
                                      ? 'bg-emerald-500/15 text-emerald-400 font-black'
                                      : st === 'active'
                                        ? 'bg-indigo-600 text-white'
                                        : st === 'skipped'
                                          ? 'bg-slate-800 text-slate-300'
                                          : 'bg-slate-800/80 text-slate-400'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Signals & Textarea Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                        
                        {/* Positive Signals - Left Green Border */}
                        <div className="bg-emerald-500/[0.02] border border-emerald-500/10 border-l-4 border-l-emerald-500 rounded-2xl p-4.5 space-y-2">
                          <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                            <ThumbsUp className="w-3.5 h-3.5" />
                            Positive Signals & Pros
                          </label>
                          <textarea
                            rows={3}
                            value={phase.pros}
                            onChange={(e) => handlePhaseChange(i, 'pros', e.target.value)}
                            placeholder="✓ E.g., referral was accepted instantly, interviewer was highly engaged with our C++ kernel reduction designs..."
                            className="text-xs bg-transparent border-none p-0 w-full text-slate-200 outline-none focus:ring-0 placeholder-slate-600 leading-relaxed resize-none"
                          />
                        </div>

                        {/* Red Flags / Risk Areas - Left Red Border */}
                        <div className="bg-rose-500/[0.02] border border-rose-500/10 border-l-4 border-l-rose-500 rounded-2xl p-4.5 space-y-2">
                          <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                            <ThumbsDown className="w-3.5 h-3.5" />
                            Risk Areas / Red Flags
                          </label>
                          <textarea
                            rows={3}
                            value={phase.cons}
                            onChange={(e) => handlePhaseChange(i, 'cons', e.target.value)}
                            placeholder="⚠ E.g., timezone mismatch, salary ceiling concerns, whiteboard requirements detected..."
                            className="text-xs bg-transparent border-none p-0 w-full text-slate-200 outline-none focus:ring-0 placeholder-slate-600 leading-relaxed resize-none"
                          />
                        </div>
                      </div>

                      {/* Remarks & Quotes feedback section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Remarks, Stack & Notes</label>
                          <textarea
                            rows={3}
                            value={phase.remarks}
                            onChange={(e) => handlePhaseChange(i, 'remarks', e.target.value)}
                            placeholder="Instructions, interviewer name, and specific challenges or homework parameters..."
                            className="text-xs bg-slate-950 border border-slate-900 p-3 rounded-2xl w-full text-slate-200 transition placeholder-slate-700 outline-none focus:border-indigo-500 leading-relaxed"
                          />
                        </div>

                        {/* Direct Quotes block (interviewer feedback) */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider block">Direct Interviewer Quotes</label>
                          <div className="relative bg-slate-950/60 p-3 rounded-2xl border border-indigo-900/20">
                            <div className="absolute top-2.5 right-3 text-indigo-500/10 font-serif text-4xl select-none leading-none">“</div>
                            <textarea
                              rows={3}
                              value={phase.feedback}
                              onChange={(e) => handlePhaseChange(i, 'feedback', e.target.value)}
                              placeholder="Paste direct quotes from emails, phone calls, or recruiter summaries..."
                              className="text-xs bg-transparent border-none p-0 w-full text-slate-100 outline-none focus:ring-0 placeholder-indigo-950 leading-relaxed italic pr-6"
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </TabsContent>

            {/* TAB 2: CORE DETAILS & LOGISTICS */}
            <TabsContent value="core" className="outline-none space-y-6 mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Employment card */}
                <div className="glass-panel p-6 rounded-[2rem] border border-slate-800 shadow-sm space-y-4 lg:col-span-2">
                  <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest border-b border-slate-900 pb-2.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Employment & Position Logistics
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Target Compensation</label>
                      <input
                        type="text"
                        value={editedApp.salaryRange}
                        onChange={(e) => handleFieldChange('salaryRange', e.target.value)}
                        placeholder="e.g., $190k - $240k"
                        className="text-xs bg-slate-950 border border-slate-900 p-2.5 rounded-xl w-full font-black text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Benefits, ESPP, Equity</label>
                      <input
                        type="text"
                        value={editedApp.otherBenefits}
                        onChange={(e) => handleFieldChange('otherBenefits', e.target.value)}
                        placeholder="e.g., 15% Bonus, ESPP, Premium Health"
                        className="text-xs bg-slate-950 border border-slate-900 p-2.5 rounded-xl w-full text-slate-300 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Working Model</label>
                      <select
                        value={editedApp.workModel}
                        onChange={(e) => handleFieldChange('workModel', e.target.value as WorkModelType)}
                        className="text-xs bg-slate-950 border border-slate-900 p-2.5 rounded-xl w-full font-semibold text-slate-300 cursor-pointer"
                      >
                        <option value="Remote">Remote</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="Onsite">Onsite</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Location Details</label>
                      <input
                        type="text"
                        value={editedApp.location}
                        onChange={(e) => handleFieldChange('location', e.target.value)}
                        placeholder="City, State"
                        className="text-xs bg-slate-950 border border-slate-900 p-2.5 rounded-xl w-full font-semibold text-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Logistics & HR card */}
                <div className="glass-panel p-6 rounded-[2rem] border border-slate-800 shadow-sm space-y-4 lg:col-span-1">
                  <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest border-b border-slate-900 pb-2.5 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-indigo-400" />
                    Channels & Points of Contact
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">HR Recruiter Contact</label>
                      <input
                        type="text"
                        value={editedApp.hrContact}
                        onChange={(e) => handleFieldChange('hrContact', e.target.value)}
                        placeholder="Name, Email, or phone"
                        className="text-xs bg-slate-950 border border-slate-900 p-2.5 rounded-xl w-full font-bold text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Applied Via Channel</label>
                      <select
                        value={editedApp.appliedVia}
                        onChange={(e) => handleFieldChange('appliedVia', e.target.value as AppliedViaType)}
                        className="text-xs bg-slate-950 border border-slate-900 p-2.5 rounded-xl w-full font-bold text-slate-300 cursor-pointer"
                      >
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Email">Email</option>
                        <option value="Company Form">Company Form</option>
                        <option value="Referral">Referral</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Anchor Assets links */}
                <div className="glass-panel p-6 rounded-[2rem] border border-slate-800 shadow-sm space-y-4 lg:col-span-1">
                  <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest border-b border-slate-900 pb-2.5">
                    Cockpit Document Anchors
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Applied Resume Version</label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={editedApp.resumeLink}
                          onChange={(e) => handleFieldChange('resumeLink', e.target.value)}
                          placeholder="e.g. Drive PDF Link"
                          className="text-xs bg-slate-950 border border-slate-900 p-2.5 rounded-xl w-full text-slate-300 font-mono"
                        />
                        {editedApp.resumeLink && (
                          <a 
                            href={editedApp.resumeLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2.5 bg-indigo-950/40 hover:bg-indigo-950 text-indigo-400 rounded-xl flex items-center justify-center shrink-0 border border-indigo-900/30 transition-all cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Target Portfolio / Spec Repo</label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={editedApp.portfolioLink}
                          onChange={(e) => handleFieldChange('portfolioLink', e.target.value)}
                          placeholder="e.g. GitHub spec commit"
                          className="text-xs bg-slate-950 border border-slate-900 p-2.5 rounded-xl w-full text-slate-300 font-mono"
                        />
                        {editedApp.portfolioLink && (
                          <a 
                            href={editedApp.portfolioLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2.5 bg-indigo-950/40 hover:bg-indigo-950 text-indigo-400 rounded-xl flex items-center justify-center shrink-0 border border-indigo-900/30 transition-all cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key JD Requirements */}
                <div className="lg:col-span-2 glass-panel p-6 rounded-[2rem] border border-slate-800 shadow-sm space-y-3">
                  <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest border-b border-slate-900 pb-2.5">
                    Target Role Requirements Spec & Keywords
                  </h4>
                  <textarea
                    rows={4}
                    value={editedApp.keyJdRequirements}
                    onChange={(e) => handleFieldChange('keyJdRequirements', e.target.value)}
                    placeholder="Paste keywords, core architectures, standards, or profiles demanded by the company..."
                    className="text-xs bg-slate-950 border border-slate-900 p-3.5 rounded-2xl w-full leading-relaxed focus:bg-slate-950 text-slate-200 outline-none focus:border-indigo-500 resize-y"
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: POST-MORTEM & TECHNICAL TELEMETRY */}
            <TabsContent value="mortem" className="outline-none space-y-6 mt-0">
              <div className="bg-slate-950 border border-slate-900 text-white p-6 rounded-[2rem] space-y-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Award className="w-40 h-40 text-indigo-500" />
                </div>

                <div className="border-b border-slate-900 pb-4">
                  <h3 className="text-lg font-black flex items-center gap-2 text-white">
                    <Award className="w-5 h-5 text-indigo-400" />
                    Calibration Post-Mortem & Skill Gaps
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Continuous feedback cycles logged post-technical challenge or whiteboard loop. Refine specific systems gaps.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Action Gaps */}
                  <div className="lg:col-span-2 space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest block mb-2">
                        Skill Debt & Gaps Logged
                      </label>
                      <textarea
                        rows={4}
                        value={editedApp.postMortem.skillsImprovements}
                        onChange={(e) => handlePostMortemChange('skillsImprovements', e.target.value)}
                        placeholder="E.g., review warp divergent branch penalty layouts, optimize shared memory bank conflicts..."
                        className="text-xs bg-slate-950 border border-slate-900 p-3.5 rounded-2xl w-full text-slate-100 focus:bg-slate-900/50 outline-none focus:border-indigo-500 leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-2">
                        Continuous Preparation Notes
                      </label>
                      <textarea
                        rows={4}
                        value={editedApp.postMortem.preparationNotes}
                        onChange={(e) => handlePostMortemChange('preparationNotes', e.target.value)}
                        placeholder="E.g., work through 5 specific CUDA kernel reduction benchmarks from Nvidia code sample repo..."
                        className="text-xs bg-slate-950 border border-slate-900 p-3.5 rounded-2xl w-full text-slate-100 focus:bg-slate-900/50 outline-none focus:border-indigo-500 leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Calibration rating & interactive prep resources */}
                  <div className="lg:col-span-1 space-y-6">
                    {/* Dynamic Self Rating */}
                    <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-900 space-y-3.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Process Score
                        </label>
                        <span className="text-sm font-black text-indigo-400 font-mono">
                          {editedApp.postMortem.selfRating} / 10
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          value={editedApp.postMortem.selfRating}
                          onChange={(e) => handlePostMortemChange('selfRating', parseFloat(e.target.value))}
                          className="w-full accent-indigo-500 cursor-pointer"
                        />
                        <div className="flex justify-between gap-1 items-center">
                          <span className="text-[9px] text-slate-500 font-mono uppercase">Standard</span>
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, index) => {
                              const starRating = (index + 1) * 2;
                              return (
                                <Star 
                                  key={index}
                                  className={`w-3.5 h-3.5 ${
                                    editedApp.postMortem.selfRating >= starRating 
                                      ? 'text-amber-400 fill-amber-400' 
                                      : editedApp.postMortem.selfRating >= starRating - 1 
                                        ? 'text-amber-400/70 fill-amber-400/30' 
                                        : 'text-slate-800'
                                  }`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Highly clickable Preparation Resources (Cockpit style!) */}
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                        Target Resource Checklist
                      </label>
                      <div className="space-y-2">
                        {resources.map((res, rid) => (
                          <a
                            key={rid}
                            href={res.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-slate-950 hover:bg-slate-900 border border-slate-900 hover:border-indigo-500/20 rounded-xl text-xs text-slate-300 font-bold transition group"
                          >
                            <span className="flex items-center gap-2 truncate">
                              {res.type === 'guide' ? (
                                <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              ) : res.type === 'video' ? (
                                <Play className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              ) : (
                                <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              )}
                              <span className="truncate group-hover:text-indigo-400 transition-colors">{res.title}</span>
                            </span>
                            <ExternalLink className="w-3 h-3 text-slate-600 shrink-0 group-hover:text-slate-400 transition" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer sticky bar */}
        <div className="bg-slate-950 border-t border-slate-900/80 p-4 flex justify-end gap-3 px-8 shrink-0">
          <Button
            variant="ghost"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all h-auto cursor-pointer"
          >
            Close Mission Control
          </Button>
          <Button
            onClick={handleSave}
            className={`px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-sm h-auto cursor-pointer ${
              isSaved 
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow'
            }`}
          >
            <Save className="w-4 h-4" />
            {isSaved ? 'Changes Synced!' : 'Sync Cockpit Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
