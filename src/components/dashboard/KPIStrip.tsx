import { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bus, AlertTriangle, Wrench, Clock,
  ChevronRight, Activity, HardHat, Zap,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import { useNavikStore } from '../../store/navikStore';
import { severityColor, incidentTypeLabel, formatRelative } from '../ui/helpers';
import { Sparkline } from '../ui/Sparkline';

// ── Animated number count-up ───────────────────────────────
function AnimatedNumber({ value, delay = 0 }: { value: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start: number | null = null;
    const dur = 1100;
    function step(ts: number) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el!.textContent = String(Math.round(value * e));
      if (p < 1) requestAnimationFrame(step);
    }
    const tid = setTimeout(() => requestAnimationFrame(step), delay);
    return () => clearTimeout(tid);
  }, [value, delay]);
  return <span ref={ref}>0</span>;
}

// ── Delta indicator ────────────────────────────────────────
function Delta({ delta, unit = '' }: { delta: number; unit?: string }) {
  if (delta === 0) return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.625rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
      <Minus size={9} /> same
    </span>
  );
  const positive = delta > 0;
  const color    = positive ? 'var(--ok)' : 'var(--danger)';
  const Icon     = positive ? TrendingUp : TrendingDown;
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.625rem', color, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
      <Icon size={9} />
      {positive ? '+' : ''}{delta}{unit}
    </span>
  );
}

// ── KPI card with sparkline ────────────────────────────────
function KPICard({ label, value, unit, color, icon: Icon, delay = 0, sparkData, delta, deltaUnit }: {
  label: string; value: number; unit?: string;
  color: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  delay?: number;
  sparkData: number[];
  delta: number;
  deltaUnit?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: delay / 1000, ease: [0.4, 0, 0.2, 1] }}
      style={{
        flex: '1 1 0', minWidth: 0,
        padding: '10px 12px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-sm)',
        display: 'flex', flexDirection: 'column', gap: 6,
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Subtle color accent in corner */}
      <div style={{
        position: 'absolute', top: -10, right: -10,
        width: 44, height: 44, borderRadius: '50%',
        background: color, opacity: 0.08, filter: 'blur(10px)',
        pointerEvents: 'none',
      }} />

      {/* Label + icon */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: '0.8125rem',    /* 13px — meets minimum */
          fontWeight: 600,
          color: 'var(--text-2)',   /* adequate contrast on both themes */
        }}>
          {label}
        </span>
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: `${color}18`,
          border: `1px solid ${color}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={11} strokeWidth={2} style={{ color } as React.CSSProperties} />
        </div>
      </div>

      {/* Value + sparkline */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.625rem', fontWeight: 700,
            letterSpacing: '-0.04em', lineHeight: 1, color,
          }}>
            <AnimatedNumber value={value} delay={delay} />
          </span>
          {unit && (
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {unit}
            </span>
          )}
        </div>
        <Sparkline data={sparkData} color={color} width={52} height={20} />
      </div>

      {/* Delta vs prev hour */}
      <Delta delta={delta} unit={deltaUnit} />
    </motion.div>
  );
}

// ── Live feed row ──────────────────────────────────────────
function FeedRow({ incidentId }: { incidentId: string }) {
  const incident       = useNavikStore((s) => s.incidents.find((i) => i.id === incidentId));
  const selectIncident = useNavikStore((s) => s.selectIncident);
  const newIds         = useNavikStore((s) => s.newIncidentIds);
  if (!incident) return null;

  const isNew    = newIds.has(incidentId);
  const dotColor = severityColor(incident.severity);

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => selectIncident(incident.id)}
      style={{
        width: '100%',
        background: isNew
          ? 'color-mix(in srgb, var(--danger) 5%, var(--surface))'
          : 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '8px 12px',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 8,
        transition: 'background 0.12s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isNew
          ? 'color-mix(in srgb, var(--danger) 5%, var(--surface))'
          : 'transparent';
      }}
    >
      {/* Severity dot with optional pulse */}
      <div style={{ position: 'relative', flexShrink: 0, width: 8, height: 8 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: dotColor,
          boxShadow: `0 0 4px ${dotColor}`,
        }} />
        {isNew && (
          <div style={{
            position: 'absolute', inset: -3, borderRadius: '50%',
            border: `1.5px solid ${dotColor}`,
            animation: 'pulse-ring 1.5s ease-out infinite',
          }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontSize: '0.75rem', fontWeight: 600,
            color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {incidentTypeLabel(incident.type)}
          </span>
          <span style={{
            fontSize: '0.625rem',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            flexShrink: 0,
          }}>
            {formatRelative(incident.timestamp)}
          </span>
        </div>
        <div style={{
          fontSize: '0.6875rem', color: 'var(--text-muted)',
          marginTop: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {incident.locationLabel}
        </div>
      </div>

      <ChevronRight size={11} style={{ color: 'var(--text-dim)', flexShrink: 0 } as React.CSSProperties} />
    </motion.button>
  );
}

// ── Deterministic fake sparkline (last 8 hours trend) ─────
function makeSparkData(base: number, variance: number, seed: number): number[] {
  const pts: number[] = [];
  let v = base * 0.8;
  for (let i = 0; i < 8; i++) {
    // simple LCG jitter
    const h = ((seed * 1664525 + i * 22695477) & 0x7fffffff) / 0x7fffffff;
    v = Math.max(0, v + (h - 0.5) * variance * 2);
    pts.push(Math.round(v));
  }
  pts.push(base); // current value last
  return pts;
}

// ── Main KPIStrip ──────────────────────────────────────────
export function KPIStrip() {
  const kpis      = useNavikStore((s) => s.kpis);
  const incidents = useNavikStore((s) => s.incidents);

  const recentIds = useMemo(() =>
    incidents
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15)
      .map((i) => i.id),
    [incidents]
  );

  // Sparklines — deterministic fake history, last point = current
  const busSparkData  = makeSparkData(kpis.activeBuses,     4,  1);
  const incSparkData  = makeSparkData(kpis.liveIncidents,   3,  2);
  const delSparkData  = makeSparkData(kpis.avgRouteDelay,   5,  3);
  const defSparkData  = makeSparkData(kpis.defectsPending,  3,  4);
  const woSparkData   = makeSparkData(kpis.workOrdersOpen,  2,  5);
  const bwSparkData   = makeSparkData(Math.round(kpis.bandwidthSavedGB), 8, 6);

  // Delta = diff vs hour-ago (second-to-last point)
  const d = (arr: number[]) => arr[arr.length - 1] - arr[arr.length - 2];

  return (
    <div style={{ padding: '8px 12px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
        <KPICard label="Active buses"    value={kpis.activeBuses}                      color="var(--ok)"     icon={Bus}          delay={0}   sparkData={busSparkData}  delta={d(busSparkData)}  />
        <KPICard label="Live incidents"  value={kpis.liveIncidents}                    color="var(--danger)" icon={AlertTriangle} delay={60}  sparkData={incSparkData}  delta={d(incSparkData)}  />
        <KPICard label="Avg delay"       value={kpis.avgRouteDelay} unit="m"            color="var(--warn)"   icon={Clock}         delay={120} sparkData={delSparkData}  delta={d(delSparkData)} deltaUnit="m" />
        <KPICard label="Defects"         value={kpis.defectsPending}                   color="var(--info)"   icon={Wrench}        delay={180} sparkData={defSparkData}  delta={d(defSparkData)}  />
        <KPICard label="Open WOs"        value={kpis.workOrdersOpen}                   color="var(--warn)"   icon={HardHat}       delay={240} sparkData={woSparkData}   delta={d(woSparkData)}   />
        <KPICard label="BW saved"        value={Math.round(kpis.bandwidthSavedGB)} unit="GB" color="var(--accent)" icon={Zap}    delay={300} sparkData={bwSparkData}   delta={d(bwSparkData)}  deltaUnit="GB" />
      </div>

      {/* Live feed panel */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-2)',
        }}>
          <Activity size={12} strokeWidth={2.5} style={{ color: 'var(--accent)' } as React.CSSProperties} />
          <span style={{
            fontSize: '0.8125rem',  /* ≥13px */
            fontWeight: 600,
            color: 'var(--text-2)',
          }}>
            Live feed
          </span>
          <span className="live-dot" style={{ marginLeft: 'auto' }} />
        </div>

        {/* Rows */}
        <div style={{ maxHeight: 196, overflowY: 'auto' }}>
          <AnimatePresence initial={false}>
            {recentIds.map((id) => (
              <FeedRow key={id} incidentId={id} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
