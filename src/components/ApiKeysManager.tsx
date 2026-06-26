import { useState } from 'react';
import { Key, Eye, EyeOff, CheckCircle2, Server, Search, Gift } from 'lucide-react';
import { Provider, PROVIDERS, maskKey } from '../lib/apiKeys';
import { useApiKeys } from '../hooks/useApiKeys';
import { CustomEndpoint, loadCustomEndpoint, saveCustomEndpoint } from '../lib/customEndpoint';
import { loadSearchKey, saveSearchKey, removeSearchKey } from '../lib/searchConfig';

// Canonical BYOK key editor — the single source of truth for provider keys
// (5 LLM providers incl. the custom OpenAI-compatible endpoint, plus a serper.dev
// search key). Used by the API Keys view; keys live in localStorage only.
export function ApiKeysManager() {
  const { apiKeys, saveKey, removeKey } = useApiKeys();
  const [keyInputs, setKeyInputs] = useState<Partial<Record<Provider, string>>>({});
  const [showKeys, setShowKeys]   = useState<Partial<Record<Provider, boolean>>>({});
  const [customCfg, setCustomCfg] = useState<CustomEndpoint>(loadCustomEndpoint);
  const [searchKey, setSearchKeyState] = useState(loadSearchKey);
  const [searchInput, setSearchInput] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const customReady = !!apiKeys.custom && !!customCfg.baseUrl.trim() && !!customCfg.model.trim();

  const commitSearchKey = () => {
    const k = searchInput.trim();
    if (!k) return;
    saveSearchKey(k);
    setSearchKeyState(k);
    setSearchInput('');
  };
  const clearSearchKey = () => { removeSearchKey(); setSearchKeyState(''); };

  const fieldCls =
    'w-full bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition';

  const commitKey = (provider: Provider) => {
    const key = keyInputs[provider]?.trim();
    if (!key) return;
    saveKey(provider, key);
    setKeyInputs(prev => ({ ...prev, [provider]: '' }));
  };

  const updateCustom = (patch: Partial<CustomEndpoint>) => {
    setCustomCfg(prev => {
      const next = { ...prev, ...patch };
      saveCustomEndpoint(next);
      return next;
    });
  };

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-sm text-slate-400 leading-relaxed">
        Add at least one API key to enable AI features (resume tailoring, import, JD autofill, company research).
        Keys are stored only in your browser's <code className="font-mono text-indigo-400 text-xs bg-indigo-950/30 px-1.5 py-0.5 rounded">localStorage</code> — never on any server.
      </p>

      <div className="glass-panel rounded-xl border border-emerald-900/40 px-4 py-3 flex items-start gap-2.5">
        <Gift className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-400 leading-relaxed">
          <span className="font-bold text-emerald-300">Free options:</span>{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">Google AI Studio</a> gives a free Gemini key;{' '}
          <a href="https://serper.dev" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">serper.dev</a> gives 2,500 free web searches for company research.
        </div>
      </div>

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

      {/* Custom OpenAI-compatible endpoint */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400" /> Custom (OpenAI-compatible)
            </h3>
            {customReady && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Configured
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-600 font-mono">freellmapi · OpenRouter · LM Studio · vLLM</span>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Any endpoint implementing <code className="font-mono text-indigo-400 bg-indigo-950/30 px-1 py-0.5 rounded">/v1/chat/completions</code>. Self-host{' '}
          <a href="https://github.com/tashfeenahmed/freellmapi" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">freellmapi</a>{' '}
          to stack many free tiers behind one URL. Your key & endpoint stay in your browser.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Base URL</span>
            <input value={customCfg.baseUrl} onChange={e => updateCustom({ baseUrl: e.target.value })} placeholder="https://host/v1" className={`${fieldCls} font-mono`} />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Model</span>
            <input value={customCfg.model} onChange={e => updateCustom({ model: e.target.value })} placeholder="e.g. llama-3.3-70b" className={`${fieldCls} font-mono`} />
          </label>
        </div>

        {apiKeys.custom ? (
          <div className="flex items-center justify-between gap-2 bg-slate-900/60 rounded-lg px-3 py-2.5 border border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <Key className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="text-xs font-mono text-slate-500 truncate">{maskKey(apiKeys.custom, 6, 18)}</span>
            </div>
            <button onClick={() => removeKey('custom')} className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition shrink-0">Remove key</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKeys.custom ? 'text' : 'password'}
                value={keyInputs.custom || ''}
                onChange={e => setKeyInputs(prev => ({ ...prev, custom: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && commitKey('custom')}
                placeholder="API key (any token your endpoint expects)"
                className={`${fieldCls} font-mono pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowKeys(prev => ({ ...prev, custom: !prev.custom }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition"
                aria-label={showKeys.custom ? 'Hide key' : 'Show key'}
              >
                {showKeys.custom ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={() => commitKey('custom')}
              disabled={!keyInputs.custom?.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs transition shrink-0"
            >
              Save
            </button>
          </div>
        )}
      </div>

      {/* Web search (serper.dev) — powers JD company research without LLM tokens */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-400" /> Web Search (serper.dev)
            </h3>
            {!!searchKey && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Configured
              </span>
            )}
          </div>
          <a href="https://serper.dev" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono underline underline-offset-2">2,500 free</a>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          A Google Search API key for <span className="text-slate-300">company research</span> in the New Application form (website, summary, market salary). Uses search credits — no LLM tokens.
        </p>

        {searchKey ? (
          <div className="flex items-center justify-between gap-2 bg-slate-900/60 rounded-lg px-3 py-2.5 border border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <Key className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span className="text-xs font-mono text-slate-500 truncate">{maskKey(searchKey, 6, 18)}</span>
            </div>
            <button onClick={clearSearchKey} className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition shrink-0">Remove key</button>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showSearch ? 'text' : 'password'}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && commitSearchKey()}
                placeholder="serper.dev API key"
                className={`${fieldCls} font-mono pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowSearch(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition"
                aria-label={showSearch ? 'Hide key' : 'Show key'}
              >
                {showSearch ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={commitSearchKey}
              disabled={!searchInput.trim()}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs transition shrink-0"
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
