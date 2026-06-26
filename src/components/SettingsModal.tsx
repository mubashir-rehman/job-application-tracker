import { useState } from 'react';
import { CheckCircle2, Settings, User, Key } from 'lucide-react';
import { Modal, ModalHeader } from './common/Modal';

export { hasAnyApiKey } from '../lib/apiKeys';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [profileResumeUrl, setProfileResumeUrl] = useState(
    () => localStorage.getItem('hiretrack_profile_resume_url') || ''
  );
  const [resumeInput, setResumeInput] = useState('');

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
          {/* AI keys moved to their own sidebar section */}
          <div className="flex items-start gap-2.5 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
            <Key className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              AI provider keys now live in the <span className="font-bold text-slate-200">AI Keys</span> section in the sidebar.
            </p>
          </div>

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
