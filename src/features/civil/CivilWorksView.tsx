import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HardHat, Plus, CheckCircle, Truck, Wrench, Star, X, ChevronRight, AlertTriangle, FileDown, RotateCcw } from 'lucide-react';
import { useNavikStore } from '../../store/navikStore';
import { severityColor, severityLabel, defectCategoryLabel, formatDateTime } from '../../components/ui/helpers';
import type { WorkOrder, WorkOrderStatus } from '../../types';

const COLUMNS: { status: WorkOrderStatus; label: string; color: string }[] = [
  { status: 'drafted',       label: 'Drafted',        color: 'var(--text-2)' },
  { status: 'approved',      label: 'Approved',       color: 'var(--info)'     },
  { status: 'crew_dispatched',label:'Crew Dispatched', color: 'var(--warn)'  },
  { status: 'in_progress',   label: 'In Progress',    color: 'var(--accent)'   },
  { status: 'completed',     label: 'Completed',      color: 'var(--ok)'  },
  { status: 'ai_verified',   label: 'AI Verified ✓',  color: 'var(--ok)'  },
];

const CONTRACTORS = [
  'M/s Srinivasa Infra','M/s Balaji Roads','M/s Hyderabad Civil Works',
  'M/s Deccan Contractors','M/s Sri Rama Projects','M/s Kiran Infrastructure',
];

function WorkOrderCard({ wo, onClick }: { wo: WorkOrder; onClick: () => void }) {
  const sevColor = severityColor(wo.severity);
  return (
    <div className="kanban-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--text-muted)' }}>{wo.id}</span>
        <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: sevColor, background: `${sevColor}15`, border: `1px solid ${sevColor}28`, padding: '1px 6px', borderRadius: 999, fontFamily: 'var(--font-mono)' }}>
          {severityLabel(wo.severity)}
        </span>
      </div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
        {defectCategoryLabel(wo.defectCategory)}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>{wo.locationLabel}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 28, height: 4, background: 'var(--surface-2)', borderRadius: 999 }}>
            <div style={{ height: '100%', width: `${wo.priorityScore}%`, background: wo.priorityScore >= 80 ? 'var(--danger)' : wo.priorityScore >= 60 ? 'var(--warn)' : 'var(--ok)', borderRadius: 999 }} />
          </div>
          <span style={{ fontSize: '0.5625rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{wo.priorityScore}</span>
        </div>
        <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>₹{(wo.boq.estimatedCostINR/1000).toFixed(0)}K</span>
      </div>
      {wo.nearSchoolZone && (
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: '0.5rem', background: 'var(--warn-subtle)', color: 'var(--warn)', border: '1px solid rgba(245,184,61,0.25)', padding: '1px 5px', borderRadius: 999, fontWeight: 700 }}>🏫 SCHOOL ZONE</span>
        </div>
      )}
    </div>
  );
}

function WorkOrderDetailPanel({ woId, onClose }: { woId: string; onClose: () => void }) {
  const workOrders          = useNavikStore((s) => s.workOrders);
  const updateWorkOrderStatus = useNavikStore((s) => s.updateWorkOrderStatus);
  const assignContractor    = useNavikStore((s) => s.assignContractor);
  const triggerVerification = useNavikStore((s) => s.triggerVerification);
  const addToast            = useNavikStore((s) => s.addToast);
  const [selectedContractor, setSelectedContractor] = useState('');
  const [showReasoning, setShowReasoning] = useState(false);

  const wo = workOrders.find((w) => w.id === woId);
  if (!wo) return null;

  const statusOrder: WorkOrderStatus[] = ['drafted','approved','crew_dispatched','in_progress','completed','ai_verified'];
  const currentIdx = statusOrder.indexOf(wo.status);
  const canAdvance = wo.status !== 'ai_verified' && wo.status !== 'rejected' && wo.status !== 'reopened';

  function advance() {
    const actions: Record<WorkOrderStatus, string> = {
      drafted:        'Approved by supervisor',
      approved:       'Contractor assigned & crew dispatched',
      crew_dispatched:'Work commenced on site',
      in_progress:    'Work completed — awaiting verification',
      completed:      '',
      ai_verified:    '',
      rejected:       '',
      reopened:       '',
    };
    const next = statusOrder[currentIdx + 1];
    if (next) {
      updateWorkOrderStatus(wo.id, next, actions[wo.status]);
      addToast({ type: 'success', title: `Status → ${next.replace('_',' ')}`, message: wo.id });
    }
  }

  const repairColors: Record<string, string> = {
    cold_mix_patch: 'var(--warn)',
    hot_mix_patch:  'var(--accent)',
    full_depth_reclamation: 'var(--danger)',
    micro_surfacing:'var(--info)',
    fix_drainage_first:'var(--info)',
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent)' }}>{wo.id}</span>
          <h3 style={{ marginTop: 2 }}>{defectCategoryLabel(wo.defectCategory)}</h3>
        </div>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={15} /></button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Status pipeline */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
          {statusOrder.slice(0, 6).map((s, i) => {
            const done = statusOrder.indexOf(wo.status as WorkOrderStatus) >= i;
            const col = COLUMNS.find((c) => c.status === s);
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: done ? col?.color ?? 'var(--text-muted)' : 'var(--surface-2)',
                  boxShadow: done && wo.status === s ? `0 0 6px ${col?.color}` : 'none',
                  transition: 'all 0.2s',
                }} />
                {i < 5 && <div style={{ width: 16, height: 1, background: done ? 'var(--text-muted)' : 'var(--surface-2)' }} />}
              </div>
            );
          })}
          <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginLeft: 6 }}>
            {wo.status.replace(/_/g,' ')}
          </span>
        </div>

        {/* Key info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { label:'Location',     value: wo.locationLabel },
            { label:'GHMC Circle',  value: `${wo.ghmcCircle} · ${wo.ghmcWard}` },
            { label:'Priority',     value: `${wo.priorityScore}/100`, mono: true },
            { label:'SLA',          value: `${wo.slaHours}h`, mono: true },
            { label:'Area',         value: `${wo.areaSqM} m²`, mono: true },
            { label:'Depth',        value: wo.depthClass, mono: true },
            { label:'Road Class',   value: wo.roadClass.replace('_',' '), mono: false },
            { label:'Rainfall',     value: `${wo.rainfallForecastMM}mm forecast`, mono: true },
          ].map(({ label, value, mono }) => (
            <div key={label} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '9px 11px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: '0.8125rem', fontFamily: mono ? 'var(--font-mono)' : 'inherit', color: 'var(--text)', fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Repair method */}
        <div style={{ padding: '10px 12px', borderRadius: 8, background: `${repairColors[wo.repairMethod] ?? 'var(--accent)'}10`, border: `1px solid ${repairColors[wo.repairMethod] ?? 'var(--accent)'}25`, marginBottom: 16 }}>
          <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4 }}>Recommended Repair Method</div>
          <div style={{ fontSize: '0.8125rem', color: repairColors[wo.repairMethod] ?? 'var(--accent)', fontWeight: 600 }}>{wo.repairMethodLabel}</div>
          <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: 3 }}>Indicative guidance — aligned with IRC:82 maintenance practice</div>
        </div>

        {/* BOQ */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Bill of Quantities</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              ['Bituminous Mix', `${wo.boq.bituminousMixKg} kg`],
              ['Tack Coat',      `${wo.boq.tackCoatLitres} L`],
              ['Aggregate',      `${wo.boq.aggregateCuM} m³`],
              ['Crew Size',      `${wo.boq.crewSize} persons`],
              ['Est. Duration',  `${wo.boq.estimatedHours}h`],
              ['Equipment',      wo.boq.equipment.slice(0,3).join(', ')],
              ['TMP',            wo.boq.trafficManagementPlan.slice(0,50)+'…'],
            ].map(([k,v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem' }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '8px 0 4px', borderTop: '2px solid var(--border)' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>Estimated Cost</span>
              <span style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                ₹{wo.boq.estimatedCostINR.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Contractor assignment */}
        {(wo.status === 'drafted' || wo.status === 'approved') && (
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">Assign Contractor</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select className="form-select" style={{ flex: 1 }} value={selectedContractor || wo.contractorName || ''}
                onChange={(e) => setSelectedContractor(e.target.value)}>
                <option value="">Select contractor…</option>
                {CONTRACTORS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                if (selectedContractor) {
                  assignContractor(wo.id, selectedContractor);
                  setSelectedContractor('');
                }
              }} disabled={!selectedContractor}>
                Assign
              </button>
            </div>
            {wo.contractorName && (
              <div style={{ fontSize: '0.75rem', color: 'var(--ok)', marginTop: 5 }}>
                ✓ {wo.contractorName}
              </div>
            )}
          </div>
        )}

        {/* Reasoning trace */}
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => setShowReasoning(!showReasoning)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 600, padding: 0 }}>
            <ChevronRight size={13} style={{ transform: showReasoning ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
            View Agent Reasoning Trace
          </button>
          <AnimatePresence>
            {showReasoning && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="reasoning-trace" style={{ marginTop: 8 }}>
                  {wo.reasoningTrace.map((step, i) => (
                    <div key={i} className="trace-step">{step}</div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action log */}
        {wo.actions.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Action Log</div>
            {wo.actions.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 7, fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                <span style={{ color: 'var(--ok)', flexShrink: 0 }}>›</span>
                <span>{a}</span>
              </div>
            ))}
          </div>
        )}

        {/* Verification result */}
        {wo.verificationResult && (
          <div style={{
            padding: '10px 12px', borderRadius: 8, marginBottom: 16,
            background: wo.verificationResult === 'pass' ? 'var(--ok-subtle)' : 'var(--danger-subtle)',
            border: `1px solid ${wo.verificationResult === 'pass' ? 'rgba(46,196,160,0.25)' : 'rgba(255,92,92,0.25)'}`,
          }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: wo.verificationResult === 'pass' ? 'var(--ok)' : 'var(--danger)' }}>
              {wo.verificationResult === 'pass' ? '✓ Repair AI-Verified Clean' : '✗ Repair Failed Verification'}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 8, flexShrink: 0 }}>
        {canAdvance && wo.status !== 'reopened' && (
          <button className="btn btn-primary btn-sm" onClick={advance}>
            <CheckCircle size={13} />
            {wo.status === 'drafted' ? 'Approve' : wo.status === 'approved' ? 'Dispatch Crew' : wo.status === 'crew_dispatched' ? 'Mark In Progress' : wo.status === 'in_progress' ? 'Mark Completed' : ''}
          </button>
        )}
        {wo.status === 'completed' && (
          <button className="btn btn-accent btn-sm" style={{ background: 'var(--accent)', color: '#05080e', border: 'none' }} onClick={() => triggerVerification(wo.id)}>
            <Star size={13} /> AI Verify
          </button>
        )}
        {wo.status === 'drafted' && (
          <button className="btn btn-danger btn-sm" onClick={() => { updateWorkOrderStatus(wo.id, 'rejected', 'Rejected'); }}>
            Reject
          </button>
        )}
        {wo.status === 'reopened' && (
          <button className="btn btn-warning btn-sm" onClick={advance}>
            <RotateCcw size={13} /> Re-Dispatch
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => addToast({ type:'success', title:'📄 Work Order PDF', message:`${wo.id} exported.` })}>
          <FileDown size={13} /> Export PDF
        </button>
      </div>
    </div>
  );
}

export function CivilWorksView() {
  const workOrders     = useNavikStore((s) => s.workOrders);
  const defects        = useNavikStore((s) => s.defects);
  const generateWorkOrder = useNavikStore((s) => s.generateWorkOrder);
  const woFilter       = useNavikStore((s) => s.woFilter);
  const setWoFilter    = useNavikStore((s) => s.setWoFilter);
  const [selectedWoId, setSelectedWoId] = useState<string | null>(null);

  const pendingDefects = defects.filter((d) =>
    (d.category === 'pothole' || d.category === 'waterlogging' || d.category === 'damaged_road') &&
    d.status !== 'resolved' && !d.workOrderId
  );

  const filtered = workOrders.filter((w) => {
    if (woFilter.status && w.status !== woFilter.status) return false;
    if (woFilter.circle && w.ghmcCircle !== woFilter.circle) return false;
    return true;
  });

  const totalCost = filtered.reduce((s, w) => s + w.boq.estimatedCostINR, 0);

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Main kanban area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ flexShrink: 0, padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: 'var(--bg)' }}>
          <HardHat size={16} color="var(--accent)" />
          <h2 style={{ fontSize: '0.9375rem', marginRight: 'auto' }}>Civil Works</h2>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { label: 'Total WOs', value: workOrders.length, color: 'var(--text-2)' },
              { label: 'Open', value: workOrders.filter(w => !['ai_verified','rejected'].includes(w.status)).length, color: 'var(--warn)' },
              { label: 'Verified', value: workOrders.filter(w => w.status === 'ai_verified').length, color: 'var(--ok)' },
              { label: 'Est. Cost', value: `₹${(totalCost/100000).toFixed(1)}L`, color: 'var(--accent)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color }}>{value}</div>
                <div style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Generate from defects */}
          {pendingDefects.length > 0 && (
            <button className="btn btn-primary btn-sm" onClick={() => {
              const d = pendingDefects[0];
              const wo = generateWorkOrder(d.id);
              if (wo) setSelectedWoId(wo.id);
            }}>
              <Plus size={13} /> Generate WO ({pendingDefects.length} pending)
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div style={{ flexShrink: 0, padding: '8px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, background: 'var(--bg)' }}>
          <select className="form-select" style={{ width: 160, height: 32, fontSize: '0.8125rem' }}
            value={woFilter.status} onChange={(e) => setWoFilter({ status: e.target.value })}>
            <option value="">All Statuses</option>
            {COLUMNS.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}
          </select>
          {(woFilter.status || woFilter.circle) && (
            <button className="btn btn-ghost btn-sm" onClick={() => setWoFilter({ status:'', circle:'' })}>Clear</button>
          )}
        </div>

        {/* Kanban board */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {workOrders.length === 0 ? (
            <div className="empty-state">
              <HardHat size={40} />
              <h4>No work orders yet</h4>
              <p>Generate a work order from a pending pothole, waterlogging, or damaged road defect.</p>
              {pendingDefects.length > 0 && (
                <button className="btn btn-primary btn-sm" onClick={() => {
                  const wo = generateWorkOrder(pendingDefects[0].id);
                  if (wo) setSelectedWoId(wo.id);
                }}>
                  <Plus size={13} /> Generate First Work Order
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, minHeight: '100%', alignItems: 'flex-start' }}>
              {COLUMNS.map((col) => {
                const items = filtered.filter((w) => w.status === col.status);
                return (
                  <div key={col.status} className="kanban-col" style={{ minHeight: 200 }}>
                    <div className="kanban-col-header" style={{ color: col.color }}>
                      <span>{col.label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', background: `${col.color}15`, padding: '1px 6px', borderRadius: 999 }}>
                        {items.length}
                      </span>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
                      <AnimatePresence>
                        {items.map((wo) => (
                          <motion.div key={wo.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <WorkOrderCard wo={wo} onClick={() => setSelectedWoId(wo.id)} />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedWoId && (
        <div style={{ width: 400, flexShrink: 0, borderLeft: '1px solid var(--border)', overflow: 'hidden' }}>
          <WorkOrderDetailPanel woId={selectedWoId} onClose={() => setSelectedWoId(null)} />
        </div>
      )}
    </div>
  );
}
