import { useState, useEffect } from 'react';
import { JobApplication, InterviewPhase, WorkModelType, AppliedViaType } from '../types';
import { X, Calendar, ExternalLink, Award, CheckCircle2, Circle, Star, Save, Database, Info, Layers, ListChecks } from 'lucide-react';
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

  const handlePhaseChange = (index: number, key: keyof InterviewPhase, value: string) => {
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

  // Status mapping for phases icon indicators - Elegant Dark Theme
  const renderPhaseIndicator = (phase: InterviewPhase, index: number) => {
    const status = phase.status;
    if (status === 'completed') {
      return (
        <button 
          onClick={() => handlePhaseChange(index, 'status', 'active')}
          className="z-10 w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white ring-4 ring-slate-900 shadow transition-all duration-150 cursor-pointer"
          title="Mark active"
        >
          <CheckCircle2 className="w-5 h-5" />
        </button>
      );
    }
    if (status === 'active') {
      return (
        <button 
          onClick={() => handlePhaseChange(index, 'status', 'completed')}
          className="z-10 w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center text-white ring-4 ring-slate-900 shadow-md animate-pulse transition-all duration-150 cursor-pointer"
          title="Mark complete"
        >
          <span className="text-xs font-black">{index + 1}</span>
        </button>
      );
    }
    if (status === 'skipped') {
      return (
        <button 
          onClick={() => handlePhaseChange(index, 'status', 'upcoming')}
          className="z-10 w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white ring-4 ring-slate-900 shadow transition-all duration-150 cursor-pointer"
          title="Restore"
        >
          <Circle className="w-4 h-4 line-through opacity-70" />
        </button>
      );
    }
    return (
      <button 
        onClick={() => handlePhaseChange(index, 'status', 'active')}
        className="z-10 w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-750 flex items-center justify-center text-slate-400 hover:text-indigo-400 hover:border-indigo-500 border border-slate-700/50 ring-4 ring-slate-900 shadow-sm transition-all duration-150 cursor-pointer"
        title="Mark active"
      >
        <span className="text-xs font-bold">{index + 1}</span>
      </button>
    );
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('offer')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (s.includes('reject') || s.includes('archived') || s.includes('failed')) return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (s.includes('phone') || s.includes('screen')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="sm:max-w-4xl lg:max-w-5xl h-[88vh] md:h-[82vh] flex flex-col p-0 overflow-hidden bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl focus:outline-none"
        showCloseButton={false}
      >
        {/* Banner Sticky Header */}
        <div className="bg-slate-900/60 border-b border-slate-800/80 p-6 flex justify-between items-center shrink-0">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-black font-display text-white tracking-tight">{editedApp.companyName}</h2>
              <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider px-3 py-0.5 rounded-full border ${getStatusBadgeStyle(editedApp.currentStatus)}`}>
                {editedApp.currentStatus}
              </Badge>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-1">{editedApp.targetRole}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Save Button */}
            <Button
              onClick={handleSave}
              id="save-application-btn"
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm h-auto ${
                isSaved 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <Save className="w-4 h-4" />
              {isSaved ? 'Changes Saved!' : 'Save Changes'}
            </Button>

            {/* Close Cross */}
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-full transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection Layout */}
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="flex-1 flex flex-col min-h-0">
          <div className="bg-slate-900/30 px-6 pt-2 border-b border-slate-800/60 flex shrink-0">
            <TabsList variant="line" className="gap-6 bg-transparent p-0">
              <TabsTrigger 
                value="timeline" 
                className="pb-3 text-xs font-bold transition-all data-active:border-indigo-500 data-active:text-white border-b-2 border-transparent text-slate-500 hover:text-slate-300 rounded-none bg-transparent data-active:bg-transparent h-auto cursor-pointer"
              >
                <ListChecks className="w-3.5 h-3.5 mr-1" />
                Timeline & 7-Phases
              </TabsTrigger>
              <TabsTrigger 
                value="core" 
                className="pb-3 text-xs font-bold transition-all data-active:border-indigo-500 data-active:text-white border-b-2 border-transparent text-slate-500 hover:text-slate-300 rounded-none bg-transparent data-active:bg-transparent h-auto cursor-pointer"
              >
                <Info className="w-3.5 h-3.5 mr-1" />
                Core Details & Logistics
              </TabsTrigger>
              <TabsTrigger 
                value="mortem" 
                className="pb-3 text-xs font-bold transition-all data-active:border-indigo-500 data-active:text-white border-b-2 border-transparent text-slate-500 hover:text-slate-300 rounded-none bg-transparent data-active:bg-transparent h-auto cursor-pointer"
              >
                <Award className="w-3.5 h-3.5 mr-1" />
                Post-Mortem & Skills
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content Box - Scrollable */}
          <div className="flex-1 overflow-y-auto px-8 py-6 min-h-0 bg-slate-950/40">
            
            {/* TAB 1: TIMELINE */}
            <TabsContent value="timeline" className="outline-none space-y-8 pl-4 py-2 relative mt-0">
              {/* Dynamic vertical link line */}
              <div className="absolute left-8 top-3 bottom-8 w-0.5 bg-slate-800" />

              {editedApp.phases.map((phase, i) => {
                const isActive = phase.status === 'active';
                const isCompleted = phase.status === 'completed';
                return (
                  <div key={i} className="relative pl-12 group" id={`phase-row-${i}`}>
                    {/* Circle icon on line */}
                    <div className="absolute left-3.5 top-1">
                      {renderPhaseIndicator(phase, i)}
                    </div>

                    {/* Timeline card */}
                    <div className={`glass-panel p-5 rounded-2xl border transition-all duration-200 ${
                      isActive 
                        ? 'border-indigo-500/30 bg-slate-900 shadow-md ring-2 ring-indigo-500/10' 
                        : isCompleted
                          ? 'border-emerald-500/20 bg-slate-900/60'
                          : 'border-slate-800 bg-slate-900/30 opacity-70 hover:opacity-100'
                    }`}>
                      
                      {/* Card title and Date */}
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-800/80 pb-3 mb-4">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Stage {i+1}</span>
                          <h4 className={`font-extrabold text-sm uppercase tracking-tight ${isActive ? 'text-indigo-400' : 'text-slate-100'}`}>
                            {phase.name}
                          </h4>
                        </div>

                        {/* Date field */}
                        <div className="flex items-center gap-1.5 w-full sm:w-44">
                          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <input
                            type="date"
                            value={phase.date}
                            onChange={(e) => handlePhaseChange(i, 'date', e.target.value)}
                            className="text-xs bg-slate-950 border border-slate-800 py-1 px-2 rounded-lg outline-none font-semibold text-slate-300 w-full focus:bg-slate-950 focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Timeline Card Status Dropdown */}
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phase State:</span>
                        <select
                          value={phase.status}
                          onChange={(e) => handlePhaseChange(i, 'status', e.target.value as any)}
                          className="text-xs font-semibold bg-slate-950 border border-slate-800 py-1 pl-2 pr-6 outline-none text-slate-300 rounded-lg max-w-[130px] cursor-pointer"
                        >
                          <option value="upcoming">Upcoming</option>
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                          <option value="skipped">Skipped</option>
                        </select>
                      </div>

                      {/* Visible/Editable text areas */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Pros / Positive Signals</label>
                          <textarea
                            rows={2}
                            value={phase.pros}
                            onChange={(e) => handlePhaseChange(i, 'pros', e.target.value)}
                            placeholder="Positive metrics, culture match, system design alignments..."
                            className="text-xs bg-slate-950 border border-slate-800 p-2.5 rounded-xl w-full focus:bg-slate-950 text-slate-200 transition placeholder-slate-600 outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Cons / Red Flags</label>
                          <textarea
                            rows={2}
                            value={phase.cons}
                            onChange={(e) => handlePhaseChange(i, 'cons', e.target.value)}
                            placeholder="Weak answers, timezone mismatch, compensation gaps..."
                            className="text-xs bg-slate-950 border border-slate-800 p-2.5 rounded-xl w-full focus:bg-slate-950 text-slate-200 transition placeholder-slate-600 outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-3.5">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Remarks & Details</label>
                          <textarea
                            rows={2}
                            value={phase.remarks}
                            onChange={(e) => handlePhaseChange(i, 'remarks', e.target.value)}
                            placeholder="Coding challenge instructions, interviewer names, architecture questions asked..."
                            className="text-xs bg-slate-950 border border-slate-800 p-2.5 rounded-xl w-full focus:bg-slate-950 text-slate-200 transition placeholder-slate-600 outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">Direct Feedback Received</label>
                          <textarea
                            rows={2}
                            value={phase.feedback}
                            onChange={(e) => handlePhaseChange(i, 'feedback', e.target.value)}
                            placeholder="Direct quotes from recruiters, email score summaries..."
                            className="text-xs bg-indigo-950/20 border border-indigo-900/40 p-2.5 rounded-xl w-full text-slate-100 focus:bg-slate-950 transition placeholder-slate-700 outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </TabsContent>

            {/* TAB 2: CORE DETAILS & LOGISTICS */}
            <TabsContent value="core" className="outline-none space-y-6 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Employment card */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest border-b border-slate-800/60 pb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Employment Details
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Salary Range</label>
                      <input
                        type="text"
                        value={editedApp.salaryRange}
                        onChange={(e) => handleFieldChange('salaryRange', e.target.value)}
                        placeholder="e.g., $180k - $220k"
                        className="text-xs bg-slate-950 border border-slate-800 p-2 rounded-lg w-full font-semibold text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Other Benefits</label>
                      <input
                        type="text"
                        value={editedApp.otherBenefits}
                        onChange={(e) => handleFieldChange('otherBenefits', e.target.value)}
                        placeholder="e.g., ESPP, Unlimited PTO, Equity"
                        className="text-xs bg-slate-950 border border-slate-800 p-2 rounded-lg w-full text-slate-300 font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Work Model</label>
                        <select
                          value={editedApp.workModel}
                          onChange={(e) => handleFieldChange('workModel', e.target.value as WorkModelType)}
                          className="text-xs bg-slate-950 border border-slate-800 p-2 rounded-lg w-full font-semibold text-slate-300"
                        >
                          <option value="Remote">Remote</option>
                          <option value="Hybrid">Hybrid</option>
                          <option value="Onsite">Onsite</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Location</label>
                        <input
                          type="text"
                          value={editedApp.location}
                          onChange={(e) => handleFieldChange('location', e.target.value)}
                          placeholder="City, State"
                          className="text-xs bg-slate-950 border border-slate-800 p-2 rounded-lg w-full font-semibold text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logistics & HR card */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest border-b border-slate-800/60 pb-2 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-indigo-400" />
                    HR & Application Logistics
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">HR / Recruiter Contact</label>
                      <input
                        type="text"
                        value={editedApp.hrContact}
                        onChange={(e) => handleFieldChange('hrContact', e.target.value)}
                        placeholder="Name, Email, or phone"
                        className="text-xs bg-slate-950 border border-slate-800 p-2 rounded-lg w-full font-semibold text-slate-100"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Applied Via</label>
                        <select
                          value={editedApp.appliedVia}
                          onChange={(e) => handleFieldChange('appliedVia', e.target.value as AppliedViaType)}
                          className="text-xs bg-slate-950 border border-slate-800 p-2 rounded-lg w-full font-semibold text-slate-300"
                        >
                          <option value="LinkedIn">LinkedIn</option>
                          <option value="Email">Email</option>
                          <option value="Company Form">Company Form</option>
                          <option value="Referral">Referral</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Current Status Banner</label>
                        <input
                          type="text"
                          value={editedApp.currentStatus}
                          onChange={(e) => handleFieldChange('currentStatus', e.target.value)}
                          placeholder="Current Status"
                          className="text-xs bg-slate-950 border border-slate-800 p-2 rounded-lg w-full font-bold text-indigo-400"
                        />
                      </div>
                    </div>

                    {/* Anchor Assets */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Resume Link</label>
                        <div className="flex gap-1">
                          <input
                            type="url"
                            value={editedApp.resumeLink}
                            onChange={(e) => handleFieldChange('resumeLink', e.target.value)}
                            placeholder="e.g. Drive PDF Link"
                            className="text-xs bg-slate-950 border border-slate-800 p-2 rounded-lg w-full text-slate-300 font-mono"
                          />
                          {editedApp.resumeLink && (
                            <a 
                              href={editedApp.resumeLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 bg-indigo-950/40 hover:bg-indigo-950 text-indigo-400 rounded-lg flex items-center justify-center shrink-0 cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Portfolio Link</label>
                        <div className="flex gap-1">
                          <input
                            type="url"
                            value={editedApp.portfolioLink}
                            onChange={(e) => handleFieldChange('portfolioLink', e.target.value)}
                            placeholder="e.g. GitHub profile"
                            className="text-xs bg-slate-950 border border-slate-800 p-2 rounded-lg w-full text-slate-300 font-mono"
                          />
                          {editedApp.portfolioLink && (
                            <a 
                              href={editedApp.portfolioLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 bg-indigo-950/40 hover:bg-indigo-950 text-indigo-400 rounded-lg flex items-center justify-center shrink-0 cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Key JD Requirements */}
                <div className="col-span-1 md:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800/80 shadow-sm space-y-3">
                  <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest border-b border-slate-800/60 pb-2">
                    Key Job Description Requirements & Stack
                  </h4>
                  <textarea
                    rows={4}
                    value={editedApp.keyJdRequirements}
                    onChange={(e) => handleFieldChange('keyJdRequirements', e.target.value)}
                    placeholder="Paste the key highlights, stack details, framework needs, and experience bars from the Job Spec..."
                    className="text-xs bg-slate-950 border border-slate-800 p-3 rounded-xl w-full leading-relaxed focus:bg-slate-950 text-slate-200 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: POST-MORTEM */}
            <TabsContent value="mortem" className="outline-none space-y-6 mt-0">
              <div className="bg-slate-900 border border-slate-800/80 text-white p-6 rounded-2xl space-y-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Award className="w-40 h-40" />
                </div>

                <div className="border-b border-slate-800 pb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                    <Award className="w-5 h-5 text-indigo-400" />
                    Skills Improvement & Retrospective Analysis
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Log direct feedback themes, lacking skills, and continuous improvement steps after the interview cycle.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {/* Skills Improvements */}
                  <div>
                    <label className="text-xs text-slate-300 font-bold uppercase tracking-wider block mb-2">
                      Action Items / Skill Gaps Identified
                    </label>
                    <textarea
                      rows={4}
                      value={editedApp.postMortem.skillsImprovements}
                      onChange={(e) => handlePostMortemChange('skillsImprovements', e.target.value)}
                      placeholder="e.g. Brush up on kernel launch grid dimensions, warp occupancy limits, and write-ahead ledger replication strategies..."
                      className="text-xs bg-slate-950 border border-slate-800 p-3.5 rounded-xl w-full text-slate-100 focus:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Prep for next time */}
                  <div>
                    <label className="text-xs text-slate-300 font-bold uppercase tracking-wider block mb-2">
                      Preparation Resources & Next-Time Strategies
                    </label>
                    <textarea
                      rows={4}
                      value={editedApp.postMortem.preparationNotes}
                      onChange={(e) => handlePostMortemChange('preparationNotes', e.target.value)}
                      placeholder="e.g. Work through 5 specific CUDA reduction examples in CUDA samples repository. Read chapter 6 of Designing Data-Intensive Applications."
                      className="text-xs bg-slate-950 border border-slate-800 p-3.5 rounded-xl w-full text-slate-100 focus:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Self-Rating bar */}
                  <div className="border-t border-slate-800 pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs text-slate-300 font-bold uppercase tracking-wider">
                        Self-Rating of Process Performance
                      </label>
                      <span className="text-sm font-black text-indigo-400 font-mono">
                        {editedApp.postMortem.selfRating} / 10
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={editedApp.postMortem.selfRating}
                        onChange={(e) => handlePostMortemChange('selfRating', parseFloat(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, index) => {
                          const starRating = (index + 1) * 2;
                          return (
                            <Star 
                              key={index}
                              className={`w-4 h-4 ${
                                editedApp.postMortem.selfRating >= starRating 
                                  ? 'text-amber-400 fill-amber-400' 
                                  : editedApp.postMortem.selfRating >= starRating - 1 
                                    ? 'text-amber-400/70 fill-amber-400/40' 
                                    : 'text-slate-600'
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer sticky bar */}
        <div className="bg-slate-900 border-t border-slate-800/80 p-4 flex justify-end gap-3 px-6 shrink-0">
          <Button
            variant="ghost"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all h-auto cursor-pointer"
          >
            Close Detail View
          </Button>
          <Button
            onClick={handleSave}
            className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm h-auto cursor-pointer ${
              isSaved 
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow'
            }`}
          >
            <Save className="w-4 h-4" />
            {isSaved ? 'Changes Saved!' : 'Save & Sync Details'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
