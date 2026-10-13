import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, HardHat, Shield, Activity, Zap, X, ChevronRight,
  Play, FileSearch,
} from 'lucide-react';
import { useNavikStore } from '../../store/navikStore';
import { formatRelative, incidentTypeLabel } from '../../components/ui/helpers';
import type { AgentId } from '../../types';

const AGENT_HEX: Record<AgentId, string> = {
  civil_engineer:  '#A16207',
  pursuit:         '#B42318',
  traffic_advisor: '#0F766E',
  safety_guardian: '#15803D',
};

const STATUS_HEX: Record<string, string> = {
  active: '#15803D', busy: '#A16207', idle: '#64748B', error: '#B42318',
};

// ── Civil Engineer action panel ────────────────────────────
function CivilAgentPanel({ onClose }: { onClose: () => void }) {
  const defects         = useNavikStore((s) => s.defects);
  const workOrders      = useNavikStore((s) => s.workOrders);
  const generateWorkOrder = useNavikStore((s) => s.generateWorkOrder);
  const selectWorkOrder   = useNavikStore((s) => s.selectWorkOrder);
  const setView           = useNavikStore((s) => s.setView);

  const pending = defects.filter(
    (d) => (d.category === 'pothole' || d.category === 'waterlogging' || d.category === 'damaged_road')
      && d.status !== 'resolved'
      && !d.workOrderId
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Civil Engineer Agent</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>Generate and manage work orders</div>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={14} /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {/* Quick action */}
        <div style={{ marginBottom: 16, padding: '12px', background: '#A1620712', border: '1px solid #A1620728', borderRadius: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
            {pending.length} defects need work orders
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
            Potholes, waterlogging and damaged roads without an assigned work order.
          </div>
          <button
            className="btn btn-sm"
            style={{ background: '#A16207', color: '#fff', border: 'none', fontWeight: 600 }}
            disabled={pending.length === 0}
            onClick={() => {
              const wo = generateWorkOrder(pending[0].id);
              if (wo) { selectWorkOrder(wo.id); setView('civil_works'); }
            }}
          >
            <Play size={12} /> Generate Next Work Order
          </button>
        </div>

        {/* Open work orders */}
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8 }}>
          Open work orders ({workOrders.filter(w => !['ai_verified','rejected'].includes(w.status)).length})
        </div>
        {workOrders.slice(0, 6).map((wo) => (
          <div key={wo.id} style={{ padding: '9px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{wo.locationLabel}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                {wo.id} · Priority {wo.priorityScore}/100
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#A16207', background: '#A1620712', padding: '2px 8px', borderRadius: 99, border: '1px solid #A1620728' }}>
              {wo.status.replace(/_/g, ' ')}
            </span>
          </div>
        ))}
        {workOrders.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '24px 0' }}>
            No work orders yet. Click "Generate" above to create one.
          </div>
        )}
        <button
          className="btn btn-secondary btn-sm btn-full"
          style={{ marginTop: 8 }}
          onClick={() => { setView('civil_works'); onClose(); }}
        >
          Open Civil Works →
        </button>
      </div>
    </div>
  );
}

// ── Pursuit Agent action panel ─────────────────────────────
function PursuitAgentPanel({ onClose }: { onClose: () => void }) {
  const incidents        = useNavikStore((s) => s.incidents);
  const pursuitSessions  = useNavikStore((s) => s.pursuitSessions);
  const startPursuit     = useNavikStore((s) => s.startPursuit);
  const selectPursuit    = useNavikStore((s) => s.selectPursuit);

  const trackable = incidents.filter(
    (i) => (i.type === 'hit_and_run' || i.type === 'rash_driving')
      && i.plateNumber
      && !i.pursuitId
      && i.status !== 'resolved'
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Pursuit Agent</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>Track vehicles across fleet</div>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={14} /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {/* Active pursuits */}
        {pursuitSessions.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8 }}>
              Active pursuits ({pursuitSessions.filter(p => p.status === 'tracking').length})
            </div>
            {pursuitSessions.slice(0, 4).map((pst) => (
              <div
                key={pst.id}
                onClick={() => selectPursuit(pst.id)}
                style={{
                  padding: '9px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)',
                  borderRadius: 8, marginBottom: 6, cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: '#B42318' }}>
                    {pst.plateNumber}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {pst.sightings.length} sightings · {pst.fusedConfidence}% confidence
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#B42318', background: '#B4231812', padding: '2px 8px', borderRadius: 99, border: '1px solid #B4231828' }}>
                  {pst.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Trackable incidents */}
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8 }}>
          Incidents ready to track ({trackable.length})
        </div>
        {trackable.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>
            No ANPR incidents without an active pursuit.
          </div>
        ) : (
          trackable.slice(0, 5).map((inc) => (
            <div key={inc.id} style={{
              padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 8, marginBottom: 6,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                    {incidentTypeLabel(inc.type)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {inc.locationLabel}
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: '#B42318' }}>
                  {inc.plateNumber}
                </span>
              </div>
              <button
                className="btn btn-sm"
                style={{ background: '#B42318', color: '#fff', border: 'none', fontWeight: 600 }}
                onClick={() => {
                  const session = startPursuit(inc.id);
                  if (session) { selectPursuit(session.id); onClose(); }
                }}
              >
                <FileSearch size={12} /> Start Pursuit
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Traffic Advisor action panel ───────────────────────────
function TrafficAdvisorPanel({ onClose }: { onClose: () => void }) {
  const trafficSegments  = useNavikStore((s) => s.trafficSegments);
  const advisories       = useNavikStore((s) => s.advisories);
  const generateAdvisory = useNavikStore((s) => s.generateAdvisory);
  const setView          = useNavikStore((s) => s.setView);

  const topSegs = [...trafficSegments].sort((a, b) => b.congestionScore - a.congestionScore).slice(0, 5);

  function scoreColor(s: number) {
    return s >= 80 ? '#B42318' : s >= 65 ? '#C2410C' : '#A16207';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Traffic Advisor</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>Generate advisories for bottlenecks</div>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={14} /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8 }}>
          Top congestion segments
        </div>
        {topSegs.map((seg) => {
          const hasAdvisory = advisories.find((a) => a.segmentId === seg.id && a.status !== 'undone');
          const hex = scoreColor(seg.congestionScore);
          return (
            <div key={seg.id} style={{
              padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 8, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>{seg.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 60, height: 4, background: 'var(--surface-3)', borderRadius: 99 }}>
                    <div style={{ height: '100%', width: `${seg.congestionScore}%`, background: hex, borderRadius: 99 }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: hex }}>
                    {seg.congestionScore}
                  </span>
                </div>
              </div>
              {hasAdvisory ? (
                <span style={{ fontSize: 11, color: '#0F766E', background: '#0F766E12', padding: '2px 8px', borderRadius: 99, border: '1px solid #0F766E28', whiteSpace: 'nowrap' }}>
                  Advisory active
                </span>
              ) : (
                <button
                  className="btn btn-xs"
                  style={{ background: hex, color: '#fff', border: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                  onClick={() => {
                    generateAdvisory(seg.id);
                    setView('analytics');
                    onClose();
                  }}
                >
                  <Play size={10} /> Advise
                </button>
              )}
            </div>
          );
        })}

        {advisories.length > 0 && (
          <button
            className="btn btn-secondary btn-sm btn-full"
            style={{ marginTop: 8 }}
            onClick={() => { setView('analytics'); onClose(); }}
          >
            View all advisories in Analytics →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Safety Guardian action panel ───────────────────────────
function SafetyGuardianPanel({ onClose }: { onClose: () => void }) {
  const schoolZones = useNavikStore((s) => s.schoolZones);
  const incidents   = useNavikStore((s) => s.incidents);

  const now = new Date();
  const hhmm = now.getHours() * 60 + now.getMinutes();

  const activeZones = schoolZones.filter((sz) =>
    sz.alertTimes.some((t) => {
      const [sh, sm] = t.start.split(':').map(Number);
      const [eh, em] = t.end.split(':').map(Number);
      return hhmm >= sh * 60 + sm && hhmm <= eh * 60 + em;
    })
  );

  const zoneIncidents = incidents.filter((i) => i.type === 'school_zone_alert' && i.status !== 'resolved');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Safety Guardian</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>School zone monitoring</div>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={14} /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {/* Status */}
        <div style={{
          padding: '10px 12px', borderRadius: 8, marginBottom: 14,
          background: activeZones.length > 0 ? '#A1620712' : '#15803D12',
          border: `1px solid ${activeZones.length > 0 ? '#A1620728' : '#15803D28'}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: activeZones.length > 0 ? '#A16207' : '#15803D', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
            {activeZones.length > 0
              ? `${activeZones.length} zone${activeZones.length > 1 ? 's' : ''} in active alert window`
              : 'No active alert windows right now'}
          </span>
        </div>

        {/* Active zone incidents */}
        {zoneIncidents.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8 }}>
              Active school zone alerts ({zoneIncidents.length})
            </div>
            {zoneIncidents.slice(0, 4).map((inc) => (
              <div key={inc.id} style={{
                padding: '9px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderLeft: '3px solid #A16207', borderRadius: 8, marginBottom: 6,
              }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{inc.locationLabel}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {inc.description.slice(0, 60)}…
                </div>
              </div>
            ))}
          </>
        )}

        {/* All zones */}
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 8, marginTop: 8 }}>
          Monitored school zones
        </div>
        {schoolZones.map((sz) => {
          const isActive = activeZones.some((a) => a.id === sz.id);
          return (
            <div key={sz.id} style={{
              padding: '9px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 8, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{sz.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {sz.alertTimes.map((t) => `${t.start}–${t.end}`).join(', ')} · r={sz.radius}m
                </div>
              </div>
              {isActive && (
                <span style={{ fontSize: 10, fontWeight: 700, color: '#A16207', background: '#A1620712', padding: '2px 6px', borderRadius: 99, border: '1px solid #A1620728', whiteSpace: 'nowrap' }}>
                  ACTIVE
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Agent panel router ─────────────────────────────────────
function AgentActionPanel({ agentId, onClose }: { agentId: AgentId; onClose: () => void }) {
  switch (agentId) {
    case 'civil_engineer':  return <CivilAgentPanel  onClose={onClose} />;
    case 'pursuit':         return <PursuitAgentPanel onClose={onClose} />;
    case 'traffic_advisor': return <TrafficAdvisorPanel onClose={onClose} />;
    case 'safety_guardian': return <SafetyGuardianPanel onClose={onClose} />;
  }
}

// ── Agent card ─────────────────────────────────────────────
const AGENTS: Array<{
  id: AgentId;
  name: string;
  purpose: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}> = [
  { id: 'civil_engineer',  name: 'Civil Engineer',  icon: HardHat,   purpose: 'Detects defects · Generates work orders · Verifies repairs' },
  { id: 'pursuit',         name: 'Pursuit Agent',   icon: Shield,    purpose: 'Tracks plates across fleet · Fuses confidence · Evidence packets' },
  { id: 'traffic_advisor', name: 'Traffic Advisor', icon: Activity,  purpose: 'Ranks bottlenecks · Proposes interventions · Simulate before/after' },
  { id: 'safety_guardian', name: 'Safety Guardian', icon: Zap,       purpose: 'Monitors school zones · Alerts on speeding · Escalates hazards' },
];

function AgentCard({ agent, onRun, onActivity }: {
  agent: typeof AGENTS[0];
  onRun: () => void;
  onActivity: () => void;
}) {
  const agentLog        = useNavikStore((s) => s.agentActivityLog);
  const incidents       = useNavikStore((s) => s.incidents);
  const workOrders      = useNavikStore((s) => s.workOrders);
  const pursuitSessions = useNavikStore((s) => s.pursuitSessions);

  const todayLog    = agentLog.filter((e) => e.agentId === agent.id && new Date(e.timestamp).toDateString() === new Date().toDateString());
  const latestEntry = agentLog.filter((e) => e.agentId === agent.id)[0];
  const hex         = AGENT_HEX[agent.id];

  const stats = (() => {
    switch (agent.id) {
      case 'civil_engineer':  return { today: todayLog.length, done: todayLog.filter(e => e.outcome === 'success').length, queue: incidents.filter(i => i.type === 'road_defect' && i.status !== 'resolved').length, status: workOrders.filter(w => w.status === 'in_progress').length > 0 ? 'busy' : 'active' };
      case 'pursuit':         return { today: todayLog.length, done: todayLog.filter(e => e.outcome === 'success').length, queue: incidents.filter(i => (i.type === 'hit_and_run' || i.type === 'rash_driving') && !i.pursuitId).length, status: pursuitSessions.filter(p => p.status === 'tracking').length > 0 ? 'busy' : 'active' };
      case 'traffic_advisor': return { today: todayLog.length, done: todayLog.filter(e => e.outcome === 'success').length, queue: useNavikStore.getState().trafficSegments.filter(s => s.congestionScore > 80).length, status: 'active' as const };
      case 'safety_guardian': return { today: todayLog.length, done: todayLog.filter(e => e.outcome === 'success').length, queue: incidents.filter(i => i.type === 'school_zone_alert' && i.status !== 'resolved').length, status: 'active' as const };
    }
  })()!;

  const statusHex = STATUS_HEX[stats.status] ?? '#64748B';
  const Icon = agent.icon;

  return (
    <div className={`agent-card agent-${stats.status}`} style={{ borderTop: `3px solid ${hex}` }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ width: 36, height: 36, borderRadius: 8, background: `${hex}14`, border: `1px solid ${hex}28`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: hex }}>
          <Icon size={17} strokeWidth={1.9} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <h4 style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 600 }}>{agent.name}</h4>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 7px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: `${statusHex}14`, color: statusHex, border: `1px solid ${statusHex}25` }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusHex }} />
              {stats.status}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>{agent.purpose}</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', borderTop: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface-2)' }}>
        {[
          { label: 'Today',  value: stats.today },
          { label: 'Done',   value: stats.done  },
          { label: 'Queued', value: stats.queue  },
        ].map(({ label, value }, i) => (
          <div key={label} style={{ flex: 1, padding: '8px 0', textAlign: 'center', borderRight: i < 2 ? '1px solid var(--border)' : undefined }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--ink)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Latest action */}
      {latestEntry && (
        <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <span style={{ color: 'var(--muted)', marginRight: 4 }}>{formatRelative(latestEntry.timestamp)}</span>
          {latestEntry.action.slice(0, 72)}{latestEntry.action.length > 72 ? '…' : ''}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        <button
          onClick={onRun}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px 0', borderRadius: 7, border: `1px solid ${hex}`, background: `${hex}12`, color: hex, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          <Play size={12} /> Run Agent
        </button>
        <button onClick={onActivity} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 12, color: 'var(--ink-2)' }}>
          Log <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Activity log drawer ────────────────────────────────────
function ActivityLogDrawer({ agentId, onClose }: { agentId: AgentId; onClose: () => void }) {
  const agentLog = useNavikStore((s) => s.agentActivityLog);
  const entries  = agentLog.filter((e) => e.agentId === agentId);
  const agent    = AGENTS.find((a) => a.id === agentId)!;

  return (
    <motion.div
      key="log-drawer"
      initial={{ x: 16, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 16, opacity: 0 }}
      transition={{ duration: 0.14 }}
      style={{ width: 340, flexShrink: 0, background: 'var(--surface)', borderLeft: '1px solid var(--border)', boxShadow: 'var(--shadow-drawer)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{agent.name} — Log</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{entries.length} entries</div>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={14} /></button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {entries.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>No activity yet. Click "Run Agent" to trigger it.</div>
        ) : (
          entries.map((entry, i) => (
            <div key={entry.id} style={{ display: 'flex', gap: 12, padding: '9px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 3, background: entry.outcome === 'success' ? '#15803D' : entry.outcome === 'error' ? '#B42318' : '#A16207' }} />
                {i < entries.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--border)', minHeight: 12 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.4 }}>{entry.action}</div>
                {entry.reasoning && (
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--muted)', marginTop: 3, lineHeight: 1.5 }}>
                    {entry.reasoning}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{formatRelative(entry.timestamp)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

// ── Main AgentsView ────────────────────────────────────────
export function AgentsView() {
  const [activePanel, setActivePanel]   = useState<AgentId | null>(null);
  const [activeLog,   setActiveLog]     = useState<AgentId | null>(null);

  function handleRun(id: AgentId) {
    setActiveLog(null);
    setActivePanel(activePanel === id ? null : id);
  }
  function handleLog(id: AgentId) {
    setActivePanel(null);
    setActiveLog(activeLog === id ? null : id);
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--canvas)' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Bot size={15} color="#0F766E" />
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Agent Hub</h2>
        <span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 4 }}>
          Click "Run Agent" to trigger each agent's real actions
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Cards */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
            {AGENTS.map((agent) => (
              <motion.div key={agent.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <AgentCard agent={agent} onRun={() => handleRun(agent.id)} onActivity={() => handleLog(agent.id)} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right panel: action or log */}
        <AnimatePresence mode="wait">
          {activePanel && (
            <motion.div
              key={`panel-${activePanel}`}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              transition={{ duration: 0.14 }}
              style={{ width: 360, flexShrink: 0, background: 'var(--surface)', borderLeft: '1px solid var(--border)', boxShadow: 'var(--shadow-drawer)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
              <AgentActionPanel agentId={activePanel} onClose={() => setActivePanel(null)} />
            </motion.div>
          )}
          {activeLog && !activePanel && (
            <ActivityLogDrawer key={`log-${activeLog}`} agentId={activeLog} onClose={() => setActiveLog(null)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
