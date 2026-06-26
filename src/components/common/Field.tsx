import React from 'react';

// Shared input class for form controls. Callers append modifiers
// (e.g. `resize-none`, `font-mono`, `cursor-pointer`).
export const fieldInput =
  'w-full bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition';

// Module-level so wrapped inputs keep a stable identity and don't lose
// focus on each keystroke (a component defined in render would remount).
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-0.5 bg-slate-950/50 p-0.5 rounded-lg border border-slate-800 w-full">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 px-2 py-1.5 text-[11px] font-bold rounded-md transition ${
            value === o.value ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Simple <select> bound to a list of string options, styled like a Field input.
export function OptionSelect<T extends string>({ value, options, onChange, className = '' }: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as T)}
      className={`${fieldInput} cursor-pointer ${className}`}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
