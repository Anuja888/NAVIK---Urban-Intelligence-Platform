// ── SeverityChip — icon + colored pill, no color-only reliance ──
import { AlertCircle, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import type { Severity } from '../../types';

const SEV_CONFIG = {
  low:      { icon: Info,         cls: 'sev-chip-low',      label: 'Low'      },
  medium:   { icon: AlertCircle,  cls: 'sev-chip-medium',   label: 'Medium'   },
  high:     { icon: AlertTriangle,cls: 'sev-chip-high',     label: 'High'     },
  critical: { icon: AlertOctagon, cls: 'sev-chip-critical', label: 'Critical' },
} as const;

interface SeverityChipProps {
  severity: Severity;
  /** Show text label alongside icon (default true) */
  showLabel?: boolean;
  size?: number;
}

export function SeverityChip({ severity, showLabel = true, size = 11 }: SeverityChipProps) {
  const cfg = SEV_CONFIG[severity];
  const Icon = cfg.icon;
  return (
    <span className={`sev-chip ${cfg.cls}`}>
      <Icon size={size} strokeWidth={2.2} aria-hidden="true" />
      {showLabel && cfg.label}
    </span>
  );
}
