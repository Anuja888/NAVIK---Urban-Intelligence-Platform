import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, Cloud, Navigation, HardHat, AlertTriangle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavikStore } from '../../store/navikStore';
import type { RoadHealthSegment } from '../../types';

function rhiColor(rhi: number): string {
  if (rhi >= 70) return '#15803D';
  if (rhi >= 50) return '#A16207';
  if (rhi >= 30) return '#C2410C';
  return '#B42318';
}

function rhiLabel(rhi: number): string {
  if (rhi >= 70) return 'Good';
  if (rhi >= 50) return 'Fair';
  if (rhi >= 30) return 'Poor';
  return 'Critical';
}

const TOOLTIP_STYLE = {
  contentStyle: { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, fontFamily: '"Plus Jakarta Sans", sans-serif' },
  labelStyle:   { color: '#64748B', fontSize: 11 },
  cursor:       { fill: 'rgba(15,118,110,0.05)' },
};

export function RoadHealthView() {
  const segments      = useNavikStore((s) => s.roadHealthSegments);
  const buses         = useNavikStore((s) => s.buses);
  const applyReroute  = useNavikStore((s) => s.applyRerouteSuggestion);
  const prePosition   = useNavikStore((s) => s.prePositionCrew);
  const addToast      = useNavikStore((s) => s.addToast);
  const [monsoonMM, setMonsoonMM] = useState(40);
  const [sortBy, setSortBy]       = useState<'rhi' | 'failure' | 'coverage'>('rhi');

  // Recompute failure probability with monsoon slider
  const computedSegments = useMemo<RoadHealthSegment[]>(() => {
    return segments.map((seg) => {
      const monsoonFactor = Math.min(1, monsoonMM / 100);
      const adjustedProb  = Math.min(0.98, seg.failureProbability30d + monsoonFactor * 0.2);
      const predictedCount = Math.round(adjustedProb * seg.defectDensity * 3);
      return { ...seg, failureProbability30d: adjustedProb, predictedPotholeCount: predictedCount };
    });
  }, [segments, monsoonMM]);

  const sorted = [...computedSegments].sort((a, b) =>
    sortBy === 'rhi'      ? a.rhi - b.rhi :
    sortBy === 'failure'  ? b.failureProbability30d - a.failureProbability30d :
                            b.hoursSinceLastScan - a.hoursSinceLastScan
  );

  const criticalCount  = sorted.filter((s) => s.rhi < 30).length;
  const unscanCount    = sorted.filter((s) => s.coverageFreshness === 'critical').length;
  const highRiskCount  = sorted.filter((s) => s.failureProbability30d > 0.6).length;
  const avgRHI         = Math.round(sorted.reduce((s, n) => s + n.rhi, 0) / Math.max(sorted.length, 1));

  // Chart data: RHI per segment
  const chartData = sorted.map((s) => ({ name: s.name.split('–')[0].trim(), rhi: s.rhi, prob: Math.round(s.failureProbability30d * 100) }));

  function freshnessColor(f: RoadHealthSegment['coverageFreshness']) {
    return f === 'fresh' ? 'var(--ok)' : f === 'stale' ? 'var(--warn)' : 'var(--danger)';
  }

  function suggestBus(_seg: RoadHealthSegment) {
    const near = buses.find((b) => b.status === 'active');
    return near?.id;
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--canvas)' }}>
      {/* Header — two rows so KPIs never overlap title */}
      <div style={{ flexShrink: 0, background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        {/* Row 1: title */}
        <div style={{ padding: '12px 20px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={15} color="#0F766E" />
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Road Health Intelligence</h2>
        </div>
        {/* Row 2: KPI chips — no overlap at any width */}
        <div style={{ display: 'flex', gap: 8, padding: '0 20px 10px', flexWrap: 'wrap' }}>
          {[
            { label: 'Avg RHI',       value: `${avgRHI}/100`, hex: rhiColor(avgRHI) },
            { label: 'Critical',      value: String(criticalCount), hex: criticalCount > 0 ? '#B42318' : '#15803D' },
            { label: 'Unscanned >6h', value: String(unscanCount),  hex: unscanCount > 0 ? '#A16207' : '#15803D' },
            { label: 'High risk 30d', value: String(highRiskCount), hex: highRiskCount > 0 ? '#B42318' : '#15803D' },
          ].map(({ label, value, hex }) => (
            <div key={label} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '5px 12px', borderRadius: 8,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              minWidth: 80,
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16, color: hex, lineHeight: 1.2 }}>{value}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, whiteSpace: 'nowrap' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: controls + chart */}
        <div style={{ width: 340, flexShrink: 0, borderRight: '1px solid var(--border)', overflow: 'auto', padding: '16px' }}>
          {/* Monsoon slider */}
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Cloud size={13} color="var(--info)" />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Monsoon Intensity</span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--info)' }}>{monsoonMM}mm</span>
            </div>
            <div style={{ padding: '14px' }}>
              <input type="range" min={0} max={150} value={monsoonMM} onChange={(e) => setMonsoonMM(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--info)', cursor: 'pointer', marginBottom: 8 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {[0, 50, 100, 150].map((v) => (
                  <span key={v} style={{ fontSize: 11, color: 'var(--muted)' }}>{v}mm</span>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                Adjusting monsoon intensity recalculates 30-day failure probability and predicted pothole count for all segments.
              </div>
            </div>
          </div>

          {/* RHI Bar chart */}
          <div className="panel">
            <div className="panel-header">
              <span style={{ fontSize: 13, fontWeight: 600 }}>Road Health Index (RHI)</span>
            </div>
            <div style={{ padding: '8px 0' }}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} layout="vertical" barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill: 'var(--ink-2)', fontSize: 9 }} width={80} axisLine={false} tickLine={false} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v}/100`, 'RHI']} />
                  <Bar dataKey="rhi" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={rhiColor(entry.rhi)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right: segment table */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {/* Sort bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Sort by:</span>
            {[
              { key: 'rhi',      label: 'RHI (worst first)' },
              { key: 'failure',  label: '30d Failure Risk' },
              { key: 'coverage', label: 'Coverage Freshness' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setSortBy(key as typeof sortBy)}
                className={sortBy === key ? 'btn btn-primary btn-xs' : 'btn btn-secondary btn-xs'}>
                {label}
              </button>
            ))}
          </div>

          {/* Segments */}
          {sorted.map((seg, i) => {
            const rc     = rhiColor(seg.rhi);
            const fc     = freshnessColor(seg.coverageFreshness);
            const sugBus = suggestBus(seg);
            return (
              <motion.div key={seg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                style={{ background: 'var(--surface)', border: `1px solid ${seg.rhi < 30 ? 'rgba(255,92,92,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <h4 style={{ fontSize: 15, color: 'var(--ink)', marginBottom: 2 }}>{seg.name}</h4>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: rc, fontWeight: 700, background: `${rc}12`, padding: '1px 7px', borderRadius: 999, border: `1px solid ${rc}25`, fontFamily: 'var(--font-mono)' }}>
                        RHI {seg.rhi} · {rhiLabel(seg.rhi)}
                      </span>
                      <span style={{ fontSize: 12, color: fc, fontWeight: 600, background: `${fc}12`, padding: '1px 7px', borderRadius: 999, border: `1px solid ${fc}25` }}>
                        <Clock size={9} style={{ verticalAlign: 'middle', marginRight: 3 } as React.CSSProperties} />
                        {seg.coverageFreshness === 'fresh' ? `<2h ago` : seg.coverageFreshness === 'stale' ? `${seg.hoursSinceLastScan.toFixed(1)}h ago` : `>${seg.hoursSinceLastScan.toFixed(0)}h`}
                      </span>
                      {seg.prePositionCrewRecommended && (
                        <span style={{ fontSize: 12, color: 'var(--danger)', background: 'var(--danger-subtle)', padding: '1px 7px', borderRadius: 999, border: '1px solid rgba(255,92,92,0.25)', fontWeight: 700 }}>
                          ⚠ Pre-position recommended
                        </span>
                      )}
                    </div>
                  </div>
                  {/* RHI bar */}
                  <div style={{ minWidth: 120, textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', marginBottom: 4 }}>
                      <div style={{ width: 80, height: 6, background: 'var(--surface-2)', borderRadius: 999 }}>
                        <div style={{ height: '100%', width: `${seg.rhi}%`, background: rc, borderRadius: 999, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>
                      30d fail: <span style={{ color: seg.failureProbability30d > 0.6 ? 'var(--danger)' : 'var(--warn)', fontWeight: 700 }}>
                        {Math.round(seg.failureProbability30d * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metrics grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'Defect/km', value: `${seg.defectDensity}`, color: 'var(--ink-2)' },
                    { label: 'Age',       value: `${seg.ageYears}y`,     color: 'var(--ink-2)' },
                    { label: 'Load',      value: seg.trafficLoad,         color: seg.trafficLoad === 'high' ? 'var(--danger)' : seg.trafficLoad === 'medium' ? 'var(--warn)' : 'var(--ok)' },
                    { label: 'Rain exp.', value: `${seg.rainExposure}/10`, color: 'var(--info)' },
                    { label: 'Pred. new', value: `${seg.predictedPotholeCount} holes`, color: seg.predictedPotholeCount > 2 ? 'var(--danger)' : 'var(--warn)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: 'var(--surface-2)', borderRadius: 7, padding: '7px 8px', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color }}>{value}</div>
                      <div style={{ fontSize: '0.5rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 1 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {seg.coverageFreshness !== 'fresh' && sugBus && (
                    <button className="btn btn-secondary btn-sm" onClick={() => {
                      applyReroute(seg.id);
                      addToast({ type:'success', title:'Reroute Applied', message:`${sugBus} nudged to cover ${seg.name}` });
                    }}>
                      <Navigation size={12} />
                      Suggest Reroute ({sugBus})
                    </button>
                  )}
                  {seg.prePositionCrewRecommended && (
                    <button className="btn btn-warning btn-sm" onClick={() => prePosition(seg.id)}>
                      <HardHat size={12} /> Pre-position Crew
                    </button>
                  )}
                  {seg.failureProbability30d > 0.5 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--danger)' }}>
                      <AlertTriangle size={12} />
                      High failure risk — consider preventive patching
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
