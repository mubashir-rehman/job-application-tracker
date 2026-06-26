import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import {
  BrainCircuit, Plus, Trash2, TrendingUp, AlertTriangle,
  Sparkles, Target, ChevronDown,
} from 'lucide-react';
import { useKnowledgeBank } from '../hooks/useKnowledgeBank';
import {
  KB_CATEGORIES, EntryKind, EntryStatus, ProfileEntry,
} from '../lib/knowledgeBankService';

// Visual roles per project palette: emerald = strength, amber = gap,
// indigo = improvement. Status cycles open → in_progress → resolved.
const KIND_META: Record<EntryKind, { label: string; Icon: typeof TrendingUp; cls: string; dot: string }> = {
  strength:    { label: 'Strength',    Icon: TrendingUp,    cls: 'text-emerald-300 bg-emerald-950/40 border-emerald-900/40', dot: 'bg-emerald-400' },
  gap:         { label: 'Gap',         Icon: AlertTriangle, cls: 'text-amber-300 bg-amber-950/40 border-amber-900/40',     dot: 'bg-amber-400' },
  improvement: { label: 'Improvement', Icon: Sparkles,      cls: 'text-indigo-300 bg-indigo-950/40 border-indigo-900/40',   dot: 'bg-indigo-400' },
};

const STATUS_ORDER: EntryStatus[] = ['open', 'in_progress', 'resolved'];
const STATUS_META: Record<EntryStatus, { label: string; cls: string }> = {
  open:        { label: 'Open',        cls: 'text-slate-400 bg-slate-800/60 border-slate-700' },
  in_progress: { label: 'In progress', cls: 'text-amber-300 bg-amber-950/40 border-amber-900/40' },
  resolved:    { label: 'Resolved',    cls: 'text-emerald-300 bg-emerald-950/40 border-emerald-900/40' },
};

const inputCls =
  'w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition';

interface DraftState {
  category: string;
  kind: EntryKind;
  topic: string;
  detail: string;
  severity: number;
  action: string;
}

const emptyDraft = (): DraftState => ({
  category: KB_CATEGORIES[0],
  kind: 'gap',
  topic: '',
  detail: '',
  severity: 3,
  action: '',
});

export function KnowledgeBank({ user }: { user: SupabaseUser | null }) {
  const { entries, status, addEntry, updateEntry, deleteEntry } = useKnowledgeBank(user);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<DraftState>(emptyDraft);

  const counts = useMemo(() => {
    const c = { gap: 0, strength: 0, improvement: 0, open: 0, resolved: 0 };
    for (const e of entries) {
      c[e.kind] += 1;
      if (e.status === 'open') c.open += 1;
      if (e.status === 'resolved') c.resolved += 1;
    }
    return c;
  }, [entries]);

  // Group entries by category, preserving the canonical category order.
  const grouped = useMemo(() => {
    const map = new Map<string, ProfileEntry[]>();
    for (const e of entries) {
      const list = map.get(e.category) || [];
      list.push(e);
      map.set(e.category, list);
    }
    return KB_CATEGORIES
      .map((cat) => ({ category: cat, items: map.get(cat) || [] }))
      .filter((g) => g.items.length > 0);
  }, [entries]);

  const submit = () => {
    if (!draft.topic.trim()) return;
    addEntry({
      category: draft.category,
      kind: draft.kind,
      topic: draft.topic.trim(),
      detail: draft.detail.trim(),
      severity: draft.severity,
      status: 'open',
      action: draft.action.trim(),
    });
    setDraft(emptyDraft());
    setFormOpen(false);
  };

  const cycleStatus = (e: ProfileEntry) => {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(e.status) + 1) % STATUS_ORDER.length];
    updateEntry(e.id, { status: next });
  };

  const statusLabel =
    status === 'loading' ? 'loading…'
    : status === 'synced' ? 'synced to cloud'
    : status === 'error' ? 'saved locally (cloud failed)'
    : 'saved locally';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-slate-400 text-sm font-medium max-w-2xl">
          Your personal competency ledger — track interview gaps, strengths, and improvements across
          {' '}{KB_CATEGORIES.length} areas. Feeds prep, résumé positioning, and your growth over time.
        </p>
        <span className="text-[10px] text-slate-600 font-mono shrink-0">{statusLabel}</span>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2.5">
        {([
          { label: 'Strengths',   value: counts.strength,    cls: 'text-emerald-300' },
          { label: 'Gaps',        value: counts.gap,         cls: 'text-amber-300' },
          { label: 'Improvements', value: counts.improvement, cls: 'text-indigo-300' },
          { label: 'Open',        value: counts.open,        cls: 'text-slate-300' },
          { label: 'Resolved',    value: counts.resolved,    cls: 'text-emerald-300' },
        ]).map((s) => (
          <div key={s.label} className="glass-panel rounded-xl border border-slate-800 px-3.5 py-2 flex items-center gap-2">
            <span className={`text-base font-black ${s.cls}`}>{s.value}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Add entry */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <button
          onClick={() => setFormOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-800/30 transition"
          aria-expanded={formOpen}
        >
          <span className="flex items-center gap-2 text-sm font-extrabold text-slate-100">
            <Plus className="w-4 h-4 text-indigo-400" />
            Add an entry
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${formOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence initial={false}>
          {formOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-800/70">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Category</span>
                    <select
                      value={draft.category}
                      onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                      className={inputCls}
                    >
                      {KB_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Type</span>
                    <div className="flex gap-1.5">
                      {(Object.keys(KIND_META) as EntryKind[]).map((k) => {
                        const m = KIND_META[k];
                        const active = draft.kind === k;
                        return (
                          <button
                            key={k}
                            onClick={() => setDraft((d) => ({ ...d, kind: k }))}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl border text-[11px] font-bold transition ${
                              active ? m.cls : 'text-slate-500 border-slate-700 hover:text-slate-300'
                            }`}
                          >
                            <m.Icon className="w-3.5 h-3.5" />
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <input
                  value={draft.topic}
                  onChange={(e) => setDraft((d) => ({ ...d, topic: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="Topic — e.g. “System design: caching & invalidation”"
                  className={inputCls}
                />
                <textarea
                  value={draft.detail}
                  onChange={(e) => setDraft((d) => ({ ...d, detail: e.target.value }))}
                  rows={2}
                  placeholder="Detail (optional) — what happened, what was asked, what you missed…"
                  className={`${inputCls} resize-y`}
                />
                <input
                  value={draft.action}
                  onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))}
                  placeholder="Next action (optional) — e.g. “Drill consistent hashing on Grokking”"
                  className={inputCls}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">Severity</span>
                    <input
                      type="range" min={1} max={5} value={draft.severity}
                      onChange={(e) => setDraft((d) => ({ ...d, severity: Number(e.target.value) }))}
                      className="accent-indigo-500 w-32"
                    />
                    <span className="text-xs font-black text-slate-300 w-4">{draft.severity}</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setDraft(emptyDraft()); setFormOpen(false); }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submit}
                      disabled={!draft.topic.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs transition flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add entry
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Entries */}
      {grouped.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-14 h-14 bg-slate-800/60 rounded-2xl border border-slate-700 flex items-center justify-center">
            <BrainCircuit className="w-7 h-7 text-slate-600" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-300 text-base">Your knowledge bank is empty</h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-xs leading-relaxed">
              After each interview, log what went well and what to drill. Patterns surface fast, and your
              résumé positioning sharpens with them.
            </p>
          </div>
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add your first entry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ category, items }) => (
            <div key={category} className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <Target className="w-3.5 h-3.5 text-slate-600" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{category}</h3>
                <span className="text-[10px] font-mono text-slate-600">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((e) => {
                  const m = KIND_META[e.kind];
                  return (
                    <div key={e.id} className="glass-panel glass-panel-hover rounded-xl border border-slate-800 p-4 group">
                      <div className="flex items-start gap-3">
                        <span className={`shrink-0 mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${m.cls}`}>
                          <m.Icon className="w-3 h-3" /> {m.label}
                        </span>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-bold text-slate-100 leading-snug">{e.topic}</p>
                          {e.detail && <p className="text-xs text-slate-400 leading-relaxed">{e.detail}</p>}
                          {e.action && (
                            <p className="text-xs text-indigo-300/90 leading-relaxed flex items-start gap-1.5">
                              <Sparkles className="w-3 h-3 shrink-0 mt-0.5" /> {e.action}
                            </p>
                          )}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => cycleStatus(e)}
                              className={`px-2 py-0.5 rounded-full border text-[10px] font-bold transition ${STATUS_META[e.status].cls}`}
                              title="Click to advance status"
                            >
                              {STATUS_META[e.status].label}
                            </button>
                            <span className="flex items-center gap-0.5" title={`Severity ${e.severity}/5`}>
                              {[1, 2, 3, 4, 5].map((n) => (
                                <span key={n} className={`w-1.5 h-1.5 rounded-full ${n <= e.severity ? m.dot : 'bg-slate-700'}`} />
                              ))}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteEntry(e.id)}
                          className="shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-950/30 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                          aria-label="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
