import { WorkModelType, AppliedViaType } from '../types';

export interface StatusStyle { text: string; bg: string; border: string; }

// Full badge palette (text + bg + border) keyed off the status string.
// Shared by the applications list and any status chip.
export function statusColor(status: string): StatusStyle {
  const s = status.toLowerCase();
  if (s.includes('offer')) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
  if (s.includes('reject') || s.includes('fail') || s.includes('archive')) return { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
  if (s.includes('tech') || s.includes('final')) return { text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' };
  if (s.includes('negotiation') || s.includes('hr')) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
  if (s.includes('screening') || s.includes('prescreen')) return { text: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' };
  if (s.includes('submitted')) return { text: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
  return { text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
}

// Text-only tone for the detail header status dot.
export function statusTone(status: string): string {
  const t = status.toLowerCase();
  if (t.includes('offer')) return 'text-emerald-500';
  if (t.includes('reject') || t.includes('archived') || t.includes('fail')) return 'text-rose-500';
  return 'text-indigo-500 dark:text-indigo-400';
}

const COMPANY_PALETTE = [
  'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20',
  'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
];

// Deterministic accent classes for a company's initial avatar.
export function companyColor(name: string): string {
  const clean = name.trim().toUpperCase();
  const hash = clean.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return COMPANY_PALETTE[hash % COMPANY_PALETTE.length];
}

// Dropdown option lists reused by the new-application and detail forms.
export const WORK_MODELS: WorkModelType[] = ['Remote', 'Hybrid', 'Onsite'];
export const APPLIED_VIA: AppliedViaType[] = ['LinkedIn', 'Email', 'Company Form', 'Referral', 'Other'];
