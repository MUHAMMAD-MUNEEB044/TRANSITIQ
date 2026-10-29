import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore } from '../store/toastStore.js';

const VARIANT_STYLES = {
  success: {
    icon: CheckCircle2,
    ring: 'border-status-green/40',
    iconColor: 'text-status-green',
    glow: 'shadow-status-green/10',
  },
  error: {
    icon: AlertTriangle,
    ring: 'border-status-red/40',
    iconColor: 'text-status-red',
    glow: 'shadow-status-red/10',
  },
  info: {
    icon: Info,
    ring: 'border-accent-blue/40',
    iconColor: 'text-accent-blue',
    glow: 'shadow-accent-blue/10',
  },
};

export const ToastHost = () => {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm pointer-events-none">
      {toasts.map((t) => {
        const style = VARIANT_STYLES[t.variant] || VARIANT_STYLES.info;
        const Icon = style.icon;
        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 bg-surface/95 backdrop-blur-md border ${style.ring} rounded-xl px-4 py-3 shadow-xl ${style.glow} animate-toast-in`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${style.iconColor}`} />
            <p className="text-sm text-text-primary flex-1 leading-snug">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="text-text-muted hover:text-white transition-colors shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastHost;
