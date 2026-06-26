import { useState } from 'react';
import { Key, Eye, EyeOff, CheckCircle2, Settings, User } from 'lucide-react';
import { Provider, PROVIDERS, maskKey } from '../lib/apiKeys';
import { useApiKeys } from '../hooks/useApiKeys';
import { Modal, ModalHeader } from './common/Modal';

export { hasAnyApiKey } from '../lib/apiKeys';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { apiKeys, saveKey, removeKey } = useApiKeys();
  const [keyInputs, setKeyInputs] = useState<Partial<Record<Provider, string>>>({});
  const [showKeys, setShowKeys]   = useState<Partial<Record<Provider, boolean>>>({});
  const [profileResumeUrl, setProfileResumeUrl] = useState(
    () => localStorage.getItem('hiretrack_profile_resume_url') || ''
  );
  const [resumeInput, setResumeInput] = useState('');

  const commitKey = (provider: Provider) => {
    const key = keyInputs[provider]?.trim();
    if (!key) return;
    saveKey(provider, key);
    setKeyInputs(prev => ({ ...prev, [provider]: '' }));
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
    <Modal open={open} onClose={onClose} placement="top-right" z="z-[60]">
      <div
        className="relative w-full max-w-sm glass-panel bg-slate-900 rounded-2xl overflow-hidden elevation-3"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <ModalHeader title="Settings" icon={Settings} titleClassName="text-sm" onClose={onClose} closeLabel="Close settings" />

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
                      <span className="text-[10px] font-mono text-slate-600">{maskKey(apiKeys[p.id]!)}</span>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <input
                          type={showKeys[p.id] ? 'text' : 'password'}
                          value={keyInputs[p.id] || ''}
                          onChange={e => setKeyInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && commitKey(p.id)}
                          placeholder={p.placeholder}
                          className="w-full bg-slate-950/60 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition pr-8"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKeys(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400"
                          aria-label={showKeys[p.id] ? 'Hide key' : 'Show key'}
                        >
                          {showKeys[p.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <button
                        onClick={() => commitKey(p.id)}
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

          <div className="border-t border-slate-800" />

          {/* Master Resume URL */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Master Resume URL</h4>
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              Paste your master resume link. Used as the base for AI-generated tailored resumes.
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
    </Modal>
  );
}
