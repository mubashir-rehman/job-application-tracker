// Lightweight, localStorage-only UI/workflow preferences — no Supabase sync,
// no relation to UserProfile (hard triage rules) or PromptManager (LLM prompt
// overrides). Follows the apiKeys.ts pattern for a bare client-side setting.

const RESEARCH_NUDGE_KEY = 'hiretrack_research_nudge_enabled';

// Default: enabled. Only an explicit '0' turns it off.
export function isResearchNudgeEnabled(): boolean {
  return localStorage.getItem(RESEARCH_NUDGE_KEY) !== '0';
}

export function setResearchNudgeEnabled(enabled: boolean): void {
  localStorage.setItem(RESEARCH_NUDGE_KEY, enabled ? '1' : '0');
}
