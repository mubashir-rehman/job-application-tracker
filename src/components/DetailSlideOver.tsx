import React, { useState, useEffect } from 'react';
import { JobApplication, InterviewPhase, WorkModelType, AppliedViaType } from '../types';
import { deriveCurrentStatus } from '../lib/appUtils';
import {
  X, Save, ArrowRight, GitBranch, MessageSquare, ThumbsUp, ThumbsDown,
  Quote, Clock, ChevronDown, Calendar, Link2, ExternalLink, Users,
  Award, Star, Briefcase,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DetailSlideOverProps {
  application: JobApplication | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateApplication: (app: JobApplication) => void;
  /** Render inline as a shell column (desktop) instead of an overlay sheet (mobile/narrow). */
  asPane?: boolean;
}

// ── helpers ──────────────────────────────────────────────
const cleanPhaseName = (n: string) => n.replace(/^Phase\s*\d+:\s*/i, '');
const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
const daysBetween = (a: string, b: string) => {
  if (!a || !b) return null;
  const d = Math.round((+new Date(b) - +new Date(a)) / 86400000);
  return isNaN(d) ? null : d;
};
const daysSince = (a: string) => {
  if (!a) return null;
  const d = Math.round((Date.now() - +new Date(a)) / 86400000);
  return isNaN(d) ? null : d;
};

const STATUS_CYCLE: InterviewPhase['status'][] = ['upcoming', 'active', 'completed', 'skipped'];

// Module-level so they keep a stable identity across renders (otherwise the
// inputs they wrap would remount and lose focus on every keystroke).
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Section({ icon: Icon, title, hint, open, onToggle, children }: {
  icon: any; title: string; hint?: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border-t border-slate-800/70">
      <button onClick={onToggle} className="w-full flex items-center gap-2.5 py-3.5 text-left" aria-expanded={open}>
        <Icon className="w-4 h-4 text-slate-500 shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</span>
        {hint && <span className="text-[11px] text-slate-600 font-medium truncate">{hint}</span>}
        <ChevronDown className={`w-4 h-4 text-slate-500 ml-auto shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="pb-5 space-y-4">{children}</div>}
    </div>
  );
}

export function DetailSlideOver({ application, isOpen, onClose, onUpdateApplication, asPane = false }: DetailSlideOverProps) {
  const [editedApp, setEditedApp] = useState<JobApplication | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>({});
  const [openSections, setOpenSections] = useState({ details: false, contacts: false, retro: false });

  useEffect(() => {
    if (application) {
      setEditedApp(JSON.parse(JSON.stringify(application)));
      setIsSaved(false);
    } else {
      setEditedApp(null);
    }
  }, [application]);

  // Expand the active phase (or the first) on open.
  useEffect(() => {
    if (!editedApp) return;
    const initial: Record<number, boolean> = {};
    let hasActive = false;
    editedApp.phases.forEach((p, idx) => {
      initial[idx] = p.status === 'active';
      if (p.status === 'active') hasActive = true;
    });
    if (!hasActive && editedApp.phases.length > 0) initial[0] = true;
    setExpandedPhases(initial);
  }, [editedApp?.id]);

  if (!editedApp) return null;

  const togglePhase = (i: number) =>
    setExpandedPhases(prev => ({ ...prev, [i]: !prev[i] }));

  const handleFieldChange = (field: keyof JobApplication, value: any) =>
    setEditedApp(prev => prev ? { ...prev, [field]: value } : prev);

  const handlePhaseChange = (index: number, key: keyof InterviewPhase, value: any) => {
    setEditedApp(prev => {
      if (!prev) return prev;
      const phases = [...prev.phases];
      phases[index] = { ...phases[index], [key]: value };
      return { ...prev, phases, currentStatus: deriveCurrentStatus(phases) };
    });
    if (key === 'status') setExpandedPhases(prev => ({ ...prev, [index]: true }));
  };

  const handlePostMortemChange = (key: string, value: any) =>
    setEditedApp(prev => prev ? { ...prev, postMortem: { ...prev.postMortem, [key]: value } } : prev);

  const handleSave = () => {
    onUpdateApplication(editedApp);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2200);
  };

  // ── derived status / velocity ──────────────────────────
  const phases = editedApp.phases;
  const completedCount = phases.filter(p => p.status === 'completed').length;
  const activeIndex = phases.findIndex(p => p.status === 'active');
  const lastIndex = phases.length - 1;
  const activePhase = activeIndex !== -1 ? phases[activeIndex] : null;

  const timeInStage = activePhase
    ? daysSince(activePhase.date || editedApp.createdAt)
    : daysSince(editedApp.createdAt);
  const stalled = activeIndex !== -1 && timeInStage != null && timeInStage >= 10;

  let nextAction = 'Log your application progress.';
  if (activeIndex !== -1) {
    nextAction = activeIndex === lastIndex
      ? 'Offer stage — review and negotiate.'
      : `Awaiting the outcome of ${cleanPhaseName(phases[activeIndex].name)}.`;
  } else if (completedCount === phases.length) {
    nextAction = 'Pipeline complete.';
  } else if (completedCount > 0) {
    nextAction = 'Advance to the next stage.';
  }

  // most recent earlier date, used to measure how long each step took
  const prevDate = (i: number) => {
    for (let j = i - 1; j >= 0; j--) if (phases[j].date) return phases[j].date;
    return editedApp.createdAt;
  };

  const statusTone = (s: string) => {
    const t = s.toLowerCase();
    if (t.includes('offer')) return 'text-emerald-500';
    if (t.includes('reject') || t.includes('archived') || t.includes('fail')) return 'text-rose-500';
    return 'text-indigo-500 dark:text-indigo-400';
  };

  const toggleSection = (id: keyof typeof openSections) =>
    setOpenSections(p => ({ ...p, [id]: !p[id] }));

  const inputCls = 'w-full bg-slate-950/50 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500 transition';

  // ── body ───────────────────────────────────────────────
  const body = (
    <>
      {/* Status header */}
      <header className="shrink-0 px-5 pt-5 pb-4 border-b border-slate-800/70">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-black font-display text-lg shrink-0">
              {editedApp.companyName.charAt(0)}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black font-display text-slate-100 tracking-tight truncate">{editedApp.companyName}</h2>
              <p className="text-xs text-slate-400 font-medium truncate">
                {editedApp.targetRole} · {editedApp.workModel} · <span className="font-mono text-slate-300">{editedApp.salaryRange}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              onClick={handleSave}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 h-auto transition ${
                isSaved ? 'bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              {isSaved ? 'Saved' : 'Save'}
            </Button>
            <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* current stage + next action */}
        <div className="mt-3.5 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm">
            <span className={`text-base leading-none ${statusTone(editedApp.currentStatus)}`}>●</span>
            <span className="font-bold text-slate-200">{editedApp.currentStatus}</span>
            {timeInStage != null && activeIndex !== -1 && (
              <span className="text-[11px] font-mono text-slate-500">· {timeInStage}d in stage</span>
            )}
          </div>
          <div className="flex items-start gap-1.5 text-xs text-slate-400">
            <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-slate-600 shrink-0" />
            <span>{nextAction}</span>
          </div>
          {stalled && (
            <div className="mt-1.5 flex items-center gap-2 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              Quiet for {timeInStage} days — consider a follow-up.
            </div>
          )}
        </div>
      </header>

      {/* Scroll body */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="max-w-2xl mx-auto">

          {/* PIPELINE spine */}
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pipeline</span>
            <span className="text-[11px] text-slate-600 font-mono ml-auto">{completedCount}/{phases.length} stages</span>
          </div>

          <div className="relative">
            {phases.map((phase, i) => {
              const isActive = phase.status === 'active';
              const isCompleted = phase.status === 'completed';
              const isSkipped = phase.status === 'skipped';
              const expanded = !!expandedPhases[i];
              const gap = isActive
                ? (daysSince(phase.date || prevDate(i)) != null ? `${daysSince(phase.date || prevDate(i))}d in stage` : 'now')
                : isCompleted && phase.date
                  ? (() => { const g = daysBetween(prevDate(i), phase.date); return g == null ? '' : g <= 0 ? 'same day' : `${g}d`; })()
                  : '';

              return (
                <div key={i} className="relative pl-8 pb-3 last:pb-0">
                  {/* thread */}
                  {i < phases.length - 1 && (
                    <div className={`absolute left-[7px] top-5 bottom-0 w-px ${isCompleted ? 'bg-emerald-500/40' : 'bg-slate-800'}`} />
                  )}
                  {/* node dot */}
                  <div
                    onClick={() => handlePhaseChange(i, 'status', STATUS_CYCLE[(STATUS_CYCLE.indexOf(phase.status) + 1) % STATUS_CYCLE.length])}
                    title="Click to change stage status"
                    className={`absolute left-0 top-1 w-[15px] h-[15px] rounded-full cursor-pointer transition ${
                      isCompleted ? 'bg-emerald-500' :
                      isActive ? 'bg-indigo-500 ring-4 ring-indigo-500/15' :
                      isSkipped ? 'bg-slate-700' :
                      'bg-slate-800 border border-slate-700'
                    }`}
                  />

                  {/* node header row */}
                  <div
                    onClick={() => togglePhase(i)}
                    className={`flex items-center justify-between gap-2 cursor-pointer rounded-lg px-2.5 py-2 -mx-1 transition ${
                      isActive ? 'bg-indigo-500/[0.06]' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className={`text-sm font-bold truncate ${isActive ? 'text-indigo-600 dark:text-indigo-300' : isCompleted ? 'text-slate-200' : 'text-slate-400'}`}>
                        {cleanPhaseName(phase.name)}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 mt-0.5">
                        <span>{phase.date ? fmtDate(phase.date) : 'no date'}</span>
                        {gap && <><span className="text-slate-700">·</span><span className={isActive && stalled ? 'text-amber-500' : ''}>{gap}</span></>}
                        {!expanded && (phase.pros || phase.cons || phase.feedback) && (
                          <span className="flex items-center gap-1 ml-0.5">
                            {phase.pros && <ThumbsUp className="w-3 h-3 text-emerald-500" />}
                            {phase.cons && <ThumbsDown className="w-3 h-3 text-rose-500" />}
                            {phase.feedback && <Quote className="w-3 h-3 text-indigo-400" />}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </div>

                  {/* expanded journal entry */}
                  {expanded && (
                    <div className="mt-2.5 ml-1 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                      {/* date + status */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-slate-950/50 px-2.5 py-1.5 rounded-lg border border-slate-800">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <input
                            type="date"
                            value={phase.date}
                            onChange={e => handlePhaseChange(i, 'date', e.target.value)}
                            className="text-xs bg-transparent outline-none text-slate-300 font-medium w-[110px]"
                          />
                        </div>
                        <div className="flex gap-0.5 bg-slate-950/50 p-0.5 rounded-lg border border-slate-800">
                          {STATUS_CYCLE.map(st => (
                            <button
                              key={st}
                              onClick={() => handlePhaseChange(i, 'status', st)}
                              className={`px-2 py-1 text-[9px] font-bold uppercase tracking-wide rounded-md transition ${
                                phase.status === st
                                  ? st === 'completed' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : st === 'active' ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-700 text-slate-200'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Field label="What happened">
                        <textarea
                          rows={2}
                          value={phase.remarks}
                          onChange={e => handlePhaseChange(i, 'remarks', e.target.value)}
                          placeholder="Interviewer, format, topics, homework…"
                          className={`${inputCls} resize-none leading-relaxed`}
                        />
                      </Field>

                      <div className="grid grid-cols-2 gap-2.5">
                        <label className="block space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> Good</span>
                          <textarea rows={2} value={phase.pros} onChange={e => handlePhaseChange(i, 'pros', e.target.value)} placeholder="What went well" className={`${inputCls} resize-none leading-relaxed`} />
                        </label>
                        <label className="block space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1"><ThumbsDown className="w-3 h-3" /> Risk</span>
                          <textarea rows={2} value={phase.cons} onChange={e => handlePhaseChange(i, 'cons', e.target.value)} placeholder="Concerns / gaps" className={`${inputCls} resize-none leading-relaxed`} />
                        </label>
                      </div>

                      <label className="block space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1"><Quote className="w-3 h-3" /> Their words</span>
                        <textarea rows={2} value={phase.feedback} onChange={e => handlePhaseChange(i, 'feedback', e.target.value)} placeholder="Direct quotes from the recruiter / interviewer" className={`${inputCls} resize-none leading-relaxed italic`} />
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* DETAILS */}
          <div className="mt-6">
            <Section icon={Briefcase} title="Details" hint={`${editedApp.workModel} · ${editedApp.location}`} open={openSections.details} onToggle={() => toggleSection('details')}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Compensation">
                  <input value={editedApp.salaryRange} onChange={e => handleFieldChange('salaryRange', e.target.value)} placeholder="$120k – $150k" className={inputCls} />
                </Field>
                <Field label="Benefits / Equity">
                  <input value={editedApp.otherBenefits} onChange={e => handleFieldChange('otherBenefits', e.target.value)} placeholder="Bonus, equity, health" className={inputCls} />
                </Field>
                <Field label="Work model">
                  <select value={editedApp.workModel} onChange={e => handleFieldChange('workModel', e.target.value as WorkModelType)} className={`${inputCls} cursor-pointer`}>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Onsite">Onsite</option>
                  </select>
                </Field>
                <Field label="Location">
                  <input value={editedApp.location} onChange={e => handleFieldChange('location', e.target.value)} placeholder="City, Country" className={inputCls} />
                </Field>
              </div>
              <Field label="Job description / keywords">
                <textarea rows={3} value={editedApp.keyJdRequirements} onChange={e => handleFieldChange('keyJdRequirements', e.target.value)} placeholder="Stack, requirements, keywords…" className={`${inputCls} resize-y leading-relaxed`} />
              </Field>
            </Section>

            {/* CONTACTS & LINKS */}
            <Section icon={Users} title="Contacts & Links" hint={editedApp.hrContact || undefined} open={openSections.contacts} onToggle={() => toggleSection('contacts')}>
              <Field label="Recruiter / contact">
                <input value={editedApp.hrContact} onChange={e => handleFieldChange('hrContact', e.target.value)} placeholder="Name · email · LinkedIn" className={inputCls} />
              </Field>
              <Field label="Applied via">
                <select value={editedApp.appliedVia} onChange={e => handleFieldChange('appliedVia', e.target.value as AppliedViaType)} className={`${inputCls} cursor-pointer`}>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Email">Email</option>
                  <option value="Company Form">Company Form</option>
                  <option value="Referral">Referral</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
              <Field label="Resume sent">
                <div className="flex gap-1.5">
                  <input value={editedApp.resumeLink} onChange={e => handleFieldChange('resumeLink', e.target.value)} placeholder="https://…" className={`${inputCls} font-mono`} />
                  {editedApp.resumeLink && (
                    <a href={editedApp.resumeLink} target="_blank" rel="noopener noreferrer" className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0 transition" aria-label="Open resume">
                      <Link2 className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </Field>
              <Field label="Portfolio / repo">
                <div className="flex gap-1.5">
                  <input value={editedApp.portfolioLink} onChange={e => handleFieldChange('portfolioLink', e.target.value)} placeholder="https://…" className={`${inputCls} font-mono`} />
                  {editedApp.portfolioLink && (
                    <a href={editedApp.portfolioLink} target="_blank" rel="noopener noreferrer" className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0 transition" aria-label="Open portfolio">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </Field>
            </Section>

            {/* RETRO */}
            <Section icon={Award} title="Retro & Learnings" open={openSections.retro} onToggle={() => toggleSection('retro')}>
              <Field label="Skill gaps to close">
                <textarea rows={2} value={editedApp.postMortem.skillsImprovements} onChange={e => handlePostMortemChange('skillsImprovements', e.target.value)} placeholder="What to study / practice before the next round" className={`${inputCls} resize-none leading-relaxed`} />
              </Field>
              <Field label="Prep notes">
                <textarea rows={2} value={editedApp.postMortem.preparationNotes} onChange={e => handlePostMortemChange('preparationNotes', e.target.value)} placeholder="How to prepare next time" className={`${inputCls} resize-none leading-relaxed`} />
              </Field>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Self rating</span>
                  <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400">{editedApp.postMortem.selfRating}/10</span>
                </div>
                <input type="range" min={0} max={10} step={0.5} value={editedApp.postMortem.selfRating} onChange={e => handlePostMortemChange('selfRating', parseFloat(e.target.value))} className="w-full accent-indigo-500 cursor-pointer" />
                <div className="flex gap-0.5 justify-end">
                  {[...Array(5)].map((_, idx) => {
                    const r = (idx + 1) * 2;
                    return <Star key={idx} className={`w-3.5 h-3.5 ${editedApp.postMortem.selfRating >= r ? 'text-amber-400 fill-amber-400' : editedApp.postMortem.selfRating >= r - 1 ? 'text-amber-400/60 fill-amber-400/20' : 'text-slate-700'}`} />;
                  })}
                </div>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </>
  );

  // Desktop: inline detail pane filling its shell column.
  if (asPane) {
    return (
      <div className="flex flex-col h-full w-full bg-slate-950 border-l border-slate-800 overflow-hidden">
        {body}
      </div>
    );
  }

  // Mobile / narrow: overlay sheet.
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-xl h-[90dvh] max-h-[90dvh] flex flex-col p-0 overflow-hidden bg-slate-950 border border-slate-800 rounded-2xl focus:outline-none"
        showCloseButton={false}
      >
        {body}
      </DialogContent>
    </Dialog>
  );
}
