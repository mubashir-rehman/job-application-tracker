import React, { useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Wand2, Check, Loader2, ShieldCheck } from 'lucide-react';
import { Provider, PROVIDERS } from '../lib/apiKeys';
import { useApiKeys } from '../hooks/useApiKeys';
import { useMasterResume } from '../hooks/useMasterResume';
import { useUserProfile } from '../hooks/useUserProfile';
import { extractUserProfile } from '../lib/apiClient';
import { WorkModel } from '../lib/triage';
import { isEmptyUserProfile } from '../lib/userProfile';

const WORK_MODEL_OPTIONS: WorkModel[] = ['Remote', 'Hybrid', 'Onsite'];
const SENIORITY_LEVELS = ['', 'Intern', 'Junior', 'Mid', 'Senior', 'Staff', 'Lead', 'Principal', 'Director'];

const fieldCls =
  'w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition';

function csv(items: string[]): string {
  return items.join(', ');
}
function fromCsv(s: string): string[] {
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

// Track 4 — User Profile: hard rules (seniority, comp floor, work model,
// location, never-claim stacks, dealbreakers) that screen a JD BEFORE any
// research/tailor token spend (src/lib/triage.ts). Editable directly; an
// "Extract from master CV" pass (BYOK, one-shot) pre-fills what it can —
// seniority/years/work-model/location/target-track hints only. Comp floor,
// never-claim, and dealbreakers aren't derivable from a CV and are always
// left for the user to fill in.
export function UserProfileEditor({ user }: { user: SupabaseUser | null }) {
  const { profile, setProfile, status } = useUserProfile(user);
  const { apiKeys } = useApiKeys();
  const { masterMd } = useMasterResume(user);
  const [provider, setProvider] = useState<Provider>('anthropic');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const hasKey = !!apiKeys[provider];

  const runExtract = async () => {
    if (!hasKey || !masterMd.trim()) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const r = await extractUserProfile({ provider, apiKey: apiKeys[provider]!, masterMd });
      setProfile((prev) => ({
        ...prev,
        seniorityLevel: r.seniorityLevel ?? prev.seniorityLevel,
        yearsExperience: r.yearsExperience ?? prev.yearsExperience,
        workModels: r.workModels.length ? (r.workModels as WorkModel[]) : prev.workModels,
        locations: r.locations.length ? r.locations : prev.locations,
        targetTracks: r.targetTracks.length ? r.targetTracks : prev.targetTracks,
      }));
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const toggleWorkModel = (m: WorkModel) =>
    setProfile((prev) => ({
      ...prev,
      workModels: prev.workModels.includes(m) ? prev.workModels.filter((x) => x !== m) : [...prev.workModels, m],
    }));

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-sm text-slate-400 leading-relaxed">
        These hard rules screen a job posting <span className="text-slate-300 font-semibold">before</span> any AI research
        or tailoring spend — a flagged JD asks you to confirm before continuing. Nothing here is sent to an employer.
      </p>

      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-slate-100 flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-indigo-400" /> Extract from master CV
          </h3>
          <div className="flex items-center gap-2">
            <select value={provider} onChange={(e) => setProvider(e.target.value as Provider)} className={`${fieldCls} w-auto`}>
              {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <button
              onClick={runExtract}
              disabled={extracting || !hasKey || !masterMd.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition"
              title={!masterMd.trim() ? 'Add your master CV in Resume Builder first' : !hasKey ? `Add a ${provider} key` : 'One-shot extraction — you can edit the result'}
            >
              {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
              {extracting ? 'Extracting…' : 'Extract'}
            </button>
          </div>
        </div>
        {extractError && <p className="text-[11px] text-rose-300">{extractError}</p>}
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Fills seniority, years, work model, and location hints only — comp floor, never-claim
          stacks, and dealbreakers aren't in a CV and are always yours to set below.
        </p>
      </div>

      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <h3 className="text-xs font-extrabold text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Screening rules
          {status === 'synced' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Seniority level</span>
            <select
              value={profile.seniorityLevel ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, seniorityLevel: e.target.value || null }))}
              className={fieldCls}
            >
              {SENIORITY_LEVELS.map((l) => <option key={l} value={l}>{l || '— unset —'}</option>)}
            </select>
          </label>
          <label className="space-y-1 block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Years experience</span>
            <input
              type="number" min={0} step={0.5}
              value={profile.yearsExperience ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, yearsExperience: e.target.value === '' ? null : Number(e.target.value) }))}
              className={fieldCls}
              placeholder="e.g. 6"
            />
          </label>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Accepted work models</span>
          <div className="flex gap-2">
            {WORK_MODEL_OPTIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => toggleWorkModel(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                  profile.workModels.includes(m)
                    ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                    : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-600">None selected = any work model accepted.</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="space-y-1 block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Comp floor amount</span>
            <input
              type="number" min={0}
              value={profile.compFloor?.amount ?? ''}
              onChange={(e) => {
                const amount = e.target.value === '' ? null : Number(e.target.value);
                setProfile((p) => ({
                  ...p,
                  compFloor: amount == null ? null : { amount, currency: p.compFloor?.currency || 'USD', per: p.compFloor?.per || 'year' },
                }));
              }}
              className={fieldCls}
              placeholder="e.g. 120000"
            />
          </label>
          <label className="space-y-1 block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Currency</span>
            <input
              value={profile.compFloor?.currency ?? ''}
              onChange={(e) => setProfile((p) => (p.compFloor ? { ...p, compFloor: { ...p.compFloor, currency: e.target.value } } : p))}
              disabled={!profile.compFloor}
              className={`${fieldCls} disabled:opacity-40`}
              placeholder="USD"
            />
          </label>
          <label className="space-y-1 block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Per</span>
            <select
              value={profile.compFloor?.per ?? 'year'}
              onChange={(e) => setProfile((p) => (p.compFloor ? { ...p, compFloor: { ...p.compFloor, per: e.target.value as 'year' | 'month' | 'hour' } } : p))}
              disabled={!profile.compFloor}
              className={`${fieldCls} disabled:opacity-40`}
            >
              <option value="year">year</option>
              <option value="month">month</option>
              <option value="hour">hour</option>
            </select>
          </label>
        </div>

        {[
          { key: 'locations' as const, label: 'Accepted locations', placeholder: 'Lahore, Karachi', help: 'Remote roles always bypass this.' },
          { key: 'targetTracks' as const, label: 'Target tracks', placeholder: 'Backend, AI/ML', help: 'Informational — not used to flag a JD.' },
          { key: 'neverClaim' as const, label: 'Never claim (stacks you don’t have)', placeholder: 'Kubernetes, Rust', help: 'Flags a JD that lists these as a tech tag.' },
          { key: 'dealbreakers' as const, label: 'Dealbreaker phrases', placeholder: 'on-call 24/7, unpaid overtime', help: 'Flags a JD whose text contains any of these.' },
        ].map(({ key, label, placeholder, help }) => (
          <label key={key} className="space-y-1 block">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
            <input
              value={csv(profile[key])}
              onChange={(e) => setProfile((p) => ({ ...p, [key]: fromCsv(e.target.value) }))}
              className={fieldCls}
              placeholder={placeholder}
            />
            <span className="text-[10px] text-slate-600">{help}</span>
          </label>
        ))}

        {isEmptyUserProfile(profile) && (
          <p className="text-[11px] text-amber-300/90 pt-1 border-t border-slate-800/70">
            No rules set yet — every JD will pass triage untouched until you configure at least one rule above.
          </p>
        )}
      </div>
    </div>
  );
}
