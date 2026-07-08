import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

/**
 * OAuth 2.1 consent screen for Supabase's OAuth server.
 *
 * Supabase redirects third-party clients (e.g. the HireTrack MCP server, which
 * Claude connects to) here — the path configured as `authorization_url_path`
 * in the OAuth server settings. This page reads the `authorization_id`, makes
 * sure the user is signed in, shows what the client is requesting, and calls
 * the three `supabase.auth.oauth.*` methods to approve or deny. On a decision,
 * Supabase returns a `redirect_url` that sends the user back to the client with
 * an authorization code (approved) or an error (denied).
 */

type ClientInfo = { name: string; uri: string; logo_uri: string };

// Friendly labels for the standard OIDC scopes this server grants.
const SCOPE_LABELS: Record<string, string> = {
  openid: 'Verify your identity',
  profile: 'Read your basic profile (name, picture)',
  email: 'Read your email address',
  phone: 'Read your phone number',
};

export default function OAuthConsent() {
  const authorizationId = new URLSearchParams(window.location.search).get('authorization_id');

  const [status, setStatus] = useState<'loading' | 'consent' | 'deciding' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [scopes, setScopes] = useState<string[]>([]);
  const [userEmail, setUserEmail] = useState<string>('');

  const fail = useCallback((msg: string) => {
    setErrorMsg(msg);
    setStatus('error');
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!isSupabaseConfigured || !supabase) {
        fail('This deployment is not configured for sign-in.');
        return;
      }
      if (!authorizationId) {
        fail('Missing authorization request. Please start again from the app that sent you here.');
        return;
      }

      // 1. Require a signed-in user. If there is no session, send them through
      //    Google sign-in and come straight back to this consent URL.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.href },
        });
        return; // full-page redirect in progress
      }
      if (cancelled) return;
      setUserEmail(session.user.email ?? '');

      // 2. Fetch the authorization details. If the user already consented to
      //    these scopes, Supabase returns a redirect_url instead — follow it.
      const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (cancelled) return;
      if (error || !data) {
        fail(error?.message ?? 'Could not load the authorization request. It may have expired.');
        return;
      }
      if ('authorization_id' in data) {
        setClient(data.client);
        setScopes((data.scope || '').split(/\s+/).filter(Boolean));
        setStatus('consent');
      } else {
        window.location.href = data.redirect_url;
      }
    })();

    return () => { cancelled = true; };
  }, [authorizationId, fail]);

  const decide = useCallback(
    async (approve: boolean) => {
      if (!supabase || !authorizationId) return;
      setStatus('deciding');
      const { data, error } = approve
        ? await supabase.auth.oauth.approveAuthorization(authorizationId)
        : await supabase.auth.oauth.denyAuthorization(authorizationId);
      if (error || !data) {
        fail(error?.message ?? 'Could not record your decision. Please try again.');
        return;
      }
      window.location.href = data.redirect_url;
    },
    [authorizationId, fail],
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="glass-panel w-full max-w-md rounded-2xl p-8">
        {status === 'loading' && (
          <div className="text-center py-8">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-400" />
            <p className="text-slate-400">Loading authorization request…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-4">
            <h1 className="text-xl font-bold text-rose-400 mb-2">Something went wrong</h1>
            <p className="text-slate-300">{errorMsg}</p>
          </div>
        )}

        {(status === 'consent' || status === 'deciding') && client && (
          <>
            <div className="flex flex-col items-center text-center mb-6">
              {client.logo_uri ? (
                <img src={client.logo_uri} alt="" className="h-14 w-14 rounded-xl mb-4" />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-2xl font-bold mb-4">
                  {client.name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <h1 className="text-xl font-bold">
                Authorize <span className="text-indigo-400">{client.name || 'this application'}</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                It's requesting access to your HireTrack account
                {userEmail ? <> (<span className="text-slate-300">{userEmail}</span>)</> : null}.
              </p>
            </div>

            <div className="rounded-xl bg-slate-900/60 border border-white/5 p-4 mb-6">
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-3">This will allow it to</p>
              <ul className="space-y-2">
                {scopes.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm text-slate-200">
                    <span className="mt-0.5 text-emerald-400">✓</span>
                    <span>{SCOPE_LABELS[s] ?? s}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2 text-sm text-slate-200">
                  <span className="mt-0.5 text-emerald-400">✓</span>
                  <span>Read and manage your job applications on your behalf</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => decide(false)}
                disabled={status === 'deciding'}
                className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 disabled:opacity-50 transition-colors"
              >
                Deny
              </button>
              <button
                onClick={() => decide(true)}
                disabled={status === 'deciding'}
                className="flex-1 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 transition-colors"
              >
                {status === 'deciding' ? 'Working…' : 'Approve'}
              </button>
            </div>

            {client.uri && (
              <p className="text-center text-xs text-slate-500 mt-4">
                You'll be redirected back to {client.name || 'the application'} after your choice.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
