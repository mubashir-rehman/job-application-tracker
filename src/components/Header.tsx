import React, { useState } from 'react';
import { Sun, Moon, LogOut, LogIn, User, Key, X, Eye, EyeOff, CheckCircle2, Settings } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';

type Provider = 'openai' | 'anthropic' | 'gemini';

interface ApiKeys { openai?: string; anthropic?: string; gemini?: string; }

const PROVIDERS: { id: Provider; label: string; placeholder: string }[] = [
  { id: 'anthropic', label: 'Anthropic (Claude)', placeholder: 'sk-ant-api03-...' },
  { id: 'openai',    label: 'OpenAI (GPT-4o)',    placeholder: 'sk-proj-...' },
  { id: 'gemini',    label: 'Google Gemini',       placeholder: 'AIzaSy...' },
];

function loadApiKeys(): ApiKeys {
  try { return JSON.parse(localStorage.getItem('hiretrack_api_keys') || '{}'); }
  catch { return {}; }
}

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  user: SupabaseUser | null;
  isGuest: boolean;
  onSignOut: () => void;
  onSignIn: () => void;
  onOpenProfile: () => void;
}

export function Header({ theme, onToggleTheme, user, isGuest, onSignOut, onSignIn, onOpenProfile }: HeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeys, setApiKeys]           = useState<ApiKeys>(loadApiKeys);
  const [keyInputs, setKeyInputs]       = useState<Partial<Record<Provider, string>>>({});
  const [showKeys, setShowKeys]         = useState<Partial<Record<Provider, boolean>>>({});
  const [profileResumeUrl, setProfileResumeUrl] = useState(
    () => localStorage.getItem('hiretrack_profile_resume_url') || ''
  );
  const [resumeInput, setResumeInput]   = useState('');

  const hasAnyKey = PROVIDERS.some(p => !!apiKeys[p.id]);

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

  const saveProfileResume = () => {
    const url = resumeInput.trim();
    if (!url) return;
    setProfileResumeUrl(url);
    localStorage.setItem('hiretrack_profile_resume_url', url);
    setResumeInput('');
  };

  const removeProfileResume = () => {
    setProfileResumeUrl('');
    localStorage.removeItem('hiretrack_profile_resume_url');
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-900/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 md:px-8 h-14">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-black text-white text-xs font-display shadow shadow-indigo-500/30 shrink-0">
              HT
            </div>
            <div className="leading-tight">
              <span className="text-base font-black tracking-tight font-display text-slate-100 block leading-none">
                HireTrack<span className="text-indigo-400">.pro</span>
              </span>
              <span className="hidden sm:block text-[9px] text-indigo-300 font-mono tracking-widest uppercase leading-none mt-0.5">
                Developer Suite
              </span>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1.5">
            {/* Theme toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4 text-amber-400" />
                : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>

            {/* Settings (AI keys + resume) */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition relative"
              aria-label="Settings"
              title="Settings — AI Keys & Profile Resume"
            >
              <Settings className="w-4 h-4" />
              {hasAnyKey && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              )}
            </button>

            {/* User block */}
            {user ? (
              <div className="flex items-center gap-1.5 ml-1">
                <button
                  onClick={onOpenProfile}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition"
                  aria-label="Open profile"
                >
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="Avatar"
                      className="w-6 h-6 rounded-full object-cover border border-slate-700"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                    </div>
                  )}
                  <span className="hidden sm:block text-xs font-bold text-slate-300 max-w-[120px] truncate">
                    {user.user_metadata?.full_name || user.email?.split('@')[0]}
                  </span>
                </button>
                <button
                  onClick={onSignOut}
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                className="flex items-center gap-1.5 ml-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition"
                aria-label="Sign in"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-start justify-end p-4 pt-16">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            onClick={() => setShowSettings(false)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-400" />
                Settings
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition"
                aria-label="Close settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* AI Provider Keys */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-indigo-400" />
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">AI Provider Keys (BYOK)</h4>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  Keys stored in your browser only. Never sent to any server except the AI provider.
                </p>

                {PROVIDERS.map(p => {
                  const saved = !!apiKeys[p.id];
                  return (
                    <div key={p.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300">{p.label}</span>
                        <div className="flex items-center gap-2">
                          {saved && (
                            <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-bold">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          )}
                          {saved && (
                            <button onClick={() => removeKey(p.id)} className="text-[9px] text-rose-400 hover:text-rose-300 font-bold transition">
                              Remove
                            </button>
                          )}
                        </div>
                      </div>

                      {saved ? (
                        <div className="flex items-center gap-2 bg-slate-950/60 rounded-lg px-2.5 py-1.5 border border-slate-800">
                          <span className="text-[10px] font-mono text-slate-600">
                            {apiKeys[p.id]!.slice(0, 8)}{'•'.repeat(16)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <div className="relative flex-1">
                            <input
                              type={showKeys[p.id] ? 'text' : 'password'}
                              value={keyInputs[p.id] || ''}
                              onChange={e => setKeyInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && saveKey(p.id)}
                              placeholder={p.placeholder}
                              className="w-full bg-slate-950/60 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition pr-8"
                            />
                            <button
                              type="button"
                              onClick={() => setShowKeys(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
                              aria-label={showKeys[p.id] ? 'Hide' : 'Show'}
                            >
                              {showKeys[p.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <button
                            onClick={() => saveKey(p.id)}
                            disabled={!keyInputs[p.id]?.trim()}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition shrink-0"
                          >
                            Save
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="border-t border-slate-800" />

              {/* Profile Resume */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Master Resume URL</h4>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  Paste your Google Drive / Dropbox master resume link. Used as the base for AI-generated tailored resumes.
                </p>

                {profileResumeUrl ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 bg-slate-950/60 rounded-lg px-2.5 py-2 border border-slate-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-[10px] font-mono text-slate-400 truncate flex-1">{profileResumeUrl}</span>
                    </div>
                    <button onClick={removeProfileResume} className="text-[10px] text-rose-400 hover:text-rose-300 font-bold transition">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      type="url"
                      value={resumeInput}
                      onChange={e => setResumeInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveProfileResume()}
                      placeholder="https://drive.google.com/..."
                      className="flex-1 bg-slate-950/60 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition"
                    />
                    <button
                      onClick={saveProfileResume}
                      disabled={!resumeInput.trim()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition shrink-0"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
