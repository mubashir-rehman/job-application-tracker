import React from 'react';
import { Command } from 'cmdk';
import { Search } from 'lucide-react';

export interface CommandAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: CommandAction[];
}

export function CommandPalette({ open, onOpenChange, actions }: CommandPaletteProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center pt-[18vh] px-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => onOpenChange(false)} />

      <Command
        label="Command palette"
        className="relative w-full max-w-lg glass-panel bg-slate-900 rounded-2xl overflow-hidden elevation-3"
      >
        <div className="flex items-center gap-2 px-4 border-b border-slate-800">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <Command.Input
            autoFocus
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent py-3.5 text-sm text-slate-100 placeholder-slate-500 outline-none"
          />
          <kbd className="text-[9px] font-mono bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">esc</kbd>
        </div>

        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="py-8 text-center text-xs text-slate-500">
            No matching commands.
          </Command.Empty>
          <Command.Group heading="Actions" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
            {actions.map(({ id, label, icon: Icon, shortcut, run }) => (
              <Command.Item
                key={id}
                value={label}
                onSelect={() => { run(); onOpenChange(false); }}
                className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-semibold text-slate-300 cursor-pointer data-[selected=true]:bg-indigo-500/15 data-[selected=true]:text-indigo-600 dark:data-[selected=true]:text-indigo-300 transition"
              >
                {Icon && <Icon className="w-4 h-4 shrink-0 text-slate-400" />}
                <span className="flex-1">{label}</span>
                {shortcut && (
                  <kbd className="text-[9px] font-mono bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">{shortcut}</kbd>
                )}
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
