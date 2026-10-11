import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useNavikStore } from '../../store/navikStore';

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error:   XCircle,
  info:    Info,
};
const COLORS = {
  success: 'var(--ok)',
  warning: 'var(--warn)',
  error:   'var(--danger)',
  info:    'var(--info)',
};

export function ToastContainer() {
  const toasts      = useNavikStore((s) => s.toasts);
  const removeToast = useNavikStore((s) => s.removeToast);

  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon  = ICONS[toast.type];
          const color = COLORS[toast.type];
          return (
            <motion.div
              key={toast.id}
              className={`toast toast-${toast.type === 'error' ? 'error' : toast.type}`}
              initial={{ opacity:0, x:40, scale:0.96 }}
              animate={{ opacity:1, x:0,  scale:1 }}
              exit={{ opacity:0, x:40, scale:0.96 }}
              transition={{ type:'spring', stiffness:360, damping:32 }}
              role="alert"
              aria-live="polite"
            >
              <Icon size={16} strokeWidth={2} style={{ color, flexShrink:0, marginTop:1 } as React.CSSProperties} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:'0.875rem', color:'var(--text)' }}>{toast.title}</div>
                {toast.message && (
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:2, lineHeight:1.4 }}>{toast.message}</div>
                )}
              </div>
              <button
                className="btn btn-ghost btn-icon btn-xs"
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
                style={{ flexShrink:0, pointerEvents:'all' }}
              >
                <X size={13} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
