import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Clock, Cpu, CheckCircle, Shield, FileDown, ChevronRight, Car, BarChart2, Wrench, Video, Search, Copy } from 'lucide-react';
import { useNavikStore } from '../../store/navikStore';
import { severityColor, severityLabel, incidentTypeLabel, incidentTypeColor, defectCategoryLabel, busStatusColor, busStatusLabel, formatDateTime, formatTime, confidenceColor, incidentStatusLabel, defectStatusLabel } from '../ui/helpers';
import type { Incident, RoadDefect, Bus, IncidentStatus, DefectStatus } from '../../types';

function SectionLabel({ icon: Icon, label }: { icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
      <Icon size={12} strokeWidth={2.2} />
      {/* sentence-case, 13px min, meets contrast */}
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>{label}</span>
    </div>
  );
}

function InfoCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9, padding: '9px 11px' }}>
      {/* sentence-case label, 13px */}
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

function AIPipeline({ steps }: { steps: NonNullable<Incident['aiPipeline']> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {steps.map((step, i) => (
        <div key={i} className="pipeline-step">
          <div className="pipeline-dot"><CheckCircle size={10} strokeWidth={2.5} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.4 }}>{step.label}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{formatTime(step.timestamp)}</span>
              <span style={{ fontSize: 11, color: 'var(--ok)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>+{step.duration}ms</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlateBadge({ plate, confidence }: { plate: string; confidence: number }) {
  const color = confidenceColor(confidence);
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>Detected Plate</div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.1em' }}>{plate}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>Confidence</div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{confidence}%</span>
        </div>
      </div>
      <div style={{ height: 3, background: 'var(--surface-3)', borderRadius: 999, overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${confidence}%` }} transition={{ duration: 0.7, ease: [0.4,0,0.2,1] }}
          style={{ height: '100%', background: color, borderRadius: 999 }} />
      </div>
    </div>
  );
}

// ── Incident actions — one primary + More menu ────────────
function IncidentActions({ incident, isANPR, advance }: {
  incident: Incident;
  isANPR: boolean;
  advance: (action: string, label: string, msg: string) => void;
}) {
  const startPursuit   = useNavikStore((s) => s.startPursuit);
  const selectPursuit  = useNavikStore((s) => s.selectPursuit);
  const addToast       = useNavikStore((s) => s.addToast);
  const [moreOpen, setMoreOpen] = useState(false);

  // Determine primary action
  const primaryLabel = incident.status === 'new' ? 'Dispatch Crew'
    : incident.status === 'under_review' ? 'Dispatch Crew'
    : incident.status === 'dispatched' ? 'Mark Resolved'
    : null;

  function handlePrimary() {
    if (incident.status === 'new' || incident.status === 'under_review') {
      advance('Crew dispatched', '🚜 GHMC Crew Dispatched', `Crew en route to ${incident.locationLabel}`);
    } else if (incident.status === 'dispatched') {
      advance('Marked resolved', '✓ Resolved', `${incident.id} closed`);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {/* Primary CTA */}
      {primaryLabel && (
        <button className={`btn btn-sm ${incident.status === 'dispatched' ? 'btn-success' : 'btn-primary'}`} onClick={handlePrimary}>
          {incident.status === 'dispatched' ? <CheckCircle size={12} /> : <Wrench size={12} />}
          {primaryLabel}
        </button>
      )}

      {/* More menu */}
      <div style={{ position: 'relative' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setMoreOpen(!moreOpen)}>
          More ↓
        </button>
        {moreOpen && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 0, marginBottom: 4,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, boxShadow: 'var(--shadow-popover)',
            minWidth: 200, zIndex: 100, overflow: 'hidden',
          }}>
            {incident.status === 'new' && (
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, padding: '8px 14px', fontSize: 13 }}
                onClick={() => { advance('Acknowledged', 'Under Review', `${incident.id} under review`); setMoreOpen(false); }}>
                <CheckCircle size={13} /> Acknowledge
              </button>
            )}
            {isANPR && !incident.pursuitId && (
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, padding: '8px 14px', fontSize: 13 }}
                onClick={() => { const s = startPursuit(incident.id); if (s) selectPursuit(s.id); setMoreOpen(false); }}>
                <Search size={13} /> Track Vehicle
              </button>
            )}
            {isANPR && incident.pursuitId && (
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, padding: '8px 14px', fontSize: 13 }}
                onClick={() => { selectPursuit(incident.pursuitId!); setMoreOpen(false); }}>
                <Shield size={13} /> View Pursuit
              </button>
            )}
            {(incident.type === 'hit_and_run' || incident.type === 'rash_driving') && (
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, padding: '8px 14px', fontSize: 13 }}
                onClick={() => { addToast({ type: 'info', title: 'Transmitting…', message: 'Secure handoff to TS Traffic Police' }); setTimeout(() => addToast({ type: 'success', title: '🔐 Shared with Police', message: 'Evidence transmitted.' }), 900); setMoreOpen(false); }}>
                <Shield size={13} /> Share with Police
              </button>
            )}
            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, padding: '8px 14px', fontSize: 13, borderTop: '1px solid var(--border)' }}
              onClick={() => { addToast({ type: 'success', title: '📄 PDF exported', message: `${incident.id}_evidence.pdf` }); setMoreOpen(false); }}>
              <FileDown size={13} /> Export PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Incident detail ────────────────────────────────────────
function IncidentDetail({ incident }: { incident: Incident }) {
  const updateIncidentStatus = useNavikStore((s) => s.updateIncidentStatus);
  const addToast             = useNavikStore((s) => s.addToast);
  const [showPipeline, setShowPipeline] = useState(false);

  const statusOrder: IncidentStatus[] = ['new','under_review','dispatched','resolved'];
  const currentIdx = statusOrder.indexOf(incident.status);

  function advance(action: string, label: string, msg: string) {
    const next = statusOrder[Math.min(currentIdx+1, statusOrder.length-1)];
    updateIncidentStatus(incident.id, next, action);
    addToast({ type:'success', title:label, message:msg });
  }

  const typeColor = incidentTypeColor(incident.type);
  const sevColor  = severityColor(incident.severity);
  const isANPR    = !!(incident.type === 'hit_and_run' || incident.type === 'rash_driving');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          <span className="badge" style={{ background:`${sevColor}15`, color:sevColor, border:`1px solid ${sevColor}28` }}>{severityLabel(incident.severity)}</span>
          <span className="badge badge-muted">{incidentStatusLabel(incident.status)}</span>
          <span className="badge badge-muted" style={{ fontFamily:'var(--font-mono)', fontSize:'0.5625rem' }}>{incident.id}</span>
        </div>
        <h2 style={{ fontFamily:'var(--font-ui)', fontWeight:700, fontSize:'1.125rem', color:typeColor, marginBottom:5, letterSpacing:'-0.02em' }}>
          {incidentTypeLabel(incident.type)}
        </h2>
        <p style={{ fontSize:'0.8125rem', color:'var(--muted)', lineHeight:1.6 }}>{incident.description}</p>
      </div>

      {/* Location + time */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <InfoCell label="Location">
          <div style={{ display:'flex', gap:5, alignItems:'flex-start' }}>
            <MapPin size={11} strokeWidth={2} style={{ color:'var(--accent)', marginTop:2, flexShrink:0 } as React.CSSProperties} />
            <span style={{ fontSize:'0.8125rem', color:'var(--ink)' }}>{incident.locationLabel}</span>
          </div>
          <div style={{ fontSize:'0.5625rem', fontFamily:'var(--font-mono)', color:'var(--muted)', marginTop:4 }}>{incident.position.lat.toFixed(5)}, {incident.position.lng.toFixed(5)}</div>
        </InfoCell>
        <InfoCell label="Detected">
          <div style={{ display:'flex', gap:5, alignItems:'flex-start' }}>
            <Clock size={11} strokeWidth={2} style={{ color:'var(--accent)', marginTop:2, flexShrink:0 } as React.CSSProperties} />
            <span style={{ fontSize:'0.8125rem', color:'var(--ink)' }}>{formatDateTime(incident.timestamp)}</span>
          </div>
          <div style={{ fontSize:'0.5625rem', fontFamily:'var(--font-mono)', color:'var(--muted)', marginTop:4 }}>by {incident.detectedBy}</div>
        </InfoCell>
      </div>

      {/* ANPR */}
      {incident.plateNumber && (
        <div>
          <SectionLabel icon={Shield} label="ANPR Evidence" />
          <PlateBadge plate={incident.plateNumber} confidence={incident.plateConfidence ?? 85} />
        </div>
      )}

      {/* Vehicle density */}
      {incident.vehicleCounts && (
        <div>
          <SectionLabel icon={BarChart2} label="Vehicle Density" />
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {incident.vehicleCounts.map((vc) => (
              <div key={vc.type} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:'0.6875rem', color:'var(--muted)', width:90, textTransform:'capitalize', flexShrink:0 }}>{vc.type.replace('_',' ')}</span>
                <div style={{ flex:1, height:4, background:'var(--surface-3)', borderRadius:999 }}>
                  <motion.div initial={{ width:0 }} animate={{ width:`${Math.min(100,(vc.count/100)*100)}%` }} transition={{ duration:0.6 }}
                    style={{ height:'100%', background:'var(--info)', borderRadius:999 }} />
                </div>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.6875rem', color:'var(--ink-2)', width:26, textAlign:'right', flexShrink:0 }}>{vc.count}</span>
              </div>
            ))}
            {incident.congestionScore != null && (
              <div style={{ display:'flex', justifyContent:'space-between', padding:'7px 10px', background:'var(--surface-2)', borderRadius:7, border:'1px solid var(--border)', marginTop:2 }}>
                <span style={{ fontSize:'0.75rem', color:'var(--muted)' }}>Congestion Score</span>
                <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:'0.9375rem', color:incident.congestionScore>85?'var(--danger)':'var(--warn)' }}>{incident.congestionScore}<span style={{ fontSize:'0.625rem', color:'var(--muted)', fontWeight:400 }}>/100</span></span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI pipeline (collapsible) */}
      {incident.aiPipeline && (
        <div>
          <button onClick={() => setShowPipeline(!showPipeline)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:'var(--accent)', fontSize:'0.75rem', padding:0 }}>
            <Cpu size={12} strokeWidth={2} />
            <span style={{ fontWeight:600 }}>AI Edge Pipeline Trace</span>
            <ChevronRight size={12} style={{ transform:showPipeline?'rotate(90deg)':'none', transition:'transform 0.15s' }} />
          </button>
          <AnimatePresence>
            {showPipeline && (
              <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.18 }}>
                <div style={{ marginTop:10 }}><AIPipeline steps={incident.aiPipeline} /></div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Action log */}
      {incident.actions && incident.actions.length > 0 && (
        <div>
          <SectionLabel icon={CheckCircle} label="Action Log" />
          {incident.actions.map((a,i) => (
            <div key={i} style={{ display:'flex', gap:7, marginBottom:4 }}>
              <span style={{ color:'var(--ok)', flexShrink:0 }}>›</span>
              <span style={{ fontSize:'0.8125rem', color:'var(--ink-2)' }}>{a}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions — one primary + "More" dropdown */}
      {incident.status !== 'resolved' ? (
        <IncidentActions incident={incident} isANPR={isANPR} advance={advance} />
      ) : (
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'10px 12px', background:'var(--sev-low-tint)', borderRadius:9, border:'1px solid var(--sev-low-border)' }}>
          <CheckCircle size={14} strokeWidth={2} style={{ color:'var(--ok)', flexShrink:0 } as React.CSSProperties} />
          <span style={{ fontSize:13, color:'var(--ok)' }}>Incident resolved and closed.</span>
        </div>
      )}
    </div>
  );
}

// ── Defect detail ──────────────────────────────────────────
function DefectDetail({ defect }: { defect: RoadDefect }) {
  const updateDefectStatus  = useNavikStore((s) => s.updateDefectStatus);
  const generateWorkOrder   = useNavikStore((s) => s.generateWorkOrder);
  const selectWorkOrder     = useNavikStore((s) => s.selectWorkOrder);
  const addToast            = useNavikStore((s) => s.addToast);
  const statusOrder: DefectStatus[] = ['pending','under_review','dispatched','resolved'];
  const currentIdx = statusOrder.indexOf(defect.status);
  const sevColor = severityColor(defect.severity);

  function advance(label: string) {
    const next = statusOrder[Math.min(currentIdx+1, statusOrder.length-1)];
    updateDefectStatus(defect.id, next);
    addToast({ type:'success', title:label, message:defect.locationLabel });
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <div>
        <div style={{ display:'flex', gap:6, marginBottom:8, flexWrap:'wrap' }}>
          <span className="badge" style={{ background:`${sevColor}15`, color:sevColor, border:`1px solid ${sevColor}28` }}>{defectStatusLabel(defect.status)}</span>
          <span className="badge badge-muted" style={{ fontFamily:'var(--font-mono)', fontSize:'0.5625rem' }}>{defect.id}</span>
          {defect.recurrenceCount > 2 && <span className="badge badge-danger">⚠ Recurring ×{defect.recurrenceCount}</span>}
          {defect.workOrderId && <span className="badge badge-success">WO: {defect.workOrderId}</span>}
        </div>
        <h2 style={{ fontFamily:'var(--font-ui)', fontWeight:700, fontSize:'1.125rem', color:sevColor, marginBottom:5, letterSpacing:'-0.02em' }}>
          {defectCategoryLabel(defect.category)}
        </h2>
        <p style={{ fontSize:'0.8125rem', color:'var(--muted)', lineHeight:1.6 }}>{defect.description}</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
        {[
          { label:'Severity',   value:severityLabel(defect.severity),  color:sevColor },
          { label:'Confidence', value:`${defect.confidenceScore}%`,     color:confidenceColor(defect.confidenceScore) },
          { label:'Reports',    value:`×${defect.recurrenceCount}`,      color:defect.recurrenceCount>3?'var(--danger)':'var(--ink-2)' },
        ].map(({ label,value,color }) => (
          <div key={label} style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:9, padding:'9px', textAlign:'center' }}>
            <div style={{ fontSize:'0.5rem', fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>{label}</div>
            <div style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:'1rem', color }}>{value}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <InfoCell label="Location"><span style={{ fontSize:'0.8125rem', color:'var(--ink)' }}>{defect.locationLabel}</span></InfoCell>
        <InfoCell label="Detected By"><span style={{ fontFamily:'var(--font-mono)', fontSize:'0.8125rem', color:'var(--ink)' }}>{defect.detectedBy}</span></InfoCell>
      </div>
      {defect.status !== 'resolved' && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
          {defect.status === 'pending' && <button className="btn btn-secondary btn-sm" onClick={() => advance('Defect under review')}>Review</button>}
          {(defect.status === 'pending'||defect.status === 'under_review') && (
            <button className="btn btn-primary btn-sm" onClick={() => advance('🚜 GHMC crew dispatched')}>
              <Wrench size={12} /> Dispatch Crew
            </button>
          )}
          {/* Civil agent */}
          {(defect.category === 'pothole'||defect.category === 'waterlogging'||defect.category === 'damaged_road') && !defect.workOrderId && (
            <button className="btn btn-accent btn-sm" style={{ background:'var(--accent)', color:'var(--accent-text)', border:'none' }} onClick={() => {
              const wo = generateWorkOrder(defect.id);
              if (wo) selectWorkOrder(wo.id);
            }}>
              <Wrench size={12} /> Generate Work Order
            </button>
          )}
          {defect.status === 'dispatched' && <button className="btn btn-success btn-sm" onClick={() => advance('✓ Defect resolved')}><CheckCircle size={12} /> Mark Resolved</button>}
          <button className="btn btn-ghost btn-sm" onClick={() => addToast({ type:'success', title:'📄 Exported', message:`${defect.id}_report.pdf` })}><FileDown size={12} /> Export</button>
        </div>
      )}
    </div>
  );
}

// ── Bus detail ─────────────────────────────────────────────
function BusDetail({ bus }: { bus: Bus }) {
  const openLiveFeed = useNavikStore((s) => s.openLiveFeed);
  const color = busStatusColor(bus.status);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <div>
        <div style={{ display:'flex', gap:6, marginBottom:8 }}>
          <span className="badge" style={{ background:`${color}15`, color, border:`1px solid ${color}28` }}>{busStatusLabel(bus.status)}</span>
          <span className="badge badge-muted" style={{ fontFamily:'var(--font-mono)', fontSize:'0.5625rem' }}>{bus.id}</span>
        </div>
        <h2 style={{ fontFamily:'var(--font-ui)', fontWeight:700, fontSize:'1.25rem', letterSpacing:'-0.02em', marginBottom:2 }}>Route {bus.routeNumber}</h2>
        <p style={{ fontSize:'0.8125rem', color:'var(--muted)' }}>{bus.routeName}</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {[
          { label:'Speed',       value:`${Math.round(bus.speed)} km/h`, color:bus.speed>50?'var(--danger)':'var(--ok)', mono:true },
          { label:'Heading',     value:`${bus.heading}°`,               color:'var(--ink-2)', mono:true },
          { label:'Defects Rep.',value:String(bus.defectsReported),      color:bus.defectsReported>5?'var(--warn)':'var(--ink-2)', mono:true },
          { label:'Driver',      value:bus.driverName,                   color:'var(--ink-2)', mono:false },
        ].map(({ label,value,color:c,mono }) => (
          <InfoCell key={label} label={label}><span style={{ fontSize:'0.9375rem', fontFamily:mono?'var(--font-mono)':'inherit', fontWeight:600, color:c }}>{value}</span></InfoCell>
        ))}
      </div>
      <InfoCell label="License Plate">
        <span style={{ fontFamily:'var(--font-mono)', fontSize:'1.125rem', fontWeight:700, letterSpacing:'0.1em' }}>{bus.licensePlate}</span>
      </InfoCell>
      <div>
        <SectionLabel icon={Car} label="Camera Status" />
        {bus.cameras.map((cam) => {
          const cc = cam.status==='online'?'var(--ok)':cam.status==='degraded'?'var(--warn)':'var(--danger)';
          return (
            <div key={cam.id} style={{ display:'flex', justifyContent:'space-between', padding:'7px 10px', background:'var(--surface-2)', borderRadius:7, border:'1px solid var(--border)', marginBottom:4 }}>
              <span style={{ fontSize:'0.8125rem', color:'var(--ink-2)' }}>{cam.label} Camera</span>
              <span style={{ fontSize:'0.5625rem', fontWeight:700, color:cc, fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'0.07em' }}>{cam.status}</span>
            </div>
          );
        })}
      </div>
      <button className="btn btn-primary btn-sm" style={{ alignSelf:'flex-start' }} onClick={() => openLiveFeed(bus.id)}>
        <Video size={13} /> View Live Feed
      </button>
    </div>
  );
}

// ── Pursuit detail ─────────────────────────────────────────
function PursuitDetail({ pursuitId }: { pursuitId: string }) {
  const pursuitSessions     = useNavikStore((s) => s.pursuitSessions);
  const generateEvidenceHash = useNavikStore((s) => s.generateEvidenceHash);
  const sharePursuitPolice  = useNavikStore((s) => s.sharePursuitPolice);
  const updatePursuitStatus = useNavikStore((s) => s.updatePursuitStatus);
  const addToast            = useNavikStore((s) => s.addToast);
  const [showComplaint, setShowComplaint] = useState(false);

  const session = pursuitSessions.find((p) => p.id === pursuitId);
  if (!session) return <div className="empty-state"><p>Pursuit session not found.</p></div>;

  const statusColors: Record<string, string> = { tracking:'var(--warn)', located:'var(--info)', handed_to_police:'var(--ok)', closed:'var(--muted)' };
  const sc = statusColors[session.status] ?? 'var(--muted)';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <div>
        <div style={{ display:'flex', gap:6, marginBottom:8, flexWrap:'wrap' }}>
          <span className="badge" style={{ background:`${sc}15`, color:sc, border:`1px solid ${sc}28` }}>{session.status.replace(/_/g,' ')}</span>
          <span className="badge badge-muted" style={{ fontFamily:'var(--font-mono)', fontSize:'0.5625rem' }}>{session.id}</span>
        </div>
        <h2 style={{ fontFamily:'var(--font-ui)', fontWeight:700, fontSize:'1.125rem', letterSpacing:'-0.02em', marginBottom:4 }}>
          Pursuit — <span style={{ fontFamily:'var(--font-mono)', color:'var(--danger)' }}>{session.plateNumber}</span>
        </h2>
        <div style={{ display:'flex', gap:16 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'var(--font-ui)', fontWeight:700, fontSize:'1.5rem', color:'var(--danger)' }}>{session.sightings.length}</div>
            <div style={{ fontSize:'0.5rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.09em' }}>Sightings</div>
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'var(--font-ui)', fontWeight:700, fontSize:'1.5rem', color:'var(--warn)' }}>{session.fusedConfidence}%</div>
            <div style={{ fontSize:'0.5rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.09em' }}>Fused Conf.</div>
          </div>
        </div>
      </div>

      {/* Sightings timeline */}
      <div>
        <SectionLabel icon={Shield} label={`Sightings (${session.sightings.length})`} />
        {session.sightings.map((sg, i) => (
          <div key={sg.id} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border-subtle)' }}>
            <span style={{ width:20, height:20, borderRadius:'50%', background:'var(--danger)', color:'#fff', fontSize:'0.5625rem', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontFamily:'var(--font-mono)' }}>{i+1}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--ink)' }}>{sg.locationLabel}</div>
              <div style={{ fontSize:'0.625rem', color:'var(--muted)', fontFamily:'var(--font-mono)', marginTop:2 }}>
                {sg.busId} · {sg.cameraLabel} · {formatTime(sg.timestamp)} · <span style={{ color:confidenceColor(sg.confidence), fontWeight:700 }}>{sg.confidence}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chain of custody */}
      {session.chainOfCustody.length > 0 && (
        <div>
          <SectionLabel icon={CheckCircle} label="Chain of Custody" />
          {session.chainOfCustody.map((e, i) => (
            <div key={i} style={{ display:'flex', gap:7, marginBottom:5 }}>
              <span style={{ color:'var(--ok)', flexShrink:0 }}>›</span>
              <div>
                <div style={{ fontSize:'0.75rem', color:'var(--ink-2)' }}>{e.action}</div>
                <div style={{ fontSize:'0.5625rem', fontFamily:'var(--font-mono)', color:'var(--muted)' }}>{e.actor} · {formatTime(e.timestamp)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Evidence hash */}
      {session.evidenceHash ? (
        <div style={{ background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px' }}>
          <div style={{ fontSize:'0.5625rem', fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:5 }}>SHA-256 Evidence Hash</div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.5625rem', color:'var(--ok)', wordBreak:'break-all', lineHeight:1.6 }}>
            {session.evidenceHash}
          </div>
          {session.shareLink && (
            <div style={{ marginTop:8, fontSize:'0.5625rem', color:'var(--info)' }}>🔗 Secure link created · {session.shareLink.slice(0,50)}…</div>
          )}
        </div>
      ) : null}

      {/* Draft complaint */}
      <div>
        <button onClick={() => setShowComplaint(!showComplaint)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', gap:6, color:'var(--info)', fontSize:'0.75rem', padding:0 }}>
          <ChevronRight size={12} style={{ transform:showComplaint?'rotate(90deg)':'none', transition:'transform 0.15s' }} />
          View Draft e-Complaint
        </button>
        <AnimatePresence>
          {showComplaint && (
            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.18 }}>
              <div style={{ marginTop:8, background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', maxHeight:200, overflowY:'auto' }}>
                <pre style={{ fontFamily:'var(--font-mono)', fontSize:'0.5625rem', color:'var(--ink-2)', whiteSpace:'pre-wrap', lineHeight:1.6 }}>{session.draftComplaintText}</pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
        {!session.evidenceHash && (
          <button className="btn btn-primary btn-sm" onClick={() => generateEvidenceHash(pursuitId)}>
            <Shield size={12} /> Seal Evidence
          </button>
        )}
        {session.evidenceHash && session.status !== 'handed_to_police' && (
          <button className="btn btn-danger btn-sm" onClick={() => sharePursuitPolice(pursuitId)}>
            <Shield size={12} /> Share with TS Traffic Police
          </button>
        )}
        {session.status === 'tracking' && (
          <button className="btn btn-secondary btn-sm" onClick={() => updatePursuitStatus(pursuitId, 'located')}>
            <CheckCircle size={12} /> Mark Located
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => {
          navigator.clipboard?.writeText(session.draftComplaintText).catch(()=>{});
          addToast({ type:'success', title:'Draft copied to clipboard', message:'Ready to paste into police portal.' });
        }}>
          <Copy size={12} /> Copy Complaint
        </button>
      </div>
    </div>
  );
}

// ── Main drawer ────────────────────────────────────────────
export function DetailDrawer() {
  const drawerMode         = useNavikStore((s) => s.drawerMode);
  const selectedIncidentId = useNavikStore((s) => s.selectedIncidentId);
  const selectedDefectId   = useNavikStore((s) => s.selectedDefectId);
  const selectedBusId      = useNavikStore((s) => s.selectedBusId);
  const selectedPursuitId  = useNavikStore((s) => s.selectedPursuitId);
  const closeDrawer        = useNavikStore((s) => s.closeDrawer);
  const incidents          = useNavikStore((s) => s.incidents);
  const defects            = useNavikStore((s) => s.defects);
  const buses              = useNavikStore((s) => s.buses);

  const incident = incidents.find((i) => i.id === selectedIncidentId);
  const defect   = defects.find((d) => d.id === selectedDefectId);
  const bus      = buses.find((b) => b.id === selectedBusId);

  const titles: Record<string, string> = { incident:'Incident Detail', defect:'Defect Detail', bus:'Vehicle Detail', work_order:'Work Order', pursuit:'Pursuit Session' };
  const title = drawerMode ? titles[drawerMode] ?? '' : '';

  if (!drawerMode) return null;

  return (
    <motion.div initial={{ x:24, opacity:0 }} animate={{ x:0, opacity:1 }} exit={{ x:24, opacity:0 }}
      transition={{ type:'spring', stiffness:380, damping:36 }}
      style={{ height:'100%', display:'flex', flexDirection:'column' }}
      role="dialog" aria-modal="true" aria-label={title}>
      {/* Header */}
      <div style={{ height:52, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', borderBottom:'1px solid var(--border)', background:'var(--canvas)' }}>
        <span style={{ fontSize:'0.8125rem', fontWeight:700, fontFamily:'var(--font-ui)', color:'var(--ink-2)' }}>{title}</span>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={closeDrawer} aria-label="Close"><X size={15} /></button>
      </div>
      {/* Content */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
        {drawerMode === 'incident'  && incident && <IncidentDetail incident={incident} />}
        {drawerMode === 'defect'    && defect   && <DefectDetail defect={defect} />}
        {drawerMode === 'bus'       && bus       && <BusDetail bus={bus} />}
        {drawerMode === 'pursuit'   && selectedPursuitId && <PursuitDetail pursuitId={selectedPursuitId} />}
      </div>
    </motion.div>
  );
}
