import { useState, useEffect } from 'react';
import { JobApplication, InterviewPhase, WorkModelType, AppliedViaType } from '../types';
import { X, Calendar, Edit, Link, ExternalLink, Award, FileText, CheckCircle2, Circle, Star, Save } from 'lucide-react';

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

  if (!isOpen || !editedApp) return null;

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

  // Status mapping for phases icon indicators
  const renderPhaseIndicator = (phase: InterviewPhase, index: number) => {
    const status = phase.status;
    if (status === 'completed') {
      return (
        <button 
          onClick={() => handlePhaseChange(index, 'status', 'active')}
          className="z-10 w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white ring-4 ring-white shadow transition-all duration-150"
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
          className="z-10 w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center text-white ring-4 ring-white ring-offset-1 shadow-md animate-pulse transition-all duration-150"
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
          className="z-10 w-9 h-9 rounded-full bg-slate-300 hover:bg-slate-400 flex items-center justify-center text-white ring-4 ring-white shadow transition-all duration-150"
          title="Restore"
        >
          <Circle className="w-4 h-4 line-through opacity-70" />
        </button>
      );
    }
    return (
      <button 
        onClick={() => handlePhaseChange(index, 'status', 'active')}
        className="z-10 w-9 h-9 rounded-full bg-slate-200 hover:bg-indigo-50 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 border border-slate-300/40 ring-4 ring-white shadow-sm transition-all duration-150"
        title="Mark active"
      >
        <span className="text-xs font-bold">{index + 1}</span>
      </button>
    );
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
        id="slideover-backdrop"
      />

      {/* Slide-over panel container */}
      <div 
        className="fixed right-0 top-0 h-full w-full max-w-3xl bg-slate-50 shadow-2xl z-50 overflow-y-auto flex flex-col border-l border-slate-200/40"
        id="slideover-panel"
      >
        {/* Banner Sticky Header */}
        <div className="bg-white border-b border-slate-200/60 p-6 sticky top-0 z-30 flex justify-between items-center shadow-sm">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-black font-display text-slate-900">{editedApp.companyName}</h2>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full border ${
                editedApp.currentStatus.toLowerCase().includes('offer') ? 'bg-emerald-100/60 text-emerald-700 border-emerald-200' : 'bg-indigo-100/60 text-indigo-700 border-indigo-200'
              }`}>
                {editedApp.currentStatus}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-500 mt-1">{editedApp.targetRole}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Save Button */}
            <button
              onClick={handleSave}
              id="save-application-btn"
              className={`px-4.5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${
                isSaved 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow'
              }`}
            >
              <Save className="w-4 h-4" />
              {isSaved ? 'Changes Saved!' : 'Save Changes'}
            </button>

            {/* Close Cross */}
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="bg-white px-8 pt-4 border-b border-slate-100 flex gap-6">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-3 text-sm font-bold transition-all border-b-2 relative ${
              activeTab === 'timeline' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Timeline & 7-Phases
          </button>
          <button
            onClick={() => setActiveTab('core')}
            className={`pb-3 text-sm font-bold transition-all border-b-2 relative ${
              activeTab === 'core' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Core Details & Logistics
          </button>
          <button
            onClick={() => setActiveTab('mortem')}
            className={`pb-3 text-sm font-bold transition-all border-b-2 relative ${
              activeTab === 'mortem' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Post-Mortem & Skills
          </button>
        </div>

        {/* Main Panel Content */}
        <div className="flex-1 p-8">
          
          {/* TAB 1: TIMELINE & 7 PHASES */}
          {activeTab === 'timeline' && (
            <div className="space-y-10 relative pl-4" id="timeline-tab-content">
              {/* Dynamic vertical link line */}
              <div className="absolute left-8 top-3 bottom-8 w-0.5 bg-slate-200" />

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
                    <div className={`glass-panel p-5.5 rounded-2xl border transition-all duration-200 ${
                      isActive 
                        ? 'border-indigo-200 bg-white shadow-md ring-2 ring-indigo-500/10' 
                        : isCompleted
                          ? 'border-emerald-100/80 bg-white/60'
                          : 'border-slate-200/50 bg-white/30 opacity-70 hover:opacity-100'
                    }`}>
                      
                      {/* Card title and Date */}
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3.5 mb-4">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block">Stage {i+1}</span>
                          <h4 className={`font-extrabold text-sm uppercase tracking-tight ${isActive ? 'text-indigo-900' : 'text-slate-800'}`}>
                            {phase.name}
                          </h4>
                        </div>

                        {/* Date field */}
                        <div className="flex items-center gap-1.5 w-full sm:w-44">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <input
                            type="date"
                            value={phase.date}
                            onChange={(e) => handlePhaseChange(i, 'date', e.target.value)}
                            className="text-xs bg-white/70 border border-slate-200/80 py-1 px-2 rounded-lg outline-none font-semibold text-slate-700 w-full focus:bg-white focus:border-indigo-400"
                          />
                        </div>
                      </div>

                      {/* Timeline Card Status Dropdown */}
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phase State:</span>
                        <select
                          value={phase.status}
                          onChange={(e) => handlePhaseChange(i, 'status', e.target.value as any)}
                          className="text-xs font-semibold bg-white border border-slate-200 py-1 pl-2 pr-6 outline-none text-slate-600 rounded-lg max-w-[130px] cursor-pointer"
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
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Pros / Positive Signals</label>
                          <textarea
                            rows={2}
                            value={phase.pros}
                            onChange={(e) => handlePhaseChange(i, 'pros', e.target.value)}
                            placeholder="Positive metrics, culture match, system design alignments..."
                            className="text-xs bg-white/70 border border-slate-200/80 p-2.5 rounded-xl w-full focus:bg-white transition"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cons / Red Flags</label>
                          <textarea
                            rows={2}
                            value={phase.cons}
                            onChange={(e) => handlePhaseChange(i, 'cons', e.target.value)}
                            placeholder="Weak answers, timezone mismatch, compensation gaps..."
                            className="text-xs bg-white/70 border border-slate-200/80 p-2.5 rounded-xl w-full focus:bg-white transition"
                          />
                        </div>
                      </div>

                      <div className="space-y-3.5">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Remarks & Details</label>
                          <textarea
                            rows={2}
                            value={phase.remarks}
                            onChange={(e) => handlePhaseChange(i, 'remarks', e.target.value)}
                            placeholder="Coding challenge instructions, interviewer names, architecture questions asked..."
                            className="text-xs bg-white/70 border border-slate-200/80 p-2.5 rounded-xl w-full focus:bg-white transition"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">Direct Feedback Received</label>
                          <textarea
                            rows={2}
                            value={phase.feedback}
                            onChange={(e) => handlePhaseChange(i, 'feedback', e.target.value)}
                            placeholder="Direct quotes from recruiters, email score summaries..."
                            className="text-xs bg-indigo-50/40 border border-indigo-100 p-2.5 rounded-xl w-full text-indigo-900 focus:bg-white focus:border-indigo-500 transition"
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: CORE DETAILS & LOGISTICS */}
          {activeTab === 'core' && (
            <div className="space-y-6" id="core-tab-content">
              
              {/* Quick Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Employment card */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                    Employment Details
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Salary Range</label>
                      <input
                        type="text"
                        value={editedApp.salaryRange}
                        onChange={(e) => handleFieldChange('salaryRange', e.target.value)}
                        placeholder="e.g., $180k - $220k"
                        className="text-xs bg-white/80 border border-slate-200/80 p-2 rounded-lg w-full font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Other Benefits</label>
                      <input
                        type="text"
                        value={editedApp.otherBenefits}
                        onChange={(e) => handleFieldChange('otherBenefits', e.target.value)}
                        placeholder="e.g., ESPP, Unlimited PTO, Equity"
                        className="text-xs bg-white/80 border border-slate-200/80 p-2 rounded-lg w-full text-slate-700 font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Work Model</label>
                        <select
                          value={editedApp.workModel}
                          onChange={(e) => handleFieldChange('workModel', e.target.value as WorkModelType)}
                          className="text-xs bg-white/80 border border-slate-200/80 p-2 rounded-lg w-full font-semibold text-slate-700"
                        >
                          <option value="Remote">Remote</option>
                          <option value="Hybrid">Hybrid</option>
                          <option value="Onsite">Onsite</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Location</label>
                        <input
                          type="text"
                          value={editedApp.location}
                          onChange={(e) => handleFieldChange('location', e.target.value)}
                          placeholder="City, State"
                          className="text-xs bg-white/80 border border-slate-200/80 p-2 rounded-lg w-full font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logistics & HR card */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                    HR & Application Link Logistics
                  </h4>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">HR / Recruiter Contact</label>
                      <input
                        type="text"
                        value={editedApp.hrContact}
                        onChange={(e) => handleFieldChange('hrContact', e.target.value)}
                        placeholder="Name, Email, or phone"
                        className="text-xs bg-white/80 border border-slate-200/80 p-2 rounded-lg w-full font-semibold text-slate-800"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Applied Via</label>
                        <select
                          value={editedApp.appliedVia}
                          onChange={(e) => handleFieldChange('appliedVia', e.target.value as AppliedViaType)}
                          className="text-xs bg-white/80 border border-slate-200/80 p-2 rounded-lg w-full font-semibold text-slate-700"
                        >
                          <option value="LinkedIn">LinkedIn</option>
                          <option value="Email">Email</option>
                          <option value="Company Form">Company Form</option>
                          <option value="Referral">Referral</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Current Status Banner</label>
                        <input
                          type="text"
                          value={editedApp.currentStatus}
                          onChange={(e) => handleFieldChange('currentStatus', e.target.value)}
                          placeholder="Current Status"
                          className="text-xs bg-white/80 border border-slate-200/80 p-2 rounded-lg w-full font-bold text-indigo-700"
                        />
                      </div>
                    </div>

                    {/* Anchor Assets */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Resume Link</label>
                        <div className="flex gap-1">
                          <input
                            type="url"
                            value={editedApp.resumeLink}
                            onChange={(e) => handleFieldChange('resumeLink', e.target.value)}
                            placeholder="e.g. Drive PDF Link"
                            className="text-xs bg-white/80 border border-slate-200/80 p-2 rounded-lg w-full text-slate-600 font-mono"
                          />
                          {editedApp.resumeLink && (
                            <a 
                              href={editedApp.resumeLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0"
                            >
                              <ExternalLink className="w-4.5 h-4.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Portfolio Link</label>
                        <div className="flex gap-1">
                          <input
                            type="url"
                            value={editedApp.portfolioLink}
                            onChange={(e) => handleFieldChange('portfolioLink', e.target.value)}
                            placeholder="e.g. GitHub profile"
                            className="text-xs bg-white/80 border border-slate-200/80 p-2 rounded-lg w-full text-slate-600 font-mono"
                          />
                          {editedApp.portfolioLink && (
                            <a 
                              href={editedApp.portfolioLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0"
                            >
                              <ExternalLink className="w-4.5 h-4.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Key JD Requirements */}
                <div className="col-span-1 md:col-span-2 glass-panel p-6 rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
                  <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                    Key Job Description Requirements & Stack
                  </h4>
                  <textarea
                    rows={4}
                    value={editedApp.keyJdRequirements}
                    onChange={(e) => handleFieldChange('keyJdRequirements', e.target.value)}
                    placeholder="Paste the key highlights, stack details, framework needs, and experience bars from the Job Spec..."
                    className="text-xs bg-white/85 border border-slate-200/80 p-3 rounded-xl w-full leading-relaxed focus:bg-white text-slate-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: POST-MORTEM */}
          {activeTab === 'mortem' && (
            <div className="space-y-6" id="mortem-tab-content">
              <div className="glass-card-dark text-white p-8 rounded-3xl space-y-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Award className="w-40 h-40" />
                </div>

                <div className="border-b border-white/10 pb-4">
                  <h3 className="text-xl font-bold flex items-center gap-2">
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
                      className="text-xs bg-slate-800/80 border border-slate-700 p-3.5 rounded-xl w-full text-slate-100 focus:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
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
                      className="text-xs bg-slate-800/80 border border-slate-700 p-3.5 rounded-xl w-full text-slate-100 focus:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Self-Rating bar */}
                  <div className="border-t border-white/10 pt-4">
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
            </div>
          )}

        </div>
        
        {/* Footer sticky bar */}
        <div className="bg-white border-t border-slate-200/60 p-4 sticky bottom-0 z-30 flex justify-end gap-3 px-6 shadow-inner">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
          >
            Close Detail View
          </button>
          <button
            onClick={handleSave}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${
              isSaved 
                ? 'bg-emerald-500 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow'
            }`}
          >
            <Save className="w-4 h-4" />
            {isSaved ? 'Changes Saved!' : 'Save & Sync Details'}
          </button>
        </div>
      </div>
    </>
  );
}
