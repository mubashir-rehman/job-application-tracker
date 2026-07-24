import React, { useState } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { RotateCcw, Check, FileCode } from 'lucide-react';
import { useInstructions } from '../hooks/useInstructions';
import { usePromptOverrides } from '../hooks/usePromptOverrides';
import { PROMPT_REGISTRY, resolvePrompt } from '../lib/promptDefaults';

const fieldCls =
  'w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition font-mono leading-relaxed';

// Track 4 — Prompt Manager: every configurable prompt in one place. The server
// OUTPUT contract for each consumer stays authoritative (these layer ON TOP,
// same pattern as tailoring instructions today) — see promptDefaults.ts.
export function PromptManager({ user }: { user: SupabaseUser | null }) {
  const tailoring = useInstructions(user);
  const overridesHook = usePromptOverrides(user);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-sm text-slate-400 leading-relaxed">
        Every AI prompt this app uses, in one place. Each has a shipped default (versioned in the
        repo) — override it here, or reset back at any time.
      </p>

      {PROMPT_REGISTRY.map((p) => {
        const isDedicated = p.storage === 'dedicated';
        const currentValue = isDedicated ? tailoring.instructions : (overridesHook.overrides[p.key]?.content ?? '');
        const isDefault = isDedicated ? tailoring.isDefault : !overridesHook.overrides[p.key];
        const draft = drafts[p.key] ?? currentValue;
        const dirty = draft !== currentValue;
        const updatedAt = !isDedicated ? overridesHook.overrides[p.key]?.updatedAt : undefined;

        const save = () => {
          if (isDedicated) tailoring.setInstructions(draft);
          else overridesHook.setOverride(p.key, draft);
          setDrafts((d) => { const n = { ...d }; delete n[p.key]; return n; });
        };
        const reset = () => {
          if (isDedicated) tailoring.setInstructions(p.default);
          else overridesHook.resetOverride(p.key);
          setDrafts((d) => { const n = { ...d }; delete n[p.key]; return n; });
        };

        return (
          <div key={p.key} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-extrabold text-slate-100 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-indigo-400" /> {p.label}
                  {!p.wired && (
                    <span className="text-[9px] font-mono uppercase tracking-wider bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded" title="No generator uses this prompt yet — reserved for a future feature">
                      not yet wired
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed mt-1">{p.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isDefault
                  ? <span className="text-[10px] font-bold text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-full">Default</span>
                  : <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full">Custom</span>}
              </div>
            </div>

            <textarea
              value={resolvePrompt(p.default, draft)}
              onChange={(e) => setDrafts((d) => ({ ...d, [p.key]: e.target.value }))}
              rows={6}
              className={fieldCls}
            />

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-600">
                {updatedAt ? `Last edited ${new Date(updatedAt).toLocaleString()}` : isDefault ? 'Using the shipped default' : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={reset}
                  disabled={isDefault}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-bold text-slate-300 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset to default
                </button>
                <button
                  onClick={save}
                  disabled={!dirty}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-bold text-white transition"
                >
                  <Check className="w-3.5 h-3.5" /> Save
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
