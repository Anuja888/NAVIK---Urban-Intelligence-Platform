import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bus, AlertTriangle, Clock, Wrench, ChevronRight } from 'lucide-react';
import { useNavikStore } from '../../store/navikStore';
import { incidentTypeLabel, severityLabel, formatRelative } from '../ui/helpers';
import type { Severity } from '../../types';

// Severity dot colour using real hex (no CSS vars in SVG/canvas contexts)
const SEV_HEX: Record<Severity, string> = {
  critical: '#B42318',
  high:     '#C2410C',
  medium:   '#A16207',
  low:      '#15803D',
};
const SEV_HEX_DARK: Record<Severity, string> = {
  critical: '#FDA29B',
  high:     '#FDBA74',
  medium:   '#FCD34D',
  low:      '#6EE7B7',
};
function useSevHex() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return isDark ? SEV_HEX_DARK : SEV_HEX;
}

// ── Animated count-up ─────────────────────────────────────
function CountUp({ to, delay = 0 }: { to: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start: number | null = null;
    const dur = 900;
    const tid = setTimeout(() => {
      requestAnimationFrame(function step(ts) {
        if (!start) start = ts;
        const p = Math.min((ts - start) / dur, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(to * e));
        if (p < 1) requestAnimationFrame(step);
      });
    }, delay);
    return () => clearTimeout(tid);
  }, [to, delay]);
  return <span ref={ref} className="tabnum">0</span>;
}

// ── Single KPI tile ───────────────────────────────────────
function KPITile({ label, value, unit, icon: Icon, delay }: {
  label: string; value: number; unit?: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
  delay?: number;
}) {
  return (
    <motion.div
      className="kpi-tile"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: (delay ?? 0) / 1000 }}
      style={{ flex: '1 1 0', minWidth: 0 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span className="kpi-label">{label}</span>
        <Icon size={14} strokeWidth={1.8} color="var(--muted)" />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span className="kpi-value"><CountUp to={value} delay={delay} /></span>
        {unit && <span style={{ fontSize: 13, color: 'var(--muted)' }}>{unit}</span>}
      </div>
    </motion.div>
  );
}

// ── Needs-attention row ───────────────────────────────────
function AttentionRow({ incidentId }: { incidentId: string }) {
  const incident       = useNavikStore((s) => s.incidents.find((i) => i.id === incidentId));
  const selectIncident = useNavikStore((s) => s.selectIncident);
  const newIds         = useNavikStore((s) => s.newIncidentIds);
  const sevHex         = useSevHex();

  if (!incident) return null;
  const isNew = newIds.has(incidentId);

  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      onClick={() => selectIncident(incident.id)}
      className={`inc-row inc-row-${incident.severity}${isNew ? ' inc-row-new' : ''}`}
      style={{
        width: '100%', border: 'none', background: 'transparent',
        borderBottom: '1px solid var(--border)',
        padding: '10px 16px 10px 20px',
        cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 10,
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: sevHex[incident.severity], flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {incidentTypeLabel(incident.type)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {incident.locationLabel} · {formatRelative(incident.timestamp)}
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 500, color: sevHex[incident.severity], flexShrink: 0 }}>
        {severityLabel(incident.severity)}
      </span>
      <ChevronRight size={12} color="var(--muted)" style={{ flexShrink: 0 }} />
    </motion.button>
  );
}

// ── Main KPIStrip ─────────────────────────────────────────
export function KPIStrip() {
  const kpis      = useNavikStore((s) => s.kpis);
  const incidents = useNavikStore((s) => s.incidents);

  // Top-5 unresolved by severity then recency
  const topIds = incidents
    .filter((i) => i.status !== 'resolved')
    .sort((a, b) => {
      const o = { critical: 0, high: 1, medium: 2, low: 3 };
      return (o[a.severity] - o[b.severity]) ||
             (new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    })
    .slice(0, 5)
    .map((i) => i.id);

  return (
    <div style={{
      padding: '12px 12px 0',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      // DO NOT overlap map — this is a docked strip, map starts below
    }}>
      {/* 4 KPI tiles row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <KPITile label="Active buses"   value={kpis.activeBuses}    icon={Bus}           delay={0}   />
        <KPITile label="Open incidents" value={kpis.liveIncidents}  icon={AlertTriangle} delay={50}  />
        <KPITile label="Avg delay"      value={kpis.avgRouteDelay} unit="min" icon={Clock}        delay={100} />
        <KPITile label="Defects pending" value={kpis.defectsPending} icon={Wrench}        delay={150} />

        {/* Needs attention — right column */}
        <div style={{
          flex: '0 0 280px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 220,
        }}>
          <div style={{ padding: '9px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            <span className="live-dot" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Needs attention</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <AnimatePresence initial={false}>
              {topIds.map((id) => <AttentionRow key={id} incidentId={id} />)}
            </AnimatePresence>
            {topIds.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
                No open incidents
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
