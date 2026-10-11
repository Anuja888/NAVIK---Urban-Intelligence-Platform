import { motion } from 'framer-motion';
import { Search, AlertTriangle, ChevronRight, Shield } from 'lucide-react';
import { useNavikStore } from '../../store/navikStore';
import {
  severityColor, severityLabel, incidentTypeLabel, incidentTypeColor,
  incidentStatusLabel, formatDateTime,
} from '../../components/ui/helpers';
import { SeverityChip } from '../../components/ui/SeverityChip';
import type { IncidentType, Severity, IncidentStatus } from '../../types';

const INCIDENT_TYPES: IncidentType[] = [
  'hit_and_run','rash_driving','pedestrian_hazard','school_zone_alert',
  'road_defect','congestion_alert','vehicle_breakdown','waterlogging_critical',
];

const STATUS_PIPELINE: { status: IncidentStatus; color: string }[] = [
  { status: 'new',          color: 'var(--danger)' },
  { status: 'under_review', color: 'var(--warn)'   },
  { status: 'dispatched',   color: 'var(--info)'   },
  { status: 'resolved',     color: 'var(--ok)'     },
];

const STATUS_COLORS: Record<IncidentStatus, string> = {
  new:          'var(--danger)',
  under_review: 'var(--warn)',
  dispatched:   'var(--info)',
  resolved:     'var(--ok)',
};

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
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      {/* Status pipeline */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        gap: 6,
        padding: '10px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
      }}>
        {STATUS_PIPELINE.map(({ status, color }) => {
          const count  = incidents.filter((i) => i.status === status).length;
          const active = incidentFilter.status === status;
          return (
            <button
              key={status}
              onClick={() => setIncidentFilter({ status: active ? '' : status })}
              style={{
                flex: '1 1 0',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '8px 6px',
                borderRadius: 9,
                background: active ? `${color}12` : 'var(--surface-2)',
                border: `1px solid ${active ? color : 'var(--border)'}`,
                cursor: 'pointer',
                transition: 'all 0.13s',
              }}
            >
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '1.25rem', color: active ? color : 'var(--text)',
                lineHeight: 1,
              }}>
                {count}
              </span>
              <span style={{
                fontSize: '0.75rem', fontWeight: active ? 600 : 500,
                color: active ? color : 'var(--text-muted)',
              }}>
                {incidentStatusLabel(status)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter toolbar */}
      <div style={{
        flexShrink: 0,
        display: 'flex', gap: 8,
        padding: '8px 20px',
        borderBottom: '1px solid var(--border)',
        flexWrap: 'wrap', alignItems: 'center',
        background: 'var(--surface)',
      }}>
        <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
          <Search size={13} strokeWidth={2} style={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-dim)',
          } as React.CSSProperties} />
          <input
            className="form-input"
            style={{ paddingLeft: 32, height: 34, fontSize: '0.8125rem' }}
            placeholder="Search ID, location, plate…"
            value={incidentFilter.search}
            onChange={(e) => setIncidentFilter({ search: e.target.value })}
            aria-label="Search incidents"
          />
        </div>
        <select className="form-select" style={{ width: 155, height: 34, fontSize: '0.8125rem' }}
          value={incidentFilter.type} onChange={(e) => setIncidentFilter({ type: e.target.value })}>
          <option value="">All types</option>
          {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{incidentTypeLabel(t)}</option>)}
        </select>
        <select className="form-select" style={{ width: 128, height: 34, fontSize: '0.8125rem' }}
          value={incidentFilter.severity} onChange={(e) => setIncidentFilter({ severity: e.target.value })}>
          <option value="">All severity</option>
          {(['critical','high','medium','low'] as Severity[]).map((s) => (
            <option key={s} value={s}>{severityLabel(s)}</option>
          ))}
        </select>
        {hasFilters && (
          <button className="btn btn-ghost btn-sm"
            onClick={() => setIncidentFilter({ type:'', severity:'', status:'', search:'' })}>
            Clear
          </button>
        )}
        {newCount > 0 && (
          <span className="badge badge-danger" style={{ marginLeft: 'auto' }}>
            {newCount} new
          </span>
        )}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <AlertTriangle size={36} />
            <h4>No incidents match your filters</h4>
            <button className="btn btn-secondary btn-sm"
              onClick={() => setIncidentFilter({ type:'', severity:'', status:'', search:'' })}>
              Clear filters
            </button>
          </div>
        ) : (
          filtered.map((inc, i) => {
            const typeColor   = incidentTypeColor(inc.type);
            const isNew       = inc.status === 'new';
            const statusColor = STATUS_COLORS[inc.status];

            return (
              <motion.button
                key={inc.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(i * 0.015, 0.3) }}
                onClick={() => selectIncident(inc.id)}
                /* inc-card + severity left border + new-incident pulse */
                className={[
                  'inc-card',
                  `inc-card-${inc.severity}`,
                  isNew ? 'inc-card-new' : '',
                ].join(' ')}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: isNew
                    ? 'color-mix(in srgb, var(--danger) 4%, var(--surface))'
                    : 'var(--surface)',
                  padding: '12px 20px 12px 24px', /* left pad for 4px border */
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12,
                  transition: 'background 0.12s',
                  boxShadow: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--surface-2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isNew
                    ? 'color-mix(in srgb, var(--danger) 4%, var(--surface))'
                    : 'var(--surface)';
                }}
              >
                {/* Type icon */}
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: `${typeColor}14`,
                  border: `1px solid ${typeColor}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {inc.type === 'hit_and_run' || inc.type === 'rash_driving'
                    ? <Shield size={14} strokeWidth={2} style={{ color: typeColor } as React.CSSProperties} />
                    : <AlertTriangle size={14} strokeWidth={2} style={{ color: typeColor } as React.CSSProperties} />
                  }
                </div>

                {/* Main text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    gap: 6, marginBottom: 4, flexWrap: 'wrap',
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-display)', fontWeight: 600,
                      fontSize: '0.875rem', color: 'var(--text)',
                    }}>
                      {incidentTypeLabel(inc.type)}
                    </span>

                    {/* Severity chip — icon + label, not color-only */}
                    <SeverityChip severity={inc.severity} />

                    {/* Status badge */}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 7px', borderRadius: 999,
                      fontSize: '0.6875rem', fontWeight: 600,
                      fontFamily: 'var(--font-mono)',
                      background: `${statusColor}12`,
                      color: statusColor,
                      border: `1px solid ${statusColor}28`,
                    }}>
                      {isNew && (
                        <span style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: statusColor,
                          display: 'inline-block',
                        }} />
                      )}
                      {incidentStatusLabel(inc.status)}
                    </span>

                    {inc.plateNumber && (
                      <span className="badge badge-danger" style={{ fontFamily: 'var(--font-mono)' }}>
                        {inc.plateNumber}
                      </span>
                    )}
                    {inc.pursuitId && (
                      <span className="badge badge-muted" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem' }}>
                        Pursuit
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: '0.75rem', color: 'var(--text-muted)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {inc.locationLabel} · {inc.detectedBy} · {formatDateTime(inc.timestamp)}
                  </div>
                </div>

                {/* ID + chevron */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span style={{
                    fontSize: '0.5625rem', fontFamily: 'var(--font-mono)',
                    color: 'var(--text-dim)',
                  }}>
                    {inc.id}
                  </span>
                  <ChevronRight size={13} style={{ color: 'var(--text-dim)' } as React.CSSProperties} />
                </div>
              </motion.button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div style={{
        flexShrink: 0,
        padding: '8px 20px',
        borderTop: '1px solid var(--border)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        background: 'var(--surface)',
      }}>
        {filtered.length} / {incidents.length} incidents · TS Traffic Police + TGSRTC OCC
      </div>
    </div>
  );
}

// React import needed for JSX
import React from 'react';
