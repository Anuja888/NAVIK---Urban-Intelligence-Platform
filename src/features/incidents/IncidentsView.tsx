import React from 'react';
import { Search, AlertTriangle, ChevronRight, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavikStore } from '../../store/navikStore';
import {
  severityLabel, incidentTypeLabel, incidentTypeColor,
  incidentStatusLabel, formatDateTime,
} from '../../components/ui/helpers';
import type { IncidentType, Severity, IncidentStatus } from '../../types';

const INCIDENT_TYPES: IncidentType[] = [
  'hit_and_run','rash_driving','pedestrian_hazard','school_zone_alert',
  'road_defect','congestion_alert','vehicle_breakdown','waterlogging_critical',
];

// Real hex — no CSS vars
const SEV_TEXT: Record<Severity, string> = {
  critical: '#B42318', high: '#C2410C', medium: '#A16207', low: '#15803D',
};
const STATUS_COLORS: Record<IncidentStatus, string> = {
  new: '#B42318', under_review: '#A16207', dispatched: '#1D4ED8', resolved: '#15803D',
};
const STATUS_PIPELINE: { status: IncidentStatus; label: string }[] = [
  { status: 'new',          label: 'New' },
  { status: 'under_review', label: 'Under review' },
  { status: 'dispatched',   label: 'Dispatched' },
  { status: 'resolved',     label: 'Resolved' },
];

export function IncidentsView() {
  const incidents         = useNavikStore((s) => s.incidents);
  const incidentFilter    = useNavikStore((s) => s.incidentFilter);
  const setIncidentFilter = useNavikStore((s) => s.setIncidentFilter);
  const selectIncident    = useNavikStore((s) => s.selectIncident);

  const filtered = incidents
    .filter((inc) => {
      if (incidentFilter.type     && inc.type     !== incidentFilter.type)     return false;
      if (incidentFilter.severity && inc.severity !== incidentFilter.severity) return false;
      if (incidentFilter.status   && inc.status   !== incidentFilter.status)   return false;
      if (incidentFilter.search) {
        const q = incidentFilter.search.toLowerCase();
        return (
          inc.id.toLowerCase().includes(q) ||
          inc.locationLabel.toLowerCase().includes(q) ||
          inc.description.toLowerCase().includes(q) ||
          (inc.plateNumber ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const hasFilters = !!(incidentFilter.type || incidentFilter.severity || incidentFilter.status || incidentFilter.search);
  const newCount   = incidents.filter((i) => i.status === 'new').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--canvas)' }}>

      {/* Status pipeline — counts */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 8, padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        {STATUS_PIPELINE.map(({ status, label }) => {
          const count  = incidents.filter((i) => i.status === status).length;
          const active = incidentFilter.status === status;
          const hex    = STATUS_COLORS[status];
          return (
            <button key={status}
              onClick={() => setIncidentFilter({ status: active ? '' : status })}
              style={{
                flex: '1 1 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                padding: '7px 6px', borderRadius: 8,
                background: active ? 'var(--surface-2)' : 'transparent',
                border: `1px solid ${active ? 'var(--border-2)' : 'var(--border)'}`,
                cursor: 'pointer', transition: 'all 0.12s',
              }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 20, color: active ? hex : 'var(--ink)', lineHeight: 1 }}>
                {count}
              </span>
              <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? hex : 'var(--muted)' }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 8, padding: '8px 20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', alignItems: 'center', background: 'var(--surface)' }}>
        <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
          <Search size={13} strokeWidth={2} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--placeholder)' } as React.CSSProperties} />
          <input className="form-input" style={{ paddingLeft: 32, height: 34 }}
            placeholder="Search ID, location, plate…"
            value={incidentFilter.search} onChange={(e) => setIncidentFilter({ search: e.target.value })} />
        </div>
        <select className="form-select" style={{ width: 155, height: 34 }} value={incidentFilter.type} onChange={(e) => setIncidentFilter({ type: e.target.value })}>
          <option value="">All types</option>
          {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{incidentTypeLabel(t)}</option>)}
        </select>
        <select className="form-select" style={{ width: 128, height: 34 }} value={incidentFilter.severity} onChange={(e) => setIncidentFilter({ severity: e.target.value })}>
          <option value="">All severity</option>
          {(['critical','high','medium','low'] as Severity[]).map((s) => <option key={s} value={s}>{severityLabel(s)}</option>)}
        </select>
        {hasFilters && <button className="btn btn-ghost btn-sm" onClick={() => setIncidentFilter({ type:'',severity:'',status:'',search:'' })}>Clear</button>}
        {newCount > 0 && <span className="badge badge-danger" style={{ marginLeft: 'auto' }}>{newCount} new</span>}
      </div>

      {/* List — 48px rows, 1 chip max, severity left border */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <AlertTriangle size={32} />
            <h4>No incidents match filters</h4>
            <button className="btn btn-secondary btn-sm" onClick={() => setIncidentFilter({ type:'',severity:'',status:'',search:'' })}>Clear filters</button>
          </div>
        ) : (
          filtered.map((inc, i) => {
            const typeColor   = incidentTypeColor(inc.type);
            const isNew       = inc.status === 'new';
            const sevHex      = SEV_TEXT[inc.severity];

            return (
              <motion.button
                key={inc.id}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.012, 0.25) }}
                onClick={() => selectIncident(inc.id)}
                className={`inc-row inc-row-${inc.severity}${isNew ? ' inc-row-new' : ''}`}
                style={{
                  width: '100%', textAlign: 'left', border: 'none',
                  borderBottom: '1px solid var(--border)',
                  background: isNew ? `rgba(180,35,24,0.03)` : 'var(--surface)',
                  /* 48px row height */
                  padding: '0 20px 0 24px', height: 56,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isNew ? 'rgba(180,35,24,0.03)' : 'var(--surface)'; }}
              >
                {/* Type icon */}
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: `${typeColor}12`, border: `1px solid ${typeColor}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {inc.type === 'hit_and_run' || inc.type === 'rash_driving'
                    ? <Shield size={14} strokeWidth={2} style={{ color: typeColor } as React.CSSProperties} />
                    : <AlertTriangle size={14} strokeWidth={2} style={{ color: typeColor } as React.CSSProperties} />
                  }
                </div>

                {/* Main text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>
                      {incidentTypeLabel(inc.type)}
                    </span>
                    {/* 1 chip max — severity only */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      padding: '1px 7px', borderRadius: 99,
                      fontSize: 11, fontWeight: 600,
                      background: `${sevHex}14`,
                      color: sevHex,
                      border: `1px solid ${sevHex}28`,
                    }}>
                      {severityLabel(inc.severity)}
                    </span>
                    {inc.plateNumber && (
                      <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--sev-critical-text)', background: 'var(--sev-critical-tint)', padding: '1px 7px', borderRadius: 99, border: '1px solid var(--sev-critical-border)' }}>
                        {inc.plateNumber}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inc.locationLabel} · {formatDateTime(inc.timestamp)}
                    <span style={{ marginLeft: 8, fontWeight: 500, color: STATUS_COLORS[inc.status] }}>{incidentStatusLabel(inc.status)}</span>
                  </div>
                </div>

                <ChevronRight size={13} style={{ color: 'var(--muted)', flexShrink: 0 } as React.CSSProperties} />
              </motion.button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div style={{ flexShrink: 0, padding: '8px 20px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--muted)', background: 'var(--surface)' }}>
        {filtered.length} / {incidents.length} incidents · TS Traffic Police + TGSRTC OCC
      </div>
    </div>
  );
}
