import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useNavikStore } from '../../store/navikStore';

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error:   XCircle,
  info:    Info,
};

const ICON_COLORS = {
  success: 'var(--ok)',
  warning: 'var(--warn)',
  error:   'var(--danger)',
  info:    'var(--info)',
};

export function ToastContainer() {
  const toasts      = useNavikStore((s) => s.toasts);
  const removeToast = useNavikStore((s) => s.removeToast);

  // Only show the most recent 1 toast (spec: max 1 visible)
  const visible = toasts.slice(-1);

  return (
    <div className="toast-container" role="region" aria-label="Notifications" aria-live="polite">
      <AnimatePresence>
        {visible.map((toast) => {
          const Icon  = ICONS[toast.type];
          const color = ICON_COLORS[toast.type];
          return (
            <motion.div
              key={toast.id}
              className={`toast toast-${toast.type === 'error' ? 'error' : toast.type}`}
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{    opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              role="alert"
            >
              <Icon size={15} strokeWidth={2} style={{ color, flexShrink: 0, marginTop: 1 } as React.CSSProperties} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', lineHeight: 1.4 }}>{toast.title}</div>
                {toast.message && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>{toast.message}</div>
                )}
              </div>
              <button
                className="btn btn-ghost btn-icon btn-xs"
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss"
                style={{ flexShrink: 0, color: 'var(--muted)', pointerEvents: 'all' }}
              >
                <X size={12} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
