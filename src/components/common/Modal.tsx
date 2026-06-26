import React from 'react';
import { X } from 'lucide-react';
import { Drawer } from 'vaul';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { usePlatform } from '../../hooks/usePlatform';

// Adaptive modal chrome: a vaul bottom-sheet on mobile (drag-to-dismiss,
// safe-area aware) and a centered/positioned overlay on desktop. The caller
// supplies the panel as children; on mobile its `max-w-*` yields to full
// width, so the same panel reads correctly as a sheet.
export function Modal({ open, onClose, placement = 'center', closeOnBackdrop = true, z = 'z-50', children }: {
  open: boolean;
  onClose: () => void;
  placement?: 'center' | 'top-right';
  closeOnBackdrop?: boolean;
  z?: string;
  children: React.ReactNode;
}) {
  const platform = usePlatform();
  // On mobile vaul owns Escape/overlay dismissal; only wire our handler on desktop.
  useEscapeKey(open && platform === 'desktop', onClose);
  if (!open) return null;

  if (platform === 'mobile') {
    return (
      <Drawer.Root open={open} onOpenChange={o => { if (!o) onClose(); }}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[59] bg-slate-950/60 backdrop-blur-sm" />
          <Drawer.Content
            className="fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center outline-none focus:outline-none"
            style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
          >
            <Drawer.Title className="sr-only">Dialog</Drawer.Title>
            <div className="mx-auto mt-2 mb-2 h-1.5 w-10 shrink-0 rounded-full bg-slate-600" aria-hidden />
            {children}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  // Desktop: backdrop is an absolutely-positioned sibling; panels passed as
  // children must include `relative` so they stack above it.
  const pos = placement === 'top-right' ? 'items-start justify-end pt-16' : 'items-center justify-center';
  return (
    <div className={`fixed inset-0 ${z} flex ${pos} p-4`}>
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      {children}
    </div>
  );
}

// Standard modal header: optional icon, title, optional subtitle, close button.
export function ModalHeader({ title, icon: Icon, subtitle, onClose, closeLabel = 'Close', titleClassName = 'text-lg', className = 'px-5 py-4' }: {
  title: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  subtitle?: string;
  onClose: () => void;
  closeLabel?: string;
  titleClassName?: string;
  className?: string;
}) {
  return (
    <div className={`border-b border-slate-800 flex justify-between items-center shrink-0 ${className}`}>
      <div className="min-w-0">
        <h2 className={`font-black font-display text-slate-100 flex items-center gap-2 ${titleClassName}`}>
          {Icon && <Icon className="w-4 h-4 text-indigo-400 shrink-0" />}
          <span className="truncate">{title}</span>
        </h2>
        {subtitle && <p className="text-slate-400 text-xs mt-0.5 font-medium truncate">{subtitle}</p>}
      </div>
      <button
        onClick={onClose}
        className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition shrink-0"
        aria-label={closeLabel}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
