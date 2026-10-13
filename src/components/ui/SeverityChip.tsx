// SeverityChip — icon + text pill, never colour-only
import { AlertCircle, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import type { Severity } from '../../types';

interface Props { severity: Severity; showLabel?: boolean; size?: number; }

const CFG = {
  low:      { Icon: Info,          cls: 'badge-low',      label: 'Low'      },
  medium:   { Icon: AlertCircle,   cls: 'badge-medium',   label: 'Medium'   },
  high:     { Icon: AlertTriangle, cls: 'badge-high',     label: 'High'     },
  critical: { Icon: AlertOctagon,  cls: 'badge-critical', label: 'Critical' },
} as const;

export function SeverityChip({ severity, showLabel = true, size = 11 }: Props) {
  const { Icon, cls, label } = CFG[severity];
  return (
    <span className={`badge ${cls}`} style={{ gap: 4 }}>
      <Icon size={size} strokeWidth={2} aria-hidden />
      {showLabel && label}
    </span>
  );
}
