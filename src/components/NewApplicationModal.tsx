import React, { useState } from 'react';
import { JobApplication, WorkModelType, AppliedViaType, PriorityLevel, InterviewPhase } from '../types';
import { createDefaultPhases } from '../data';
import { deriveCurrentStatus, extractTechTags } from '../lib/appUtils';
import { WORK_MODELS, APPLIED_VIA } from '../lib/statusStyles';
import { Field, Segmented, OptionSelect, fieldInput } from './common/Field';
import { Modal, ModalHeader } from './common/Modal';
import { Check, ChevronDown, Calendar, Sparkles, AlertCircle, Globe } from 'lucide-react';
import { parseJd, ParsedJdFields, JdResearch } from '../lib/apiClient';
import { resolveProviderConfig } from '../lib/providerConfig';
import { loadSearchKey } from '../lib/searchConfig';

interface NewApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddApplication: (app: JobApplication) => void;
}

type IntakeStatus = 'saved' | 'applied' | 'interviewing';

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

  const [autofilling, setAutofilling] = useState(false);
  const [autofillError, setAutofillError] = useState<string | null>(null);
  const [autofillNote, setAutofillNote] = useState<{ filled: string[]; gaps: string[]; usedLLM: boolean; fetched: boolean } | null>(null);

  const [researching, setResearching] = useState(false);
  const [research, setResearch] = useState<JdResearch | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);

  // Apply parsed fields without clobbering anything the user already typed.
  const applyParsed = (f: ParsedJdFields): string[] => {
    const filled: string[] = [];
    const fillEmpty = (cur: string, set: (v: string) => void, val: string | null | undefined, label: string) => {
      if (val && val.trim() && !cur.trim()) { set(val.trim()); filled.push(label); }
    };
    fillEmpty(companyName, setCompanyName, f.companyName, 'Company');
    fillEmpty(targetRole, setTargetRole, f.targetRole, 'Role');
    fillEmpty(location, setLocation, f.location, 'Location');
    fillEmpty(salaryRange, setSalaryRange, f.salaryRange, 'Compensation');
    fillEmpty(otherBenefits, setOtherBenefits, f.otherBenefits, 'Benefits');
    fillEmpty(hrContact, setHrContact, f.hrContact, 'Contact');
    if (!keyJdRequirements.trim()) {
      const req = f.keyRequirements?.trim() || (f.techTags?.length ? f.techTags.join(', ') : '');
      if (req) { setKeyJdRequirements(req); filled.push('Requirements'); }
    }
    // Work model / channel are inferences — autofill is an explicit action, so set them.
    if (f.workModel) { setWorkModel(f.workModel); filled.push('Work model'); }
    if (f.appliedVia) { setAppliedVia(f.appliedVia); filled.push('Via'); }
    return filled;
  };

  // Deterministic-first parse (the LangGraph pipeline). Runs key-less when no
  // provider is configured; uses the LLM only when the post needs it.
  const handleAutofill = async () => {
    const raw = jdInput.trim();
    if (!raw) return;
    setAutofilling(true);
    setAutofillError(null);
    setAutofillNote(null);
    setShowMore(true);
    const urlMatch = raw.match(/https?:\/\/\S+/);
    const onlyUrl = /^https?:\/\/\S+$/.test(raw);
    const cfg = resolveProviderConfig();
    try {
      const res = await parseJd({ jdText: onlyUrl ? undefined : raw, jdUrl: urlMatch?.[0], ...(cfg || {}) });
      const filled = applyParsed(res.fields);
      setAutofillNote({ filled, gaps: res.gaps, usedLLM: res.usedLLM, fetched: res.fetched });
    } catch (e) {
      // Graceful fallback: at least drop known tech keywords into requirements.
      const tags = extractTechTags(raw);
      if (tags.length && !keyJdRequirements.trim()) setKeyJdRequirements(tags.join(', '));
      setAutofillError(e instanceof Error ? e.message : 'Autofill failed — fill the fields manually.');
    } finally {
      setAutofilling(false);
    }
  };

  // Opt-in company research. Prefers a serper.dev search key (no LLM tokens);
  // falls back to a Gemini key (grounding). Sends a minimal labeled text so the
  // pipeline goes straight to the enrich node (no extra gap-fill LLM call).
  const handleResearch = async () => {
    const company = companyName.trim();
    if (!company) return;
    const searchKey = loadSearchKey();
    const geminiCfg = resolveProviderConfig('gemini');
    const hasGemini = geminiCfg?.provider === 'gemini';
    if (!searchKey && !hasGemini) {
      setResearchError('Add a serper.dev search key or a Gemini key in “API Keys” to research the company.');
      return;
    }
    setResearching(true);
    setResearchError(null);
    setResearch(null);
    const jdText = `Company: ${company}`
      + (targetRole.trim() ? `\nRole: ${targetRole.trim()}` : '')
      + (salaryRange.trim() ? `\nSalary: ${salaryRange.trim()}` : '');
    try {
      const res = await parseJd({
        jdText,
        enrich: true,
        searchKey: searchKey || undefined,
        ...(hasGemini ? geminiCfg : {}),
      });
      setResearch(res.research || { unsupported: true });
    } catch (e) {
      setResearchError(e instanceof Error ? e.message : 'Research failed');
    } finally {
      setResearching(false);
    }
  };

  const reset = () => {
    setJdInput(''); setCompanyName(''); setTargetRole('');
    setIntakeStatus('applied'); setAppliedDate(today); setAppliedVia('LinkedIn');
    setShowMore(false); setWorkModel('Remote'); setLocation(''); setSalaryRange('');
    setOtherBenefits(''); setHrContact(''); setResumeLink(''); setPortfolioLink('');
    setKeyJdRequirements(''); setPriority(''); setErrors({});
    setAutofilling(false); setAutofillError(null); setAutofillNote(null);
    setResearching(false); setResearch(null); setResearchError(null);
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
    <Modal open={isOpen} onClose={onClose}>
      <div
        className="relative glass-panel bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col elevation-3"
        onClick={e => e.stopPropagation()}
      >
        <ModalHeader title="Add application" onClose={onClose} />

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
                  className={`${fieldInput} resize-none leading-relaxed`}
                  autoFocus
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-600">Kept with this application. Autofill reads it deterministically first, AI only if needed.</span>
                  <button
                    type="button"
                    onClick={handleAutofill}
                    disabled={!jdInput.trim() || autofilling}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-[11px] font-bold text-white transition shrink-0"
                  >
                    {autofilling
                      ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Reading…</>
                      : <><Sparkles className="w-3 h-3" /> Autofill from JD</>}
                  </button>
                </div>
              </div>
            </Field>

            {autofillError && (
              <div className="flex items-start gap-2 text-[11px] text-rose-300 bg-rose-950/20 border border-rose-900/40 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" /> {autofillError}
              </div>
            )}

            {autofillNote && (
              <div className="glass-panel rounded-xl border border-slate-800 px-3 py-2.5 space-y-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  {autofillNote.filled.length
                    ? <span>Filled <span className="text-slate-100 font-semibold">{autofillNote.filled.join(', ')}</span></span>
                    : <span>Nothing new to fill — review the fields below.</span>}
                  <span className="ml-auto text-[9px] font-mono text-slate-600 shrink-0">
                    {autofillNote.usedLLM ? 'AI-assisted' : 'no LLM used'}{autofillNote.fetched ? ' · fetched link' : ''}
                  </span>
                </div>
                {autofillNote.gaps.length > 0 && (
                  <ul className="space-y-0.5 text-slate-500 pl-0.5">
                    {autofillNote.gaps.map((g, i) => (
                      <li key={i} className="flex gap-1.5 leading-relaxed"><span className="text-slate-600 shrink-0">•</span>{g}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Opt-in company research (web search) */}
            {companyName.trim() && (
              <div className="space-y-2">
                {!research && (
                  <button
                    type="button"
                    onClick={handleResearch}
                    disabled={researching}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 disabled:opacity-40 text-[11px] font-bold text-slate-300 transition"
                  >
                    {researching
                      ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Researching…</>
                      : <><Globe className="w-3 h-3 text-indigo-400" /> Research company</>}
                  </button>
                )}
                {researchError && (
                  <p className="text-[11px] text-rose-300 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" /> {researchError}</p>
                )}
                {research && (research.unsupported ? (
                  <p className="text-[11px] text-amber-400/80">Company research needs a serper.dev search key or a Gemini key. Add one in “API Keys”.</p>
                ) : research.error ? (
                  <p className="text-[11px] text-rose-300 flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" /> Search failed: {research.error}</p>
                ) : (
                  <div className="glass-panel rounded-xl border border-slate-800 px-3 py-2.5 space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="font-semibold text-slate-100">Company research</span>
                      <span className="ml-auto text-[9px] font-mono text-slate-600">{research.via === 'serper' ? 'serper.dev' : research.via === 'gemini' ? 'gemini search' : 'web search'}</span>
                    </div>
                    {research.summary && <p className="text-slate-400 leading-relaxed">{research.summary}</p>}
                    {research.companyWebsite && (
                      <a href={research.companyWebsite} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 break-all block">{research.companyWebsite}</a>
                    )}
                    {research.marketSalaryHint && <p className="text-emerald-300/90">Market range: {research.marketSalaryHint}</p>}
                    {research.sources && research.sources.length > 0 && (
                      <div className="flex flex-wrap gap-x-2.5 gap-y-1 pt-0.5">
                        {research.sources.map((s, i) => (
                          <a key={i} href={s.url} target="_blank" rel="noreferrer" className="text-[9px] font-mono text-slate-500 hover:text-slate-300 underline underline-offset-2 truncate max-w-[180px]">{s.title || s.url}</a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Company + role */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Company *">
                <input
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="e.g. Tano AI"
                  className={`${fieldInput} ${errors.companyName ? 'border-rose-500' : ''}`}
                />
                {errors.companyName && <span className="text-[10px] text-rose-500 font-bold">{errors.companyName}</span>}
              </Field>
              <Field label="Role *">
                <input
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                  placeholder="e.g. Backend Engineer"
                  className={`${fieldInput} ${errors.targetRole ? 'border-rose-500' : ''}`}
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
                  <OptionSelect value={appliedVia} options={APPLIED_VIA} onChange={setAppliedVia} />
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
                      <OptionSelect value={workModel} options={WORK_MODELS} onChange={setWorkModel} />
                    </Field>
                    <Field label="Location">
                      <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" className={fieldInput} />
                    </Field>
                    <Field label="Compensation">
                      <input value={salaryRange} onChange={e => setSalaryRange(e.target.value)} placeholder="$120k – $150k (posted or expected)" className={fieldInput} />
                    </Field>
                    <Field label="Benefits / equity">
                      <input value={otherBenefits} onChange={e => setOtherBenefits(e.target.value)} placeholder="Bonus, equity, health" className={fieldInput} />
                    </Field>
                  </div>

                  <Field label="Recruiter / contact">
                    <input value={hrContact} onChange={e => setHrContact(e.target.value)} placeholder="Name · email · LinkedIn" className={fieldInput} />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Resume sent">
                      <input type="url" value={resumeLink} onChange={e => setResumeLink(e.target.value)} placeholder="https://…" className={`${fieldInput} font-mono`} />
                    </Field>
                    <Field label="Portfolio / repo">
                      <input type="url" value={portfolioLink} onChange={e => setPortfolioLink(e.target.value)} placeholder="https://…" className={`${fieldInput} font-mono`} />
                    </Field>
                  </div>

                  <Field label="Requirements / keywords">
                    <textarea rows={3} value={keyJdRequirements} onChange={e => setKeyJdRequirements(e.target.value)} placeholder="Stack, must-haves, keywords…" className={`${fieldInput} resize-y leading-relaxed`} />
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
    </Modal>
  );
}
