import React from 'react';
import { X } from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey';

// Overlay + positioning + Escape/backdrop close. The caller supplies the
// panel as children (keeping its own size/radius), and stops propagation
// itself via the panel — handled here so children don't have to.
export function Modal({ open, onClose, placement = 'center', closeOnBackdrop = true, z = 'z-50', children }: {
  open: boolean;
  onClose: () => void;
  placement?: 'center' | 'top-right';
  closeOnBackdrop?: boolean;
  z?: string;
  children: React.ReactNode;
}) {
  useEscapeKey(open, onClose);
  if (!open) return null;

  const pos = placement === 'top-right'
    ? 'items-start justify-end pt-16'
    : 'items-center justify-center';

  // The backdrop is an absolutely-positioned sibling; panels passed as
  // children must include `relative` so they stack above it.
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
