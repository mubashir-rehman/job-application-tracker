import React, { useState } from 'react';
import { JobApplication, WorkModelType, AppliedViaType, PriorityLevel, InterviewPhase } from '../types';
import { createDefaultPhases } from '../data';
import { deriveCurrentStatus, extractTechTags } from '../lib/appUtils';
import { X, Check, ChevronDown, Calendar, Wand2 } from 'lucide-react';

interface NewApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddApplication: (app: JobApplication) => void;
}

type IntakeStatus = 'saved' | 'applied' | 'interviewing';

const inputCls = 'w-full bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition';

// Module-level so the wrapped inputs don't remount (and lose focus) on each keystroke.
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-0.5 bg-slate-950/50 p-0.5 rounded-lg border border-slate-800 w-full">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 px-2 py-1.5 text-[11px] font-bold rounded-md transition ${
            value === o.value ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Build the phase array + status from the intake choice.
function buildPhases(intake: IntakeStatus, appliedDate: string): { phases: InterviewPhase[]; currentStatus: string } {
  const phases = createDefaultPhases();
  if (intake === 'saved') {
    phases.forEach(p => { p.status = 'upcoming'; });
    return { phases, currentStatus: 'Saved' };
  }
  if (intake === 'interviewing') {
    phases[0].status = 'completed';
    phases[0].date = appliedDate;
    phases[1].status = 'active';
  } else { // applied
    phases[0].status = 'active';
    phases[0].date = appliedDate;
  }
  return { phases, currentStatus: deriveCurrentStatus(phases) };
}

export function NewApplicationModal({ isOpen, onClose, onAddApplication }: NewApplicationModalProps) {
  const today = new Date().toISOString().slice(0, 10);

  const [jdInput, setJdInput] = useState('');       // primary: a link or pasted JD
  const [companyName, setCompanyName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [intakeStatus, setIntakeStatus] = useState<IntakeStatus>('applied');
  const [appliedDate, setAppliedDate] = useState(today);
  const [appliedVia, setAppliedVia] = useState<AppliedViaType>('LinkedIn');

  const [showMore, setShowMore] = useState(false);
  const [workModel, setWorkModel] = useState<WorkModelType>('Remote');
  const [location, setLocation] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [otherBenefits, setOtherBenefits] = useState('');
  const [hrContact, setHrContact] = useState('');
  const [resumeLink, setResumeLink] = useState('');
  const [portfolioLink, setPortfolioLink] = useState('');
  const [keyJdRequirements, setKeyJdRequirements] = useState('');
  const [priority, setPriority] = useState<PriorityLevel | ''>('');

  const [errors, setErrors] = useState<{ companyName?: string; targetRole?: string }>({});

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Best-effort local autofill: pull known keywords from the JD into the
  // requirements field. Full company/role/comp parsing arrives with the pipeline.
  const autofillFromJd = () => {
    if (!jdInput.trim()) return;
    setShowMore(true);
    if (!keyJdRequirements.trim()) {
      const tags = extractTechTags(jdInput);
      const onlyUrl = /^https?:\/\/\S+$/.test(jdInput.trim());
      setKeyJdRequirements(tags.length ? tags.join(', ') : (onlyUrl ? '' : jdInput.trim()));
    }
  };

  const reset = () => {
    setJdInput(''); setCompanyName(''); setTargetRole('');
    setIntakeStatus('applied'); setAppliedDate(today); setAppliedVia('LinkedIn');
    setShowMore(false); setWorkModel('Remote'); setLocation(''); setSalaryRange('');
    setOtherBenefits(''); setHrContact(''); setResumeLink(''); setPortfolioLink('');
    setKeyJdRequirements(''); setPriority(''); setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!companyName.trim()) newErrors.companyName = 'Required';
    if (!targetRole.trim()) newErrors.targetRole = 'Required';
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    // Split the primary field into a source URL and/or raw JD text.
    const urlMatch = jdInput.match(/https?:\/\/\S+/);
    const jdUrl = urlMatch ? urlMatch[0] : undefined;
    const trimmed = jdInput.trim();
    const jdText = trimmed && trimmed !== jdUrl ? trimmed : undefined;

    const created = new Date(`${appliedDate}T12:00:00`).toISOString();
    const { phases, currentStatus } = buildPhases(intakeStatus, appliedDate);

    const newApp: JobApplication = {
      id: `app-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      companyName: companyName.trim(),
      targetRole: targetRole.trim(),
      workModel,
      location: location.trim() || (workModel === 'Remote' ? 'Remote' : ''),
      salaryRange: salaryRange.trim(),
      otherBenefits: otherBenefits.trim(),
      hrContact: hrContact.trim(),
      appliedVia,
      resumeLink: resumeLink.trim(),
      portfolioLink: portfolioLink.trim(),
      keyJdRequirements: keyJdRequirements.trim(),
      jdUrl,
      jdText,
      priority: priority || undefined,
      phases,
      currentStatus,
      postMortem: { skillsImprovements: '', preparationNotes: '', selfRating: 5 },
      createdAt: created,
    };

    onAddApplication(newApp);
    reset();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-panel bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col elevation-3"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-black font-display text-slate-100">Add application</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">

            {/* Primary: JD link or text */}
            <Field label="Job link or description">
              <div className="space-y-1.5">
                <textarea
                  rows={3}
                  value={jdInput}
                  onChange={e => setJdInput(e.target.value)}
                  placeholder="Paste a LinkedIn / careers link, or the full job description…"
                  className={`${inputCls} resize-none leading-relaxed`}
                  autoFocus
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-600">Kept with this application. Full auto-fill comes with the pipeline.</span>
                  <button
                    type="button"
                    onClick={autofillFromJd}
                    disabled={!jdInput.trim()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 disabled:opacity-40 text-[11px] font-bold text-slate-300 transition"
                  >
                    <Wand2 className="w-3 h-3 text-indigo-400" /> Autofill keywords
                  </button>
                </div>
              </div>
            </Field>

            {/* Company + role */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Company *">
                <input
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g. Tano AI"
                  className={`${inputCls} ${errors.companyName ? 'border-rose-500' : ''}`}
                />
                {errors.companyName && <span className="text-[10px] text-rose-500 font-bold">{errors.companyName}</span>}
              </Field>
              <Field label="Role *">
                <input
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                  placeholder="e.g. Backend Engineer"
                  className={`${inputCls} ${errors.targetRole ? 'border-rose-500' : ''}`}
                />
                {errors.targetRole && <span className="text-[10px] text-rose-500 font-bold">{errors.targetRole}</span>}
              </Field>
            </div>

            {/* Status / date / channel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Status">
                <Segmented
                  value={intakeStatus}
                  onChange={setIntakeStatus}
                  options={[{ value: 'saved', label: 'Saved' }, { value: 'applied', label: 'Applied' }, { value: 'interviewing', label: 'Interviewing' }]}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={intakeStatus === 'saved' ? 'Saved on' : 'Applied on'}>
                  <div className="flex items-center gap-1.5 bg-slate-950/50 border border-slate-800 rounded-lg px-2.5 py-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <input type="date" value={appliedDate} onChange={e => setAppliedDate(e.target.value)} className="bg-transparent text-xs text-slate-200 outline-none w-full" />
                  </div>
                </Field>
                <Field label="Via">
                  <select value={appliedVia} onChange={e => setAppliedVia(e.target.value as AppliedViaType)} className={`${inputCls} cursor-pointer`}>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Email">Email</option>
                    <option value="Company Form">Company Form</option>
                    <option value="Referral">Referral</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>
              </div>
            </div>

            {/* More details (collapsible) */}
            <div className="border-t border-slate-800/70 pt-1">
              <button
                type="button"
                onClick={() => setShowMore(v => !v)}
                className="w-full flex items-center gap-2 py-2.5 text-left"
                aria-expanded={showMore}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">More details</span>
                <span className="text-[11px] text-slate-600">comp · contact · resume · keywords · priority</span>
                <ChevronDown className={`w-4 h-4 text-slate-500 ml-auto transition-transform ${showMore ? 'rotate-180' : ''}`} />
              </button>

              {showMore && (
                <div className="space-y-4 pb-1 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Work model">
                      <select value={workModel} onChange={e => setWorkModel(e.target.value as WorkModelType)} className={`${inputCls} cursor-pointer`}>
                        <option value="Remote">Remote</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="Onsite">Onsite</option>
                      </select>
                    </Field>
                    <Field label="Location">
                      <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" className={inputCls} />
                    </Field>
                    <Field label="Compensation">
                      <input value={salaryRange} onChange={e => setSalaryRange(e.target.value)} placeholder="$120k – $150k (posted or expected)" className={inputCls} />
                    </Field>
                    <Field label="Benefits / equity">
                      <input value={otherBenefits} onChange={e => setOtherBenefits(e.target.value)} placeholder="Bonus, equity, health" className={inputCls} />
                    </Field>
                  </div>

                  <Field label="Recruiter / contact">
                    <input value={hrContact} onChange={e => setHrContact(e.target.value)} placeholder="Name · email · LinkedIn" className={inputCls} />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Resume sent">
                      <input type="url" value={resumeLink} onChange={e => setResumeLink(e.target.value)} placeholder="https://…" className={`${inputCls} font-mono`} />
                    </Field>
                    <Field label="Portfolio / repo">
                      <input type="url" value={portfolioLink} onChange={e => setPortfolioLink(e.target.value)} placeholder="https://…" className={`${inputCls} font-mono`} />
                    </Field>
                  </div>

                  <Field label="Requirements / keywords">
                    <textarea rows={3} value={keyJdRequirements} onChange={e => setKeyJdRequirements(e.target.value)} placeholder="Stack, must-haves, keywords…" className={`${inputCls} resize-y leading-relaxed`} />
                  </Field>

                  <Field label="Priority">
                    <Segmented
                      value={priority || 'none'}
                      onChange={(v) => setPriority(v === 'none' ? '' : v as PriorityLevel)}
                      options={[{ value: 'none' as any, label: '—' }, { value: 'stretch' as any, label: 'Stretch' }, { value: 'strong' as any, label: 'Strong match' }, { value: 'backup' as any, label: 'Backup' }]}
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-800 flex justify-end gap-2.5 shrink-0 bg-slate-900">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-800 transition">
              Cancel
            </button>
            <button type="submit" id="submit-new-app-btn" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition">
              <Check className="w-4 h-4" /> Save application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
