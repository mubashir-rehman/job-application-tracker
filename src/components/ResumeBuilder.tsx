import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles, Key, FileText, CheckCircle2,
  AlertCircle, Eye, EyeOff, Wand2, Clock,
  Copy, Download, Check,
} from 'lucide-react';
import { Provider, PROVIDERS, maskKey } from '../lib/apiKeys';
import { useApiKeys } from '../hooks/useApiKeys';
import { tailorResume } from '../lib/apiClient';

const MASTER_CV_KEY = 'hiretrack_master_cv';

export function ResumeBuilder() {
  const { apiKeys, saveKey, removeKey, hasAnyKey } = useApiKeys();
  const [keyInputs, setKeyInputs]     = useState<Partial<Record<Provider, string>>>({});
  const [showKeys, setShowKeys]       = useState<Partial<Record<Provider, boolean>>>({});
  const [selectedProvider, setSelectedProvider] = useState<Provider>('anthropic');
  const [masterMd, setMasterMd]       = useState(() => localStorage.getItem(MASTER_CV_KEY) || '');
  const [jdText, setJdText]           = useState('');
  const [result, setResult]           = useState('');
  const [error, setError]             = useState<string | null>(null);
  const [copied, setCopied]           = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab]     = useState<'generate' | 'keys' | 'history'>('generate');

  const selectedKeyExists = !!apiKeys[selectedProvider];
  const canGenerate = !!masterMd.trim() && !!jdText.trim() && selectedKeyExists && !isGenerating;

  // Master CV is the source of truth — persist it locally as the user edits.
  useEffect(() => { localStorage.setItem(MASTER_CV_KEY, masterMd); }, [masterMd]);

  const commitKey = (provider: Provider) => {
    const key = keyInputs[provider]?.trim();
    if (!key) return;
    saveKey(provider, key);
    setKeyInputs(prev => ({ ...prev, [provider]: '' }));
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    setError(null);
    setResult('');
    try {
      const md = await tailorResume({
        provider: selectedProvider,
        apiKey: apiKeys[selectedProvider]!,
        masterMd,
        jdText,
      });
      setResult(md);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyResult = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadResult = () => {
    const blob = new Blob([result], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tailored-resume.md';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const tabs = [
    { id: 'generate' as const, label: 'Generate',  Icon: Wand2  },
    { id: 'keys'     as const, label: 'API Keys',   Icon: Key    },
    { id: 'history'  as const, label: 'History',    Icon: Clock  },
  ];

  return (
    <div className="space-y-6">
      <p className="text-slate-400 text-sm font-medium">
        AI-powered, ATS-optimized resumes tailored to each job description. Your API key, your data.
      </p>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 glass-panel rounded-xl border border-slate-800 w-fit">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === id
                ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {id === 'keys' && hasAnyKey && (
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── GENERATE TAB ─────────────────────────────────────── */}
      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: form */}
          <div className="lg:col-span-2 space-y-5">
            {/* No-key banner */}
            {!hasAnyKey && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-4 rounded-xl border border-amber-900/40 flex items-start gap-3"
              >
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300">
                  <span className="font-bold text-amber-300">No API key configured. </span>
                  <button
                    onClick={() => setActiveTab('keys')}
                    className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                  >
                    Add your key
                  </button>{' '}
                  to start generating. It stays in your browser only.
                </p>
              </motion.div>
            )}

            {/* Master CV — the source of truth (persisted locally) */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  Master CV
                </h3>
                <span className="text-[10px] text-slate-600 font-mono">{masterMd.trim() ? 'saved locally' : 'paste once'}</span>
              </div>
              <textarea
                value={masterMd}
                onChange={e => setMasterMd(e.target.value)}
                rows={8}
                placeholder="Paste your full master CV (Markdown or plain text). This is the single source of truth — tailored resumes are generated from it."
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-xs leading-relaxed text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition resize-y font-mono"
              />
              <p className="text-[10px] text-slate-500">Stored in your browser only. Cloud sync to the versioned master_resume table comes later.</p>
            </div>

            {/* Job description */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-indigo-400" />
                Job Description
              </h3>
              <textarea
                value={jdText}
                onChange={e => setJdText(e.target.value)}
                rows={6}
                placeholder="Paste the full job description here…"
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-xs leading-relaxed text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition resize-y"
              />
            </div>

            {/* Provider selector */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                AI Provider
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PROVIDERS.map(p => {
                  const configured = !!apiKeys[p.id];
                  const selected   = selectedProvider === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProvider(p.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        selected
                          ? 'border-indigo-500 bg-indigo-600/10'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs font-bold ${selected ? 'text-slate-100' : 'text-slate-400'}`}>
                          {p.label}
                        </span>
                        {configured
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          : <span className="text-[9px] text-slate-600 font-mono">no key</span>
                        }
                      </div>
                      {selected && <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />}
                    </button>
                  );
                })}
              </div>
              {!selectedKeyExists && (
                <p className="text-[11px] text-amber-400/80 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  No key for {PROVIDERS.find(p => p.id === selectedProvider)?.label}.
                  <button onClick={() => setActiveTab('keys')} className="underline underline-offset-2 hover:text-amber-300">Add it</button>
                </p>
              )}
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2.5 transition-all"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Tailoring resume…
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate Tailored Resume
                </>
              )}
            </button>

            {error && (
              <div className="glass-panel p-4 rounded-xl border border-rose-900/40 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-300 leading-relaxed">{error}</p>
              </div>
            )}
          </div>

          {/* Right: result */}
          <div className="space-y-4">
            {result ? (
              <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[70vh]">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 shrink-0">
                  <h3 className="text-xs font-extrabold text-slate-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Tailored resume
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <button onClick={copyResult} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-[11px] font-bold text-slate-300 transition" aria-label="Copy resume">
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button onClick={downloadResult} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-[11px] font-bold text-slate-300 transition" aria-label="Download resume as Markdown">
                      <Download className="w-3.5 h-3.5" /> .md
                    </button>
                  </div>
                </div>
                <pre className="px-5 py-4 overflow-auto text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-mono">{result}</pre>
              </div>
            ) : (
              <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">How it works</h3>
                <ol className="space-y-3">
                  {[
                    'Paste your master CV once (the source of truth)',
                    'Paste the job description for this role',
                    'Pick the AI provider you have a key for',
                    'Generate — the CV is tailored to one lane, matching JD phrasing',
                    'Copy or download the Markdown (ATS .docx / PDF export coming)',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-xs text-slate-400">
                      <span className="w-5 h-5 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-[10px] font-black text-indigo-400 shrink-0 mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
                <div className="pt-3 border-t border-slate-800/70 flex items-start gap-2">
                  <Key className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    BYOK: your key stays in the browser and is sent only in the request header — never stored on any server.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── API KEYS TAB ─────────────────────────────────────── */}
      {activeTab === 'keys' && (
        <div className="max-w-2xl space-y-5">
          <p className="text-sm text-slate-400 leading-relaxed">
            Add at least one API key to enable resume generation. Keys are stored only in your browser's <code className="font-mono text-indigo-400 text-xs bg-indigo-950/30 px-1.5 py-0.5 rounded">localStorage</code> — never on any server.
          </p>

          {PROVIDERS.map(p => {
            const saved = !!apiKeys[p.id];
            return (
              <div key={p.id} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-extrabold text-slate-100">{p.label}</h3>
                    {saved && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Configured
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-600 font-mono">{p.hint}</span>
                    {saved && (
                      <button
                        onClick={() => removeKey(p.id)}
                        className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {saved ? (
                  <div className="flex items-center gap-2 bg-slate-900/60 rounded-lg px-3 py-2.5 border border-slate-800">
                    <Key className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span className="text-xs font-mono text-slate-500">{maskKey(apiKeys[p.id]!, 10, 24)}</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showKeys[p.id] ? 'text' : 'password'}
                        value={keyInputs[p.id] || ''}
                        onChange={e => setKeyInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && commitKey(p.id)}
                        placeholder={p.placeholder}
                        className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-slate-200 placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKeys(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition"
                        aria-label={showKeys[p.id] ? 'Hide key' : 'Show key'}
                      >
                        {showKeys[p.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      onClick={() => commitKey(p.id)}
                      disabled={!keyInputs[p.id]?.trim()}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs transition shrink-0"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── HISTORY TAB ──────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="glass-panel p-12 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-14 h-14 bg-slate-800/60 rounded-2xl border border-slate-700 flex items-center justify-center">
            <Clock className="w-7 h-7 text-slate-600" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-300 text-base">No resumes generated yet</h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-xs leading-relaxed">
              Generated resumes will appear here, linked to your job applications with download options for each format.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('generate')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs transition"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Generate your first resume
          </button>
        </div>
      )}
    </div>
  );
}
