import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import {
  Sparkles, Key, FileText, CheckCircle2,
  AlertCircle, Wand2, Clock,
  Copy, Download, Check, FileUp, Server, ShieldCheck, Printer,
  Briefcase, Trash2, Eye,
} from 'lucide-react';
import { JobApplication } from '../types';
import { Provider, PROVIDERS } from '../lib/apiKeys';
import { useApiKeys } from '../hooks/useApiKeys';
import { useMasterResume } from '../hooks/useMasterResume';
import { TailoredResume } from '../lib/tailoredResumeService';
import { tailorResume, convertResumeWithAI } from '../lib/apiClient';
import { splitTailored, downloadDocx, printPdf } from '../lib/resumeRender';
import { extractResumeText, ACCEPT_ATTR } from '../lib/resumeImport';
import { CustomEndpoint, loadCustomEndpoint, normalizeBaseUrl } from '../lib/customEndpoint';

const providerLabel = (id: Provider) =>
  id === 'custom' ? 'Custom endpoint' : PROVIDERS.find(p => p.id === id)?.label ?? id;

export function ResumeBuilder({
  user, applications, onManageKeys,
  history, onAddTailored, onRemoveTailored, tailorTarget,
}: {
  user: SupabaseUser | null;
  applications: JobApplication[];
  onManageKeys: () => void;
  history: TailoredResume[];
  onAddTailored: (input: { jobId: string | null; label: string; contentMd: string }) => void;
  onRemoveTailored: (id: string) => void;
  tailorTarget: { jobId: string; nonce: number } | null;
}) {
  const { apiKeys, hasAnyKey } = useApiKeys();
  const { masterMd, setMasterMd, status } = useMasterResume(user);
  const [selectedProvider, setSelectedProvider] = useState<Provider>('anthropic');
  const [customCfg] = useState<CustomEndpoint>(loadCustomEndpoint);
  const [selectedJobId, setSelectedJobId] = useState('');     // '' = quick paste (no job)
  const [jdText, setJdText]           = useState('');
  const [result, setResult]           = useState('');
  const [error, setError]             = useState<string | null>(null);
  const [copied, setCopied]           = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab]     = useState<'generate' | 'history'>('generate');

  // Master-CV import (upload pdf/docx/md/txt → markdown)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMethod, setImportMethod] = useState<'library' | 'ai'>('library');
  const [importing, setImporting]       = useState(false);
  const [importError, setImportError]   = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{ md: string; name: string } | null>(null);

  // The custom (OpenAI-compatible) endpoint needs a key, base URL, and model.
  const isCustom = selectedProvider === 'custom';
  const customReady = !!apiKeys.custom && !!customCfg.baseUrl.trim() && !!customCfg.model.trim();
  const selectedKeyExists = isCustom ? customReady : !!apiKeys[selectedProvider];
  const canGenerate = !!masterMd.trim() && !!jdText.trim() && selectedKeyExists && !isGenerating;

  // BYOK call config for the active provider (adds model + base URL for custom).
  const callConfig = (): { provider: Provider; apiKey: string; model?: string; baseUrl?: string } =>
    isCustom
      ? { provider: 'custom', apiKey: apiKeys.custom!, model: customCfg.model.trim(), baseUrl: normalizeBaseUrl(customCfg.baseUrl) }
      : { provider: selectedProvider, apiKey: apiKeys[selectedProvider]! };

  const masterStatusLabel = !masterMd.trim()
    ? 'paste once'
    : status === 'saving' ? 'saving…'
    : status === 'synced' ? 'synced to cloud'
    : status === 'loading' ? 'loading…'
    : status === 'error' ? 'saved locally (cloud failed)'
    : 'saved locally';

  // Human title for a job / history entry.
  const jobTitle = (a: JobApplication) => `${a.companyName} — ${a.targetRole}`;
  const historyTitle = (t: TailoredResume) => {
    if (t.jobId) {
      const a = applications.find(x => x.id === t.jobId);
      if (a) return jobTitle(a);
    }
    return t.label || 'Tailored resume';
  };

  // Pick a job to tailor for → prefill its stored JD (editable fallback remains).
  const onPickJob = (id: string) => {
    setSelectedJobId(id);
    if (id) {
      const a = applications.find(x => x.id === id);
      if (a?.jdText) setJdText(a.jdText);
    }
  };

  // Arriving from a job's detail pane ("Tailor for this job") — preselect it.
  useEffect(() => {
    if (!tailorTarget) return;
    onPickJob(tailorTarget.jobId);
    setActiveTab('generate');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tailorTarget?.nonce]);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    setImportError(null);
    setImporting(true);
    try {
      const { text, format } = await extractResumeText(file);
      let md = text;
      if (importMethod === 'ai') {
        if (!selectedKeyExists) {
          throw new Error(isCustom
            ? 'Configure the custom endpoint (base URL, model, key) in the API Keys tab.'
            : `Add a ${providerLabel(selectedProvider)} key to use AI conversion.`);
        }
        md = await convertResumeWithAI({ ...callConfig(), rawText: text, sourceFormat: format });
      }
      if (masterMd.trim()) setPendingImport({ md, name: file.name });
      else setMasterMd(md);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const applyPendingImport = () => {
    if (pendingImport) setMasterMd(pendingImport.md);
    setPendingImport(null);
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    setError(null);
    setResult('');
    try {
      const md = await tailorResume({ ...callConfig(), masterMd, jdText });
      setResult(md);
      // Save to history — linked to the chosen job, or local-only for quick paste.
      const job = selectedJobId ? applications.find(x => x.id === selectedJobId) : undefined;
      const label = job ? jobTitle(job) : (jdText.trim().split('\n').find(Boolean)?.slice(0, 60) || 'Quick tailor');
      onAddTailored({ jobId: selectedJobId || null, label, contentMd: md });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  // Export helpers take the markdown so both the live result and history reuse them.
  const copyMd = async (md: string) => {
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const downloadMd = (md: string) => {
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tailored-resume.md';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const downloadDocxMd = async (md: string) => {
    try { await downloadDocx(splitTailored(md).resumeMd); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not build the .docx'); }
  };
  const printPdfMd = (md: string) => {
    try { printPdf(splitTailored(md).resumeMd); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not open the print view'); }
  };

  // Toolbar of export actions, shared by the result pane and history rows.
  const ExportButtons = ({ md }: { md: string }) => (
    <div className="flex items-center gap-1.5">
      <button onClick={() => copyMd(md)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-[11px] font-bold text-slate-300 transition" aria-label="Copy resume">
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <button onClick={() => downloadMd(md)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-[11px] font-bold text-slate-300 transition" aria-label="Download resume as Markdown">
        <Download className="w-3.5 h-3.5" /> .md
      </button>
      <button onClick={() => downloadDocxMd(md)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-[11px] font-bold text-slate-300 transition" aria-label="Download ATS-safe Word document" title="Single-column ATS-safe .docx">
        <FileText className="w-3.5 h-3.5 text-sky-400" /> .docx
      </button>
      <button onClick={() => printPdfMd(md)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-[11px] font-bold text-slate-300 transition" aria-label="Export as PDF via print" title="Designed PDF (print → Save as PDF)">
        <Printer className="w-3.5 h-3.5 text-indigo-400" /> PDF
      </button>
    </div>
  );

  const tabs = [
    { id: 'generate' as const, label: 'Generate',  Icon: Wand2  },
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
            {id === 'history' && history.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[9px] text-slate-300 font-mono">{history.length}</span>
            )}
          </button>
        ))}
        <button
          onClick={onManageKeys}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-100 transition-all"
        >
          <Key className="w-3.5 h-3.5" />
          Manage keys
          {hasAnyKey && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
        </button>
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
                    onClick={onManageKeys}
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
                <span className="text-[10px] text-slate-600 font-mono">{masterStatusLabel}</span>
              </div>

              {/* Import: upload pdf/docx/md/txt → markdown, via library or AI */}
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <input ref={fileInputRef} type="file" accept={ACCEPT_ATTR} onChange={handleFileSelected} className="hidden" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 disabled:opacity-50 text-[11px] font-bold text-slate-200 transition"
                  >
                    {importing ? (
                      <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Converting…</>
                    ) : (
                      <><FileUp className="w-3.5 h-3.5 text-indigo-400" /> Upload file</>
                    )}
                  </button>

                  <div className="flex gap-0.5 p-0.5 bg-slate-900/60 border border-slate-700 rounded-lg" role="group" aria-label="Conversion method">
                    {([['library', 'Library'], ['ai', 'AI']] as const).map(([m, label]) => (
                      <button
                        key={m}
                        onClick={() => setImportMethod(m)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${
                          importMethod === m ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                        aria-pressed={importMethod === m}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <span className="text-[10px] text-slate-600 font-mono">PDF · DOCX · MD · TXT</span>
                </div>

                <p className="text-[10px] text-slate-500">
                  {importMethod === 'library'
                    ? 'Library: fast, on-device, no key. Best for DOCX/MD/TXT.'
                    : `AI: cleans & structures the text using your ${PROVIDERS.find(p => p.id === selectedProvider)?.label} key. Best for messy PDFs.`}
                </p>

                {importMethod === 'ai' && !selectedKeyExists && (
                  <p className="text-[11px] text-amber-400/80 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    No {PROVIDERS.find(p => p.id === selectedProvider)?.label} key — add it in the API Keys tab.
                  </p>
                )}

                {importError && (
                  <p className="text-[11px] text-rose-300 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {importError}
                  </p>
                )}

                {pendingImport && (
                  <div className="glass-panel p-3 rounded-xl border border-amber-900/40 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-300">
                      Replace your current master CV with <span className="font-bold text-slate-100">{pendingImport.name}</span>?
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setPendingImport(null)} className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-400 hover:text-slate-200 transition">Cancel</button>
                      <button onClick={applyPendingImport} className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold transition">Replace</button>
                    </div>
                  </div>
                )}
              </div>

              <textarea
                value={masterMd}
                onChange={e => setMasterMd(e.target.value)}
                rows={8}
                placeholder="Paste your full master CV (Markdown or plain text). This is the single source of truth — tailored resumes are generated from it."
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-xs leading-relaxed text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition resize-y font-mono"
              />
              <p className="text-[10px] text-slate-500">{user ? 'Auto-saved to your cloud master_resume; mirrored locally.' : 'Stored in your browser. Sign in to sync to the cloud master CV.'}</p>
            </div>

            {/* Job + description */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                Tailor for
              </h3>
              <select
                value={selectedJobId}
                onChange={e => onPickJob(e.target.value)}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
              >
                <option value="">Quick paste (no job)</option>
                {applications.map(a => (
                  <option key={a.id} value={a.id}>{a.companyName} — {a.targetRole}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500">
                {selectedJobId
                  ? 'Job description prefilled from this application — edit below if needed. The result is saved to History for this job.'
                  : 'Pick a saved application to prefill its job description, or paste one below for a one-off tailor.'}
              </p>
              <textarea
                value={jdText}
                onChange={e => setJdText(e.target.value)}
                rows={6}
                placeholder="Paste the full job description here…"
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-xs leading-relaxed text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition resize-y"
              />
            </div>

            {/* Provider selector (compact — keys live in the API Keys view) */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                AI Provider
              </h3>
              <select
                value={selectedProvider}
                onChange={e => setSelectedProvider(e.target.value as Provider)}
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition"
              >
                {PROVIDERS.map(p => (
                  <option key={p.id} value={p.id}>{p.label}{apiKeys[p.id] ? '  ✓ key set' : '  — no key'}</option>
                ))}
                <option value="custom">Custom (OpenAI-compatible){customReady ? '  ✓ set up' : '  — set up'}</option>
              </select>

              {!selectedKeyExists && (
                <p className="text-[11px] text-amber-400/80 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {isCustom ? 'Custom endpoint not set up (base URL, model, key).' : `No key for ${providerLabel(selectedProvider)}.`}
                  <button onClick={onManageKeys} className="underline underline-offset-2 hover:text-amber-300">{isCustom ? 'Set it up' : 'Add it'}</button>
                </p>
              )}

              <p className="text-[10px] text-slate-500 flex items-start gap-1.5 leading-relaxed">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/70 shrink-0 mt-px" />
                Your CV is sent only to the provider you choose. Paid Anthropic/OpenAI don't train on it; free tiers — including many behind a custom endpoint — may log or train on prompts, so avoid them for sensitive details.
              </p>
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
                  <ExportButtons md={result} />
                </div>
                <pre className="px-5 py-4 overflow-auto text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-mono">{result}</pre>
              </div>
            ) : (
              <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">How it works</h3>
                <ol className="space-y-3">
                  {[
                    'Paste your master CV once (the source of truth)',
                    'Pick a saved job (prefills its JD) or paste one',
                    'Choose the AI provider you have a key for',
                    'Generate — the CV is tailored to one lane, matching JD phrasing',
                    'Export: Markdown, single-column ATS .docx, or a designed PDF',
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

      {/* ── HISTORY TAB ──────────────────────────────────────── */}
      {activeTab === 'history' && (
        history.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center gap-4">
            <div className="w-14 h-14 bg-slate-800/60 rounded-2xl border border-slate-700 flex items-center justify-center">
              <Clock className="w-7 h-7 text-slate-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-300 text-base">No resumes generated yet</h3>
              <p className="text-xs text-slate-500 mt-1.5 max-w-xs leading-relaxed">
                Generated resumes appear here, linked to the job you tailored them for, with download options for each format.
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
        ) : (
          <div className="space-y-3">
            {history.map(t => (
              <div key={t.id} className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-slate-100 truncate flex items-center gap-2">
                    {t.jobId ? <Briefcase className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> : <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                    <span className="truncate">{historyTitle(t)}</span>
                    {t.version > 1 && <span className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[9px] text-slate-400 font-mono shrink-0">v{t.version}</span>}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {new Date(t.createdAt).toLocaleString()}{!t.jobId && ' · quick paste (local only)'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setResult(t.contentMd); setActiveTab('generate'); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-[11px] font-bold text-slate-300 transition"
                    aria-label="View resume"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                  <ExportButtons md={t.contentMd} />
                  <button
                    onClick={() => onRemoveTailored(t.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-rose-900/40 text-[11px] font-bold text-slate-400 hover:text-rose-300 transition"
                    aria-label="Delete resume"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
