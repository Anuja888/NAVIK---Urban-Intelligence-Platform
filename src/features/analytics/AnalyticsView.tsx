import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { useNavikStore } from '../../store/navikStore';
import { generateRouteDelays, generateDefectBreakdown, generateDensityTimeline } from '../../lib/seedData';
import { TrendingUp, Zap, BarChart3, MapPin, Bot, CheckCircle, RotateCcw, Play, ChevronRight } from 'lucide-react';

const routeDelays     = generateRouteDelays();
const defectBreakdown = generateDefectBreakdown();
const densityData     = generateDensityTimeline();

// Real hex values — must not use CSS vars in chart/Leaflet contexts
const GRID = '#E5E7EB';
const TICK = '#94A3B8';
const TT = {
  contentStyle: { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12, fontFamily: '"Plus Jakarta Sans", sans-serif' },
  labelStyle:   { color: '#64748B', fontSize: 11 },
  cursor:       { fill: 'rgba(15,118,110,0.05)' },
};

// Congestion score → hex colour (not CSS vars)
function congestionHex(score: number): string {
  if (score >= 80) return '#B42318';
  if (score >= 65) return '#C2410C';
  if (score >= 50) return '#A16207';
  return '#15803D';
}

const TABS = [
  { id:'traffic',    label:'Traffic & Density', icon:TrendingUp },
  { id:'delays',     label:'Route Delays',      icon:Zap        },
  { id:'defects',    label:'Defect Breakdown',  icon:BarChart3  },
  { id:'bottleneck', label:'Bottlenecks',        icon:MapPin     },
  { id:'advisor',    label:'Traffic Advisor',    icon:Bot        },
] as const;
type TabId = typeof TABS[number]['id'];

// ── Traffic Advisor tab ────────────────────────────────────
function TrafficAdvisorTab() {
  const trafficSegments  = useNavikStore((s) => s.trafficSegments);
  const advisories       = useNavikStore((s) => s.advisories);
  const generateAdvisory = useNavikStore((s) => s.generateAdvisory);
  const simulateAdvisory = useNavikStore((s) => s.simulateAdvisory);
  const applyAdvisory    = useNavikStore((s) => s.applyAdvisory);
  const undoAdvisory     = useNavikStore((s) => s.undoAdvisory);
  const [selectedSegId, setSelectedSegId]   = useState('');
  const [selectedAdvId, setSelectedAdvId]   = useState<string | null>(null);
  const [showReasoning, setShowReasoning]   = useState(false);

  const topSegs = [...trafficSegments].sort((a, b) => b.congestionScore - a.congestionScore).slice(0, 8);
  const selectedAdv = advisories.find((a) => a.id === selectedAdvId);

  function scoreColor(s: number) { return s > 85 ? 'var(--danger)' : s > 65 ? 'var(--warn)' : 'var(--ok)'; }

  return (
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
      {/* Left: segment selector */}
      <div style={{ flex: '1 1 320px', minWidth: 0 }}>
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-header">
            <span style={{ fontSize: 14, fontWeight: 600 }}>Select Bottleneck to Advise</span>
          </div>
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topSegs.map((seg) => {
              const sc  = scoreColor(seg.congestionScore);
              const adv = advisories.find((a) => a.segmentId === seg.id);
              return (
                <div key={seg.id}
                  style={{
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    padding:'10px 12px', borderRadius:8, cursor:'pointer',
                    background: selectedSegId === seg.id ? 'rgba(61,213,243,0.08)' : 'var(--surface-2)',
                    border: `1px solid ${selectedSegId === seg.id ? 'var(--accent)' : 'var(--border)'}`,
                    transition: 'all 0.13s',
                  }}
                  onClick={() => setSelectedSegId(seg.id)}
                >
                  <div>
                    <div style={{ fontSize:'0.8125rem', fontWeight:600, color:'var(--ink)' }}>{seg.name}</div>
                    <div style={{ fontSize:'0.6875rem', color:'var(--muted)', fontFamily:'var(--font-mono)', marginTop:2 }}>
                      {seg.avgSpeed} km/h · +{seg.delay}min
                      {seg.advisoryApplied && <span style={{ marginLeft:6, color:'var(--ok)' }}>✓ Advisory applied</span>}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <span style={{ fontFamily:'var(--font-ui)', fontSize:'1.25rem', fontWeight:700, color:sc }}>{seg.congestionScore}</span>
                    {adv && <div style={{ fontSize:'0.5625rem', color:'var(--muted)', fontFamily:'var(--font-mono)' }}>{adv.id}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ padding:'0 12px 12px' }}>
            <button className="btn btn-primary btn-sm btn-full"
              disabled={!selectedSegId}
              onClick={() => {
                const adv = generateAdvisory(selectedSegId);
                if (adv) setSelectedAdvId(adv.id);
              }}>
              <Bot size={13} /> Generate Advisory
            </button>
          </div>
        </div>
      </div>

      {/* Right: advisory detail */}
      <div style={{ flex: '1 1 400px', minWidth: 0 }}>
        {!selectedAdv ? (
          <div className="empty-state" style={{ border:'1px solid var(--border)', borderRadius:12, background:'var(--surface)' }}>
            <Bot size={36} />
            <h4>No Advisory Selected</h4>
            <p>Select a bottleneck segment and generate an advisory to see ranked actions and run simulations.</p>
          </div>
        ) : (
          <div className="panel">
            <div className="panel-header">
              <div>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.625rem', color:'var(--accent)' }}>{selectedAdv.id}</span>
                <h3 style={{ marginTop:2 }}>{selectedAdv.segmentName}</h3>
              </div>
              <span className={`badge ${selectedAdv.status === 'applied' ? 'badge-success' : selectedAdv.status === 'undone' ? 'badge-muted' : 'badge-info'}`}>
                {selectedAdv.status}
              </span>
            </div>
            <div style={{ padding:'14px' }}>
              {/* Before state */}
              <div style={{ display:'flex', gap:12, marginBottom:16 }}>
                {[
                  { label:'Congestion (before)', value:`${selectedAdv.beforeCongestion}`, color:scoreColor(selectedAdv.beforeCongestion) },
                  { label:'Speed (before)',       value:`${selectedAdv.beforeSpeed} km/h`, color:'var(--ink-2)' },
                  { label:'Delay (before)',        value:`+${selectedAdv.beforeDelay}min`, color:'var(--warn)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ flex:1, background:'var(--surface-2)', borderRadius:8, padding:'8px', textAlign:'center', border:'1px solid var(--border)' }}>
                    <div style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:'0.9375rem', color }}>{value}</div>
                    <div style={{ fontSize:'0.5625rem', color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:2 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Ranked actions */}
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:'0.6875rem', fontWeight:700, color:'var(--ink-2)', textTransform:'uppercase', letterSpacing:'0.09em', marginBottom:8 }}>Ranked Actions</div>
                {selectedAdv.actions.map((action, idx) => {
                  const isSelected = selectedAdv.selectedActionIndex === idx;
                  return (
                    <div key={idx} onClick={() => simulateAdvisory(selectedAdv.id, idx)}
                      style={{
                        padding:'10px 12px', borderRadius:8, marginBottom:6, cursor:'pointer',
                        background: isSelected ? 'rgba(61,213,243,0.08)' : 'var(--surface-2)',
                        border:`1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                        transition:'all 0.13s',
                      }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                        <div>
                          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
                            <span style={{ width:18, height:18, borderRadius:'50%', background:'var(--accent)', color:'#05080e', fontSize:'0.625rem', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontFamily:'var(--font-mono)' }}>{action.rank}</span>
                            <span style={{ fontSize:'0.875rem', fontWeight:600, color:'var(--ink)' }}>{action.label}</span>
                          </div>
                          <p style={{ fontSize:'0.75rem', color:'var(--muted)', margin:0 }}>{action.rationale}</p>
                          {action.alternatRoad && <div style={{ fontSize:'0.6875rem', color:'var(--info)', marginTop:3 }}>Via: {action.alternatRoad}</div>}
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0 }}>
                          <div style={{ fontSize:'0.625rem', color:'var(--muted)' }}>After sim:</div>
                          <div style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:'0.875rem', color:scoreColor(action.expectedCongestionAfter) }}>{action.expectedCongestionAfter}</div>
                          <div style={{ fontSize:'0.5625rem', color:'var(--ok)', fontFamily:'var(--font-mono)' }}>{action.expectedSpeedAfter} km/h</div>
                        </div>
                      </div>
                      {action.affectedRoutes.length > 0 && (
                        <div style={{ display:'flex', gap:4, marginTop:6, flexWrap:'wrap' }}>
                          {action.affectedRoutes.map((r) => <span key={r} className="badge badge-muted">{r}</span>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Simulation result */}
              {selectedAdv.simulationRun && (
                <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                  style={{ marginBottom:14, padding:'12px', background:'rgba(61,213,243,0.06)', border:'1px solid rgba(61,213,243,0.18)', borderRadius:8 }}>
                  <div style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--accent)', marginBottom:8 }}>Simulation Result — Action #{selectedAdv.selectedActionIndex + 1}</div>
                  {(() => {
                    const a = selectedAdv.actions[selectedAdv.selectedActionIndex];
                    return (
                      <div style={{ display:'flex', gap:12 }}>
                        {[
                          { label:'Congestion', before:selectedAdv.beforeCongestion, after:a.expectedCongestionAfter, lower:true },
                          { label:'Speed',       before:selectedAdv.beforeSpeed,      after:a.expectedSpeedAfter,      lower:false, unit:'km/h' },
                          { label:'Delay',        before:selectedAdv.beforeDelay,       after:a.expectedDelayAfter,       lower:true,  unit:'min' },
                        ].map(({ label, before, after, lower, unit }) => {
                          const improved = lower ? after < before : after > before;
                          const pct = Math.round(Math.abs((after-before)/before*100));
                          return (
                            <div key={label} style={{ flex:1, textAlign:'center' }}>
                              <div style={{ fontSize:'0.5625rem', color:'var(--muted)', textTransform:'uppercase', marginBottom:4 }}>{label}</div>
                              <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.6875rem', color:'var(--muted)' }}>{before}{unit}</div>
                              <div style={{ color:'var(--accent)', fontSize:'0.875rem' }}>↓</div>
                              <div style={{ fontFamily:'var(--font-ui)', fontWeight:700, fontSize:'1rem', color:improved?'var(--ok)':'var(--danger)' }}>{after}{unit}</div>
                              <div style={{ fontSize:'0.5625rem', color:improved?'var(--ok)':'var(--danger)', marginTop:2 }}>
                                {improved ? '▼' : '▲'} {pct}%
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </motion.div>
              )}

              {/* Reasoning */}
              <div style={{ marginBottom:14 }}>
                <button onClick={() => setShowReasoning(!showReasoning)}
                  style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:'var(--accent)', fontSize:'0.75rem', padding:0 }}>
                  <ChevronRight size={12} style={{ transform:showReasoning?'rotate(90deg)':'none', transition:'transform 0.15s' }} />
                  Agent Reasoning Trace
                </button>
                <AnimatePresence>
                  {showReasoning && (
                    <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.18 }}>
                      <div className="reasoning-trace" style={{ marginTop:8 }}>
                        {selectedAdv.reasoningTrace.map((step, i) => <div key={i} className="trace-step">{step}</div>)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Action buttons */}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {selectedAdv.status === 'proposed' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => simulateAdvisory(selectedAdv.id, selectedAdv.selectedActionIndex)}>
                    <Play size={12} /> Simulate
                  </button>
                )}
                {(selectedAdv.status === 'simulated' || selectedAdv.status === 'proposed') && (
                  <button className="btn btn-primary btn-sm" onClick={() => applyAdvisory(selectedAdv.id)}>
                    <CheckCircle size={12} /> Apply to Live
                  </button>
                )}
                {selectedAdv.status === 'applied' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => undoAdvisory(selectedAdv.id)}>
                    <RotateCcw size={12} /> Undo
                  </button>
                )}
              </div>

              {selectedAdv.logEntry && (
                <div style={{ marginTop:10, fontSize:'0.6875rem', color:'var(--ok)', fontFamily:'var(--font-mono)' }}>
                  ✓ {selectedAdv.logEntry}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Advisory log */}
        {advisories.length > 0 && (
          <div style={{ marginTop:16 }}>
            <div style={{ fontSize:'0.6875rem', fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.09em', marginBottom:8 }}>Advisory Log</div>
            {advisories.map((adv) => (
              <div key={adv.id} onClick={() => setSelectedAdvId(adv.id)}
                style={{ display:'flex', justifyContent:'space-between', padding:'8px 12px', background:'var(--surface-2)', borderRadius:8, marginBottom:4, cursor:'pointer', border:`1px solid ${selectedAdvId === adv.id ? 'var(--accent)' : 'var(--border)'}` }}>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.625rem', color:'var(--accent)' }}>{adv.id}</span>
                <span style={{ fontSize:'0.75rem', color:'var(--ink-2)' }}>{adv.segmentName}</span>
                <span className={`badge ${adv.status === 'applied' ? 'badge-success' : adv.status === 'undone' ? 'badge-muted' : 'badge-info'}`}>{adv.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main AnalyticsView ─────────────────────────────────────
export function AnalyticsView() {
  const [tab, setTab]          = useState<TabId>('traffic');
  const trafficSegments        = useNavikStore((s) => s.trafficSegments);
  const odFlows                = useNavikStore((s) => s.odFlows);
  const topBottlenecks         = [...trafficSegments].sort((a,b) => b.congestionScore - a.congestionScore).slice(0,5);
  const maxOdVol               = Math.max(...odFlows.map((f) => f.volume), 1);

  function _sc(v: number) { return congestionHex(v); }
  void _sc;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', background:'var(--canvas)' }}>
      {/* Tabs */}
      <div style={{ flexShrink:0, display:'flex', borderBottom:'1px solid var(--border)', padding:'0 20px', background:'var(--canvas)' }}>
        {TABS.map(({ id, label, icon:Icon }) => {
          const active = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'12px 14px', border:'none', background:'transparent', cursor:'pointer', fontSize:'0.8125rem', fontWeight:active?600:400, color:active?'var(--accent)':'var(--muted)', borderBottom:`2px solid ${active?'var(--accent)':'transparent'}`, marginBottom:-1, transition:'all 0.13s', whiteSpace:'nowrap' }}>
              <Icon size={13} strokeWidth={active?2.2:1.8} />
              {label}
              {id === 'advisor' && <span style={{ marginLeft:2, fontSize:'0.5rem', background:'var(--accent)', color:'#05080e', padding:'1px 4px', borderRadius:999, fontWeight:700 }}>AI</span>}
            </button>
          );
        })}
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'20px' }}>
        <motion.div key={tab} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.18 }}>

          {/* Traffic density */}
          {tab === 'traffic' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="panel">
                <div className="panel-header"><h3 style={{ fontSize:'0.9375rem' }}>Vehicle Density by Type — Today (Hyderabad)</h3></div>
                <div style={{ padding:'16px 8px 8px' }}>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={densityData} barGap={2} barCategoryGap="28%">
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                      <XAxis dataKey="hour" tick={{ fill:TICK, fontSize:10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:TICK, fontSize:10 }} axisLine={false} tickLine={false} />
                      <Tooltip {...TT} />
                      <Legend wrapperStyle={{ fontSize:12, paddingTop:8 }} />
                      <Bar dataKey="cars"        fill="#5b8cff" name="Cars"       radius={[3,3,0,0]} />
                      <Bar dataKey="twoWheelers" fill="#2ec4a0" name="2-Wheelers" radius={[3,3,0,0]} />
                      <Bar dataKey="buses"       fill="#f5b83d" name="Buses"      radius={[3,3,0,0]} />
                      <Bar dataKey="trucks"      fill="#a78bfa" name="Trucks"     radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="panel">
                <div className="panel-header"><h3 style={{ fontSize:'0.9375rem' }}>Road Segment Congestion</h3></div>
                <div style={{ overflowX:'auto' }}>
                  <table className="data-table">
                    <thead><tr>{['Segment','Score','Density','Avg Speed','Delay'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {trafficSegments.map(seg => (
                        <tr key={seg.id}>
                          <td style={{ color:'var(--ink-2)', fontSize:13 }}>{seg.name}</td>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              {/* Bar scales with score out of 100, coloured by severity */}
                              <div style={{ width:72, height:5, background:'var(--surface-3)', borderRadius:999 }}>
                                <div style={{ height:'100%', width:`${seg.congestionScore}%`, background:congestionHex(seg.congestionScore), borderRadius:999, transition:'width 0.4s' }} />
                              </div>
                              <span className="mono tabnum" style={{ fontWeight:700, color:congestionHex(seg.congestionScore), fontSize:13 }}>{seg.congestionScore}</span>
                            </div>
                          </td>
                          <td className="mono tabnum" style={{ fontSize:13, color:'var(--ink-2)' }}>{seg.vehicleDensity}/km</td>
                          <td className="mono tabnum" style={{ fontSize:13, color:'var(--ink-2)' }}>{seg.avgSpeed} km/h</td>
                          <td className="mono tabnum" style={{ fontSize:13, color:seg.delay>15?'var(--warn)':'var(--muted)', fontWeight:seg.delay>15?600:400 }}>+{seg.delay}m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Route delays */}
          {tab === 'delays' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {routeDelays.map(r => (
                <div key={r.route} className="panel">
                  <div className="panel-header">
                    <div><h3 style={{ fontSize:'0.9375rem' }}>Route {r.route}</h3><p style={{ fontSize:'0.75rem', marginTop:1 }}>{r.routeName}</p></div>
                  </div>
                  <div style={{ padding:'16px 8px 8px' }}>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={r.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                        <XAxis dataKey="hour" tick={{ fill:TICK, fontSize:10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill:TICK, fontSize:10 }} unit="m" axisLine={false} tickLine={false} />
                        <Tooltip {...TT} formatter={(v) => [`${v} min`]} />
                        <Legend wrapperStyle={{ fontSize:11, paddingTop:4 }} />
                        <Line type="monotone" dataKey="scheduled" stroke="var(--ok)" strokeDasharray="5 3" dot={false} name="Scheduled" strokeWidth={1.5} />
                        <Line type="monotone" dataKey="actual"    stroke="var(--warn)" dot={false}             name="Actual"     strokeWidth={2}   />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Defect breakdown */}
          {tab === 'defects' && (
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              <div className="panel" style={{ flex:'1 1 300px' }}>
                <div className="panel-header"><h3 style={{ fontSize:'0.9375rem' }}>Category Distribution</h3></div>
                <div style={{ padding:'20px 8px 12px' }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={defectBreakdown} cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={3} dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`} labelLine={{ stroke:'rgba(255,255,255,0.15)' }}>
                        {defectBreakdown.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip {...TT} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="panel" style={{ flex:'1 1 300px' }}>
                <div className="panel-header"><h3 style={{ fontSize:'0.9375rem' }}>Defect Counts</h3></div>
                <div style={{ padding:'20px 8px 12px' }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={defectBreakdown} layout="vertical" barCategoryGap="22%">
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                      <XAxis type="number" tick={{ fill:TICK, fontSize:11 }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" tick={{ fill:TICK, fontSize:11 }} width={130} axisLine={false} tickLine={false} />
                      <Tooltip {...TT} />
                      <Bar dataKey="value" name="Count" radius={[0,5,5,0]}>
                        {defectBreakdown.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Bottlenecks */}
          {tab === 'bottleneck' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="panel">
                <div className="panel-header"><h3 style={{ fontSize:'0.9375rem' }}>Top 5 Congestion Bottlenecks</h3><span className="badge badge-danger">{new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span></div>
                <div>
                  {topBottlenecks.map((seg, i) => (
                    <div key={seg.id} style={{ display:'flex', alignItems:'center', gap:16, padding:'14px 18px', borderBottom:i<4?'1px solid var(--border)':undefined }}>
                      <div style={{ width:30, height:30, borderRadius:8, background:i===0?'var(--danger-subtle)':'var(--surface-2)', border:`1px solid ${i===0?'rgba(255,92,92,0.3)':'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-mono)', fontWeight:700, fontSize:'0.875rem', color:i===0?'var(--danger)':'var(--muted)', flexShrink:0 }}>
                        {i+1}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'0.9375rem', fontWeight:600, color:'var(--ink)', marginBottom:3 }}>{seg.name}</div>
                        <div style={{ display:'flex', gap:14, fontSize:'0.75rem', color:'var(--muted)', flexWrap:'wrap' }}>
                          <span>{seg.vehicleDensity} veh/km</span><span>{seg.avgSpeed} km/h avg</span>
                          <span style={{ color:'var(--warn)', fontWeight:600 }}>+{seg.delay}min delay</span>
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontFamily:'var(--font-ui)', fontWeight:700, fontSize:'1.5rem', color:congestionHex(seg.congestionScore), lineHeight:1 }}>{seg.congestionScore}</div>
                        <div style={{ fontSize:'0.5rem', color:'var(--surface-3)', textTransform:'uppercase', marginTop:2 }}>score</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel">
                <div className="panel-header"><h3 style={{ fontSize:'0.9375rem' }}>Top O-D Flows (Trips/Day)</h3></div>
                <div>
                  {odFlows.slice(0,6).map((flow, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 18px', borderBottom:i<5?'1px solid var(--border)':undefined }}>
                      <div style={{ flex:1, fontSize:'0.875rem', color:'var(--ink-2)' }}>
                        <strong>{flow.from}</strong><span style={{ color:'var(--surface-3)', margin:'0 6px' }}>→</span><strong>{flow.to}</strong>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ height:4, background:'var(--surface-2)', borderRadius:999 }}>
                          <div style={{ height:'100%', width:`${(flow.volume/maxOdVol)*100}%`, background:'var(--accent)', borderRadius:999 }} />
                        </div>
                      </div>
                      <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--accent)', minWidth:55, textAlign:'right' }}>{flow.volume.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Traffic Advisor */}
          {tab === 'advisor' && <TrafficAdvisorTab />}

        </motion.div>
      </div>
    </div>
  );
}
