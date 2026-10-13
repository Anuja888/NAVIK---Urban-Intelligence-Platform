import type { Severity, DefectCategory, Bus, IncidentType, IncidentStatus, DefectStatus } from '../../types';

// ── Real hex values — never CSS vars ─────────────────────
// These are used in SVG, Leaflet, Recharts, and inline style contexts
// where CSS custom properties are not resolved.

export const SEV_HEX_LIGHT: Record<Severity, string> = {
  critical: '#B42318',
  high:     '#C2410C',
  medium:   '#A16207',
  low:      '#15803D',
};

export const SEV_HEX_DARK: Record<Severity, string> = {
  critical: '#FDA29B',
  high:     '#FDBA74',
  medium:   '#FCD34D',
  low:      '#6EE7B7',
};

export function severityColor(s: Severity): string {
  const dark = typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'dark';
  return dark ? SEV_HEX_DARK[s] : SEV_HEX_LIGHT[s];
}

export function severityLabel(s: Severity): string {
  return { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' }[s] ?? s;
}

export function incidentTypeLabel(t: IncidentType): string {
  return {
    hit_and_run:          'Hit & Run',
    rash_driving:         'Rash Driving',
    pedestrian_hazard:    'Pedestrian Hazard',
    school_zone_alert:    'School Zone Alert',
    road_defect:          'Road Defect',
    congestion_alert:     'Congestion Alert',
    vehicle_breakdown:    'Vehicle Breakdown',
    waterlogging_critical:'Waterlogging Critical',
  }[t] ?? t;
}

export function incidentTypeColor(t: IncidentType): string {
  // Real hex — used in SVG markers
  const dark = typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'dark';
  const map: Record<IncidentType, [string, string]> = {
    hit_and_run:           ['#B42318', '#FDA29B'],
    rash_driving:          ['#B42318', '#FDA29B'],
    pedestrian_hazard:     ['#A16207', '#FCD34D'],
    school_zone_alert:     ['#A16207', '#FCD34D'],
    road_defect:           ['#1D4ED8', '#93C5FD'],
    congestion_alert:      ['#C2410C', '#FDBA74'],
    vehicle_breakdown:     ['#475569', '#94A3B8'],
    waterlogging_critical: ['#1D4ED8', '#93C5FD'],
  };
  const pair = map[t];
  return pair ? (dark ? pair[1] : pair[0]) : '#64748B';
}

export function defectCategoryLabel(c: DefectCategory): string {
  return {
    pothole:                'Pothole',
    waterlogging:           'Waterlogging',
    missing_signboard:      'Missing Signboard',
    missing_divider:        'Missing Divider',
    missing_zebra_crossing: 'Missing Zebra Crossing',
    damaged_road:           'Damaged Road',
  }[c] ?? c;
}

export function busStatusColor(s: Bus['status']): string {
  // Real hex
  return {
    active:      '#15803D',
    idle:        '#A16207',
    maintenance: '#1D4ED8',
    offline:     '#B42318',
  }[s] ?? '#64748B';
}

export function busStatusLabel(s: Bus['status']): string {
  return { active: 'Active', idle: 'Idle', maintenance: 'Maintenance', offline: 'Offline' }[s] ?? s;
}

export function incidentStatusLabel(s: IncidentStatus): string {
  return {
    new:          'New',
    under_review: 'Under review',
    dispatched:   'Dispatched',
    resolved:     'Resolved',
  }[s] ?? s;
}

export function defectStatusLabel(s: DefectStatus): string {
  return {
    pending:      'Pending',
    under_review: 'Under review',
    dispatched:   'Dispatched',
    resolved:     'Resolved',
  }[s] ?? s;
}

export function confidenceColor(c: number): string {
  if (c >= 90) return '#15803D';
  if (c >= 75) return '#A16207';
  return '#B42318';
}

// ── Time formatters ───────────────────────────────────────
export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  } catch { return '—'; }
}

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  } catch { return '—'; }
}

export function formatRelative(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60)  return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60)  return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)  return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch { return '—'; }
}
