import React, { useState } from 'react';
import { 
  LogIn, 
  ShieldCheck, 
  UserPlus, 
  Mail, 
  Lock, 
  RefreshCw, 
  Sparkles, 
  Database, 
  User, 
  Terminal,
  ArrowRight,
  Info,
  AlertTriangle,
  Layers,
  BrainCircuit,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

interface LoginScreenProps {
  onGuestLogin: () => void;
  onAuthSuccess: (user: any) => void;
}

export function LoginScreen({ onGuestLogin, onAuthSuccess }: LoginScreenProps) {
  // Auth Form States
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Google OAuth Popup Trigger
  const handleGoogleAuth = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: true
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Open authorization popup window directly (safe for cross-origin iframe embedding!)
        const popup = window.open(data.url, 'supabase_oauth_popup', 'width=600,height=700');
        if (!popup) {
          setAuthError("Popup was blocked by your browser. Please allow popups for this site and try again.");
        }
      } else {
        throw new Error("No OAuth URL returned from Supabase.");
      }
    } catch (err: any) {
      setAuthError(err.message || "An error occurred starting Google sign-in.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Email & Password Auth Handlers
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) return;
    if (!authEmail || !authPassword) {
      setAuthError("Please provide both email and password.");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        
        if (data.user && data.session === null) {
          setAuthSuccess("Sign up successful! Please check your email to confirm your account.");
        } else if (data.session) {
          setAuthSuccess("Account created and signed in successfully!");
          onAuthSuccess(data.user);
        } else {
          setAuthSuccess("Sign up successful! Re-verify credentials or check confirmation email.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        setAuthSuccess("Signed in successfully!");
        if (data?.user) {
          onAuthSuccess(data.user);
        }
      }
      
      // Clear inputs on success
      setAuthEmail('');
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed. Double check your credentials.");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="ambient-bg min-h-screen text-slate-100/90 font-sans flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Background Decorative Blobs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-indigo-500/10 filter blur-3xl opacity-30 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-blue-500/10 filter blur-3xl opacity-30 pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 z-10">
        
        {/* Left Side: Product Branding & Features (7 columns) */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-8 p-4 sm:p-6 lg:p-8">
          
          {/* Logo */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center font-black tracking-tighter text-white font-display shadow-lg shadow-indigo-500/20">
              HT
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight font-display block leading-none">HireTrack<span className="text-indigo-400">.pro</span></span>
              <span className="text-[10px] text-indigo-300 font-mono tracking-widest uppercase mt-1.5 block">Developer Interview Suite</span>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-display text-white tracking-tight leading-[1.1]">
              Track your developer pipeline, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-200">own your interviews.</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base font-medium leading-relaxed max-w-lg">
              Manage your technical opportunities with a beautiful 7-phase timeline, system design trackers, and GPU/HPC skill matrices in one unified dashboard.
            </p>
          </div>

          {/* Key Value Proposition points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
            <div className="glass-panel p-4.5 rounded-2xl border border-slate-800/80 flex items-start gap-3 bg-slate-950/20">
              <Layers className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-white text-xs uppercase tracking-wide">7-Phase Pipeline</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Structured stage timeline with logs, salary range, and post-mortems.</p>
              </div>
            </div>

            <div className="glass-panel p-4.5 rounded-2xl border border-slate-800/80 flex items-start gap-3 bg-slate-950/20">
              <BrainCircuit className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-white text-xs uppercase tracking-wide">Technical Skill Matrix</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Assess distributed systems, GPU kernels, and database replication requirements.</p>
              </div>
            </div>

            <div className="glass-panel p-4.5 rounded-2xl border border-slate-800/80 flex items-start gap-3 bg-slate-950/20">
              <Database className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-white text-xs uppercase tracking-wide">Supabase Integration</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Save opportunities securely to your private PostgreSQL backend.</p>
              </div>
            </div>

            <div className="glass-panel p-4.5 rounded-2xl border border-slate-800/80 flex items-start gap-3 bg-slate-950/20">
              <Terminal className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-white text-xs uppercase tracking-wide">Offline Backup Support</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">Start immediately without an account. Save and export tracking JSON dynamically.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Glassmorphic Auth Form Box (5 columns) */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-slate-900/60 shadow-2xl relative overflow-hidden space-y-6">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-indigo-500/5 filter blur-2xl pointer-events-none" />

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Developer Gate</span>
              </div>
              <h2 className="text-xl font-bold text-slate-100">
                {isSignUp ? "Create Developer Account" : "Welcome Back"}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isSignUp 
                  ? "Sign up to persist your pipeline securely in a cloud database." 
                  : "Sign in to access your secure Cloud Run and PostgreSQL tracks."}
              </p>
            </div>

            {/* Auth Block if Supabase is active */}
            {isSupabaseConfigured ? (
              <div className="space-y-5">
                {/* Google Sign In */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={authLoading}
                  className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center gap-3 transition-all cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="flex items-center gap-3">
                  <div className="h-px bg-slate-800 flex-1" />
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest font-mono">OR EMAIL</span>
                  <div className="h-px bg-slate-800 flex-1" />
                </div>

                {/* Email sign in Form */}
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                      <input 
                        type="email" 
                        placeholder="your@email.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        disabled={authLoading}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        disabled={authLoading}
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs pl-10 pr-10 py-3 rounded-xl focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {authError && (
                    <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-xl text-[11px] text-rose-300 leading-relaxed flex gap-2 items-start">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {authSuccess && (
                    <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-[11px] text-emerald-300 leading-relaxed flex gap-2 items-start">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{authSuccess}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white disabled:text-slate-500 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg shadow-indigo-600/10"
                  >
                    {authLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : isSignUp ? (
                      <>
                        <UserPlus className="w-4 h-4" />
                        <span>Create Developer Account</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Sign In to Account</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setAuthError(null);
                      setAuthSuccess(null);
                    }}
                    disabled={authLoading}
                    className="w-full text-center text-[11px] text-slate-400 hover:text-indigo-400 transition cursor-pointer font-medium"
                  >
                    {isSignUp ? "Already have an account? Sign In" : "Need a secure database account? Sign Up"}
                  </button>
                </form>
              </div>
            ) : (
              /* If Supabase is NOT configured yet (Local Development or missing keys) */
              <div className="space-y-4">
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-amber-500/20 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[10px]">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Cloud Sync Standby</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Supabase connection variables are not currently configured in this workspace. Google and Email logins are temporarily disabled.
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Set <code className="text-indigo-300 bg-indigo-950/40 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_URL</code> and <code className="text-indigo-300 bg-indigo-950/40 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_ANON_KEY</code> in your environment parameters to unlock.
                  </p>
                </div>
              </div>
            )}

            {/* Guest Sandbox Button - ALWAYS active and super elegant! */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <button
                type="button"
                onClick={onGuestLogin}
                className="w-full py-3.5 px-4 bg-slate-950 hover:bg-slate-850 text-indigo-400 hover:text-indigo-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-slate-800 cursor-pointer transition-all hover:border-slate-700 hover:shadow-md"
              >
                <span>Enter Local Sandbox (Guest Mode)</span>
                <ArrowRight className="w-4 h-4 text-indigo-400" />
              </button>
              <p className="text-[10px] text-slate-500 text-center leading-normal">
                No credit card, email, or configuration required. Perfect for instant trials, offline pipeline drafts, and local caching.
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* Footer credits */}
      <footer className="mt-12 text-[10px] text-slate-600 font-mono flex items-center gap-1.5 z-10">
        <span>HireTrack.pro v1.2.0</span>
        <span>•</span>
        <span>Developer Suite PoC</span>
        <span>•</span>
        <span>Secure Local Sandboxing</span>
      </footer>
    </div>
  );
}
