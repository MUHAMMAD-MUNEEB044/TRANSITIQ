import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const ConfirmModal = ({ open, title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface border border-border-subtle rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-modal-in">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
            danger ? 'bg-status-red/15 text-status-red' : 'bg-accent-blue/15 text-accent-blue'
          }`}
        >
          <AlertTriangle className="w-5 h-5" />
        </div>
        <h3 className="font-syne font-bold text-lg text-white mb-1">{title}</h3>
        <p className="text-sm text-text-muted mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-surface-alt hover:bg-white/10 text-text-primary border border-border-subtle transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              danger
                ? 'bg-status-red hover:bg-status-red/90 text-white'
                : 'bg-accent-blue hover:bg-accent-blue/90 text-background'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
