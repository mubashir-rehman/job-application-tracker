import { useState } from 'react';
import { User, Mail, Calendar, Database, ShieldAlert, LogOut, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Modal, ModalHeader } from './common/Modal';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
  const [isConfirmingDeactivate, setIsConfirmingDeactivate] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateSuccess, setDeactivateSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const email = user.email || 'N/A';
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0];
  const avatarUrl = user.user_metadata?.avatar_url;
  const provider = user.app_metadata?.provider || 'email';
  const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'Unknown';

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error signing out.');
    }
  };

  const handleDeactivateAccount = async () => {
    if (confirmInput.toLowerCase() !== 'deactivate') {
      setErrorMsg('Please type "deactivate" to confirm.');
      return;
    }

    setIsDeactivating(true);
    setErrorMsg(null);

    try {
      // Real update of user metadata in Supabase Auth to record deactivation state
      const { error } = await supabase.auth.updateUser({
        data: {
          deactivated: true,
          deactivation_date: new Date().toISOString(),
          retention_period_days: 90
        }
      });

      if (error) throw error;

      setDeactivateSuccess(true);
      
      // Auto-sign out after 3.5 seconds
      setTimeout(async () => {
        await supabase.auth.signOut();
        onClose();
      }, 3500);

    } catch (err: any) {
      setErrorMsg(err.message || 'Deactivation request failed. Please try again.');
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <Modal open={isOpen && !!user} onClose={onClose}>
      <div
        className="relative bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-800 flex flex-col"
        id="profile-modal"
      >
        <ModalHeader
          title="Developer Profile"
          subtitle="Manage your synchronized cloud account"
          icon={User}
          titleClassName="text-xl"
          className="p-6"
          onClose={onClose}
          closeLabel="Close Profile"
        />

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-6">
          {deactivateSuccess ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-rose-950/40 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto text-rose-400">
                <ShieldAlert className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">Account Deactivated Successfully</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Your account is now set to <strong className="text-rose-400">Inactive</strong>. Under our 90-day data retention policy, your pipeline tables are scheduled for permanent purge on <span className="text-slate-200 underline font-mono">{new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>.
              </p>
              <p className="text-[10px] text-slate-500 italic">Signing out in a moment...</p>
            </div>
          ) : (
            <>
              {/* Profile Card Summary */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center gap-4 bg-slate-950/35">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={fullName} 
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-700 shadow"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-900/40 flex items-center justify-center shadow">
                    <User className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                )}
                
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-100 text-base truncate">{fullName}</h3>
                    <span className="text-[9px] font-black tracking-widest bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/40 px-1.5 py-0.5 rounded uppercase font-mono">
                      {provider}
                    </span>
                  </div>
                  
                  <p className="text-xs text-slate-400 truncate flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{email}</span>
                  </p>
                  
                  <p className="text-[10px] text-slate-500 flex items-center gap-1.5 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-600" />
                    <span>Joined: {createdAt}</span>
                  </p>
                </div>
              </div>

              {/* Connected Infrastructure Indicator */}
              <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                  <Database className="w-4 h-4" />
                  <span>Cloud DB Synchronized</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Your pipeline records are safely backed up to your dedicated Postgres project on Supabase. Row Level Security policies prevent other clients from viewing your developer tracks.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Actions Section */}
              <div className="space-y-4">
                {/* Sign Out Button */}
                <button
                  onClick={handleSignOut}
                  className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-850 text-slate-200 hover:text-slate-100 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-slate-800 cursor-pointer transition-all"
                >
                  <LogOut className="w-4 h-4 text-slate-400" />
                  <span>Sign Out of Account</span>
                </button>

                {/* Account Deactivation / Retention Flow */}
                {!isConfirmingDeactivate ? (
                  <button
                    onClick={() => setIsConfirmingDeactivate(true)}
                    className="w-full py-2.5 px-4 bg-slate-900/10 hover:bg-rose-950/10 text-rose-400/90 hover:text-rose-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-rose-950/30 cursor-pointer transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Account / Deactivate</span>
                  </button>
                ) : (
                  <div className="p-4.5 bg-rose-950/10 border border-rose-900/20 rounded-2xl space-y-4 animate-fadeIn">
                    <div className="flex items-start gap-2.5">
                      <ShieldAlert className="w-4.5 h-4.5 text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-rose-300">Deactivation & 90-Day Retention Policy</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Your profile will be set to <strong className="text-rose-400">Inactive</strong> immediately. Your logged pipeline and database data will be completely and permanently deleted after a **90-day retention grace period**. During this period, you can contact support to cancel the purge.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-rose-400/80 block uppercase tracking-wider">
                        Type <code className="text-rose-300 font-mono bg-rose-950/40 px-1 py-0.5 rounded">deactivate</code> to confirm:
                      </label>
                      <input
                        type="text"
                        placeholder="deactivate"
                        value={confirmInput}
                        onChange={(e) => setConfirmInput(e.target.value)}
                        className="w-full bg-slate-950 border border-rose-900/20 text-slate-200 text-xs px-3.5 py-2 rounded-xl focus:outline-none focus:border-rose-500 transition"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDeactivateAccount}
                        disabled={isDeactivating || confirmInput.toLowerCase() !== 'deactivate'}
                        className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        {isDeactivating ? 'Requesting...' : 'Confirm Deactivation'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsConfirmingDeactivate(false);
                          setConfirmInput('');
                          setErrorMsg(null);
                        }}
                        className="py-2 px-4 bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-xl font-bold text-[11px] border border-slate-850 cursor-pointer transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
