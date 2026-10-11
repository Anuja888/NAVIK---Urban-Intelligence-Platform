import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, HardHat, Shield, Activity, Zap, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useNavikStore } from '../../store/navikStore';
import { formatRelative } from '../../components/ui/helpers';
import type { AgentId, AgentActivityEntry } from '../../types';

// ── Agent definitions ──────────────────────────────────────
const AGENTS: Array<{
  id: AgentId; name: string; description: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  accentColor: string;
  capabilities: string[];
}> = [
  {
    id: 'civil_engineer', name: 'Civil Engineer Agent', accentColor: 'var(--warn)',
    icon: HardHat,
    description: 'Detects infrastructure defects from fleet cameras, computes BOQ & repair method, generates GHMC work orders, and verifies repairs via closed-loop re-scan.',
    capabilities: ['Defect dimension estimation via camera calibration','IRC:82-aligned repair method selection','Weighted priority scoring & SLA assignment','GHMC work order generation & contractor assignment','Closed-loop AI verification post-repair'],
  },
  {
    id: 'pursuit', name: 'Pursuit Agent', accentColor: 'var(--danger)',
    icon: Shield,
    description: 'Broadcasts hit-and-run plate signatures across the live fleet, fuses per-frame confidence from multiple buses, builds tamper-evident evidence packets, and facilitates TS Traffic Police handoff.',
    capabilities: ['Cross-fleet plate broadcast & sighting correlation','Multi-frame Bayesian confidence fusion','Predicted route cone from heading extrapolation','SHA-256 evidence packet generation','Chain-of-custody logging & secure police link'],
  },
  {
    id: 'traffic_advisor', name: 'Traffic Advisor Agent', accentColor: 'var(--accent)',
    icon: Activity,
    description: 'Monitors congestion scores across 12 road segments, proposes ranked traffic interventions, runs deterministic what-if simulations, and applies changes to the live store.',
    capabilities: ['Real-time congestion monitoring & bottleneck ranking','3 ranked action proposals with rationale','Deterministic before/after simulation','Live map & KPI update on apply','Full undo capability with state restoration'],
  },
  {
    id: 'safety_guardian', name: 'Safety Guardian', accentColor: 'var(--ok)',
    icon: Zap,
    description: 'Monitors all active school zones in real time, triggers speed-zone alerts when buses detect speeding vehicles during school hours, and escalates pedestrian hazard incidents.',
    capabilities: ['6 school zones with configurable alert windows','Real-time vehicle speed monitoring in zones','Automatic incident creation for zone violations','Pedestrian hazard detection & escalation','School dismissal time awareness'],
  },
];

// ── Agent card ─────────────────────────────────────────────
function AgentCard({ agent }: { agent: typeof AGENTS[0] }) {
  const [expanded, setExpanded] = useState(false);
  const agentLog      = useNavikStore((s) => s.agentActivityLog);
  const incidents     = useNavikStore((s) => s.incidents);
  const workOrders    = useNavikStore((s) => s.workOrders);
  const pursuitSessions = useNavikStore((s) => s.pursuitSessions);

  // Derive stats per agent
  const todayLog = agentLog.filter((e) => e.agentId === agent.id &&
    new Date(e.timestamp).toDateString() === new Date().toDateString()
  );
  const recentLog = agentLog.filter((e) => e.agentId === agent.id).slice(0, 3);

  const stats = {
    civil_engineer: {
      tasks: workOrders.length,
      queue: incidents.filter(i => (i.type === 'road_defect') && i.status !== 'resolved').length,
      status: workOrders.filter(w => w.status === 'in_progress').length > 0 ? 'busy' : 'active',
    },
    pursuit: {
      tasks: pursuitSessions.length,
      queue: incidents.filter(i => (i.type === 'hit_and_run' || i.type === 'rash_driving') && !i.pursuitId).length,
      status: pursuitSessions.filter(p => p.status === 'tracking').length > 0 ? 'busy' : 'active',
    },
    traffic_advisor: {
      tasks: useNavikStore.getState().advisories.length,
      queue: useNavikStore.getState().trafficSegments.filter(s => s.congestionScore > 80).length,
      status: 'active',
    },
    safety_guardian: {
      tasks: incidents.filter(i => i.type === 'school_zone_alert').length,
      queue: useNavikStore.getState().schoolZones.length,
      status: 'active',
    },
  }[agent.id] ?? { tasks: 0, queue: 0, status: 'idle' };

  const statusColors: Record<string, string> = {
    active: 'var(--ok)',
    busy:   'var(--warn)',
    idle:   'var(--text-muted)',
    error:  'var(--danger)',
  };
  const statusColor = statusColors[stats.status] ?? 'var(--text-muted)';
  const Icon = agent.icon;

  return (
    <motion.div
      className={`agent-card agent-${stats.status}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ borderColor: stats.status === 'busy' ? agent.accentColor : undefined }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${agent.accentColor}15`,
          border: `1px solid ${agent.accentColor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={20} strokeWidth={1.8} style={{ color: agent.accentColor } as React.CSSProperties} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h3 style={{ fontSize: '0.9375rem', color: 'var(--text)' }}>{agent.name}</h3>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '1px 8px', borderRadius: 999,
              background: `${statusColor}15`, border: `1px solid ${statusColor}30`,
              fontSize: '0.5625rem', fontWeight: 700, color: statusColor,
              textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)',
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor, boxShadow: `0 0 5px ${statusColor}` }} />
              {stats.status}
            </span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {agent.description}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
        {[
          { label: 'Tasks Today', value: todayLog.length, color: agent.accentColor },
          { label: 'Completed',   value: todayLog.filter(e => e.outcome === 'success').length, color: 'var(--ok)' },
          { label: 'Queue',       value: stats.queue, color: 'var(--warn)' },
          { label: 'Total',       value: stats.tasks, color: 'var(--text-2)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Capabilities */}
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.75rem', padding: 0, width: '100%', justifyContent: 'space-between' }}
        >
          <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>Capabilities</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}>
              <ul style={{ paddingLeft: 0, marginTop: 10, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                {agent.capabilities.map((cap, i) => (
                  <li key={i} style={{ display: 'flex', gap: 7, fontSize: '0.8125rem', color: 'var(--text-2)' }}>
                    <span style={{ color: agent.accentColor, flexShrink: 0 }}>›</span>
                    {cap}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recent activity */}
      {recentLog.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Recent Activity</div>
          {recentLog.map((entry) => (
            <div key={entry.id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: entry.outcome === 'success' ? 'var(--ok)' : entry.outcome === 'error' ? 'var(--danger)' : 'var(--warn)', marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', lineHeight: 1.4 }}>{entry.action}</div>
                {entry.reasoning && (
                  <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2, lineHeight: 1.4 }}>
                    {entry.reasoning.slice(0, 80)}{entry.reasoning.length > 80 ? '…' : ''}
                  </div>
                )}
                <div style={{ fontSize: '0.5625rem', color: 'var(--surface-3)', marginTop: 2 }}>{formatRelative(entry.timestamp)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Activity timeline ──────────────────────────────────────
function ActivityTimeline() {
  const agentLog = useNavikStore((s) => s.agentActivityLog);
  const recent   = agentLog.slice(0, 20);

  const agentColors: Record<AgentId, string> = {
    civil_engineer:  'var(--warn)',
    pursuit:         'var(--danger)',
    traffic_advisor: 'var(--accent)',
    safety_guardian: 'var(--ok)',
  };
  const agentNames: Record<AgentId, string> = {
    civil_engineer:  'Civil Eng',
    pursuit:         'Pursuit',
    traffic_advisor: 'Traffic',
    safety_guardian: 'Safety',
  };

  return (
    <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={14} color="var(--accent)" />
          <h3 style={{ fontSize: '0.9375rem' }}>Agent Activity Timeline</h3>
        </div>
        <span className="live-dot-accent" />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        {recent.map((entry, i) => {
          const color = agentColors[entry.agentId] ?? 'var(--text-muted)';
          const name  = agentNames[entry.agentId] ?? entry.agentId;
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              style={{ display: 'flex', gap: 12, padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)' }}
            >
              {/* Timeline dot */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}66`, marginTop: 4 }} />
                {i < recent.length - 1 && <div style={{ width: 1, height: '100%', background: 'var(--border)', minHeight: 16 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.5625rem', fontWeight: 700, color, background: `${color}15`, padding: '1px 6px', borderRadius: 999, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {name}
                  </span>
                  <span style={{ fontSize: '0.5625rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {formatRelative(entry.timestamp)}
                  </span>
                  {entry.outcome === 'error' && (
                    <span style={{ fontSize: '0.5rem', color: 'var(--danger)', background: 'var(--danger-subtle)', padding: '1px 5px', borderRadius: 999, border: '1px solid rgba(255,92,92,0.25)' }}>ERROR</span>
                  )}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-2)', lineHeight: 1.4, marginBottom: 2 }}>{entry.action}</div>
                {entry.reasoning && (
                  <div className="font-mono" style={{ fontSize: '0.625rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {entry.reasoning}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main AgentsView ────────────────────────────────────────
export function AgentsView() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Bot size={18} color="var(--accent)" />
        <div>
          <h2 style={{ fontSize: '0.9375rem' }}>Agent Hub</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>
            4 AI agents · explainable reasoning · real-time decision support
          </p>
        </div>
      </div>

      {/* Split: agents grid + timeline */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', gap: 0 }}>
        {/* Agents grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
            {AGENTS.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div style={{ width: 340, flexShrink: 0, borderLeft: '1px solid var(--border)', overflow: 'hidden' }}>
          <ActivityTimeline />
        </div>
      </div>
    </div>
  );
}
