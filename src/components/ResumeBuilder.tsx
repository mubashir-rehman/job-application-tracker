import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles, Key, FileText, Link2, CheckCircle2,
  AlertCircle, Eye, EyeOff, Wand2, Clock,
  ExternalLink, ChevronRight,
} from 'lucide-react';

type Provider = 'openai' | 'anthropic' | 'gemini';

interface ApiKeys {
  openai?: string;
  anthropic?: string;
  gemini?: string;
}

const PROVIDERS: { id: Provider; label: string; placeholder: string; hint: string }[] = [
  { id: 'anthropic', label: 'Anthropic (Claude)', placeholder: 'sk-ant-api03-...', hint: 'claude.ai/settings' },
  { id: 'openai',    label: 'OpenAI (GPT-4o)',    placeholder: 'sk-proj-...',       hint: 'platform.openai.com' },
  { id: 'gemini',    label: 'Google Gemini',       placeholder: 'AIzaSy...',         hint: 'aistudio.google.com' },
];

function loadApiKeys(): ApiKeys {
  try { return JSON.parse(localStorage.getItem('hiretrack_api_keys') || '{}'); }
  catch { return {}; }
}

export function ResumeBuilder() {
  const [apiKeys, setApiKeys]         = useState<ApiKeys>(loadApiKeys);
  const [keyInputs, setKeyInputs]     = useState<Partial<Record<Provider, string>>>({});
  const [showKeys, setShowKeys]       = useState<Partial<Record<Provider, boolean>>>({});
  const [selectedProvider, setSelectedProvider] = useState<Provider>('anthropic');
  const [jdUrl, setJdUrl]             = useState('');
  const [companyUrl, setCompanyUrl]   = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab]     = useState<'generate' | 'keys' | 'history'>('generate');

  const hasAnyKey         = PROVIDERS.some(p => !!apiKeys[p.id]);
  const selectedKeyExists = !!apiKeys[selectedProvider];

  const saveKey = (provider: Provider) => {
    const key = keyInputs[provider]?.trim();
    if (!key) return;
    const updated = { ...apiKeys, [provider]: key };
    setApiKeys(updated);
    localStorage.setItem('hiretrack_api_keys', JSON.stringify(updated));
    setKeyInputs(prev => ({ ...prev, [provider]: '' }));
  };

  const removeKey = (provider: Provider) => {
    const updated = { ...apiKeys };
    delete updated[provider];
    setApiKeys(updated);
    localStorage.setItem('hiretrack_api_keys', JSON.stringify(updated));
  };

  const handleGenerate = async () => {
    if (!jdUrl.trim() || !selectedKeyExists) return;
    setIsGenerating(true);
    // TODO: POST /api/resume/generate { jdUrl, companyUrl, provider }
    //       with header X-API-Key: apiKeys[selectedProvider]
    await new Promise(r => setTimeout(r, 1500));
    setIsGenerating(false);
  };

  const tabs = [
    { id: 'generate' as const, label: 'Generate',  Icon: Wand2  },
    { id: 'keys'     as const, label: 'API Keys',   Icon: Key    },
    { id: 'history'  as const, label: 'History',    Icon: Clock  },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-3xl font-black font-display text-slate-100 tracking-tight flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-indigo-400" />
            Resume Builder
          </h1>
          <p className="text-slate-400 text-sm font-medium mt-1">
            AI-powered, ATS-optimized resumes tailored to each job description. Your API key, your data.
          </p>
        </div>
      </header>

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

            {/* JD inputs */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
              <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Job Description
              </h3>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  JD URL <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type="url"
                    value={jdUrl}
                    onChange={e => setJdUrl(e.target.value)}
                    placeholder="https://jobs.company.com/role/12345"
                    className="w-full bg-slate-900/60 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
                  />
                </div>
                <p className="text-[10px] text-slate-500">Required. Must be a publicly accessible job posting URL.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Company Website <span className="text-slate-600">(optional)</span>
                </label>
                <div className="relative">
                  <ExternalLink className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type="url"
                    value={companyUrl}
                    onChange={e => setCompanyUrl(e.target.value)}
                    placeholder="https://company.com"
                    className="w-full bg-slate-900/60 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
                  />
                </div>
                <p className="text-[10px] text-slate-500">Adds company culture context to improve tailoring.</p>
              </div>
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
              disabled={!jdUrl.trim() || !selectedKeyExists || isGenerating}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2.5 transition-all"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing JD &amp; generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate Tailored Resume
                </>
              )}
            </button>
          </div>

          {/* Right: info cards */}
          <div className="space-y-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">How it works</h3>
              <ol className="space-y-3">
                {[
                  'Paste the job posting URL',
                  'AI analyzes JD for requirements & ATS keywords',
                  'Your master CV is matched and tailored',
                  'ATS-optimized resume is generated',
                  'Download as .md, .docx, or .pdf',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs text-slate-400">
                    <span className="w-5 h-5 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-[10px] font-black text-indigo-400 shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2.5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                BYOK Privacy
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your API key is stored in your browser's localStorage only. It is sent in a request header directly to the generation endpoint and is never stored on any server.
              </p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Output formats</h3>
              {[
                { fmt: 'Markdown (.md)', note: 'Clean, version-controlled' },
                { fmt: 'Word (.docx)',   note: 'ATS-safe template' },
                { fmt: 'PDF',           note: 'Final submission' },
              ].map(({ fmt, note }) => (
                <div key={fmt} className="flex items-center gap-2.5 text-xs">
                  <ChevronRight className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span className="font-bold text-slate-300">{fmt}</span>
                  <span className="text-slate-600">— {note}</span>
                </div>
              ))}
            </div>
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
                    <span className="text-xs font-mono text-slate-500">
                      {apiKeys[p.id]!.slice(0, 10)}{'•'.repeat(24)}
                    </span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showKeys[p.id] ? 'text' : 'password'}
                        value={keyInputs[p.id] || ''}
                        onChange={e => setKeyInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && saveKey(p.id)}
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
                      onClick={() => saveKey(p.id)}
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
