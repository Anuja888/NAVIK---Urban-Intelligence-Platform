import type { Severity, DefectCategory, Bus, IncidentType, IncidentStatus, DefectStatus } from '../../types';

export function severityColor(s: Severity): string {
  return {
    low:      'var(--sev-low)',
    medium:   'var(--sev-medium)',
    high:     'var(--sev-high)',
    critical: 'var(--sev-critical)',
  }[s] ?? 'var(--text-muted)';
}

export function severityLabel(s: Severity): string {
  return { low:'Low', medium:'Medium', high:'High', critical:'Critical' }[s] ?? s;
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
  return {
    hit_and_run:          'var(--danger)',
    rash_driving:         'var(--danger)',
    pedestrian_hazard:    'var(--warn)',
    school_zone_alert:    'var(--warn)',
    road_defect:          'var(--info)',
    congestion_alert:     'var(--sev-high)',
    vehicle_breakdown:    'var(--text-muted)',
    waterlogging_critical:'var(--info)',
  }[t] ?? 'var(--text-muted)';
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
  return {
    active:      'var(--ok)',
    idle:        'var(--warn)',
    maintenance: 'var(--info)',
    offline:     'var(--danger)',
  }[s] ?? 'var(--text-muted)';
}

export function busStatusLabel(s: Bus['status']): string {
  return { active:'Active', idle:'Idle', maintenance:'Maintenance', offline:'Offline' }[s] ?? s;
}

export function incidentStatusLabel(s: IncidentStatus): string {
  return { new:'New', under_review:'Under review', dispatched:'Dispatched', resolved:'Resolved' }[s] ?? s;
}

export function defectStatusLabel(s: DefectStatus): string {
  return { pending:'Pending', under_review:'Under review', dispatched:'Dispatched', resolved:'Resolved' }[s] ?? s;
}

export function confidenceColor(c: number): string {
  return c >= 90 ? 'var(--ok)' : c >= 75 ? 'var(--warn)' : 'var(--danger)';
}

// ── Time formatters ────────────────────────────────────────
export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
  } catch { return '—'; }
}

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', hour12:false });
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
