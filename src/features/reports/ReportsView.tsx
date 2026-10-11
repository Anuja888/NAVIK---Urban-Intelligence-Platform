import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, RefreshCw, Calendar } from 'lucide-react';
import { useNavikStore } from '../../store/navikStore';

const REPORT_TYPES = [
  { id:'infrastructure_deficiency', label:'Infrastructure Deficiency', desc:'Pothole, waterlogging, signage, divider defects with GHMC circle breakdown' },
  { id:'incident_summary',          label:'Incident Summary',          desc:'Hit-and-run, rash driving, school zone violations with evidence' },
  { id:'fleet_performance',         label:'Fleet Performance',         desc:'TGSRTC fleet uptime, route adherence, driver performance' },
  { id:'traffic_analytics',         label:'Traffic Analytics',         desc:'Congestion scores, O-D flows, route delay analysis' },
  { id:'school_safety',             label:'School Safety Report',      desc:'School zone incidents, compliance, pedestrian hazard events' },
];

export function ReportsView() {
  const [reportType, setReportType] = useState('infrastructure_deficiency');
  const [dateFrom, setDateFrom]     = useState(new Date(Date.now() - 7*86400000).toISOString().slice(0,10));
  const [dateTo, setDateTo]         = useState(new Date().toISOString().slice(0,10));
  const [loading, setLoading]       = useState(false);
  const [generated, setGenerated]   = useState(false);

  const addToast    = useNavikStore((s) => s.addToast);
  const incidents   = useNavikStore((s) => s.incidents);
  const defects     = useNavikStore((s) => s.defects);
  const buses       = useNavikStore((s) => s.buses);
  const workOrders  = useNavikStore((s) => s.workOrders);
  const schoolZones = useNavikStore((s) => s.schoolZones);

  function generate() {
    setLoading(true); setGenerated(false);
    setTimeout(() => { setLoading(false); setGenerated(true); addToast({ type:'success', title:'Report Generated', message:`${REPORT_TYPES.find(r=>r.id===reportType)?.label} ready.` }); }, 1200);
  }

  const type = REPORT_TYPES.find(r => r.id === reportType);
  const potholes  = defects.filter(d => d.category === 'pothole').length;
  const waterlog  = defects.filter(d => d.category === 'waterlogging').length;
  const signboard = defects.filter(d => d.category === 'missing_signboard').length;
  const activeBuses = buses.filter(b => b.status === 'active').length;
  const hitRun    = incidents.filter(i => i.type === 'hit_and_run').length;
  const schoolInc = incidents.filter(i => i.type === 'school_zone_alert').length;

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden', background:'var(--bg)' }}>
      {/* Left config panel */}
      <div style={{ width:280, flexShrink:0, borderRight:'1px solid var(--border)', overflow:'auto', padding:'20px 16px', display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <FileText size={16} color="var(--accent)" />
          <h3 style={{ fontSize:'0.9375rem' }}>Generate Report</h3>
        </div>

        {/* Report type */}
        <div>
          <label className="form-label">Report Type</label>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {REPORT_TYPES.map((r) => (
              <button key={r.id} onClick={() => { setReportType(r.id); setGenerated(false); }}
                style={{ textAlign:'left', padding:'8px 10px', borderRadius:8, border:`1px solid ${reportType===r.id?'var(--accent)':'var(--border)'}`, background:reportType===r.id?'var(--accent-subtle)':'var(--surface-2)', cursor:'pointer', transition:'all 0.13s' }}>
                <div style={{ fontSize:'0.8125rem', fontWeight:600, color:reportType===r.id?'var(--accent)':'var(--text)' }}>{r.label}</div>
                <div style={{ fontSize:'0.6875rem', color:'var(--text-muted)', marginTop:2, lineHeight:1.4 }}>{r.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div>
          <label className="form-label"><Calendar size={10} style={{ marginRight:4 } as React.CSSProperties} />Date Range</label>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <input type="date" className="form-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ height:34, fontSize:'0.8125rem' }} />
            <input type="date" className="form-input" value={dateTo}   onChange={(e) => setDateTo(e.target.value)}   style={{ height:34, fontSize:'0.8125rem' }} />
          </div>
        </div>

        {/* Generate + export */}
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <button className="btn btn-primary btn-full" onClick={generate} disabled={loading}>
            {loading ? <><RefreshCw size={13} style={{ animation:'spin 1s linear infinite' } as React.CSSProperties} /> Generating…</> : <><FileText size={13} /> Generate Report</>}
          </button>
          {generated && (
            <button className="btn btn-secondary btn-full" onClick={() => addToast({ type:'success', title:'📄 PDF Exported', message:`${type?.label} report.pdf` })}>
              <Download size={13} /> Export PDF
            </button>
          )}
        </div>
      </div>

      {/* Right preview */}
      <div style={{ flex:1, overflow:'auto', padding:'20px 24px' }}>
        {!generated && !loading && (
          <div className="empty-state" style={{ height:'100%' }}>
            <FileText size={40} />
            <h4>No report generated yet</h4>
            <p>Select a report type and date range, then click Generate Report.</p>
          </div>
        )}
        {loading && (
          <div className="empty-state" style={{ height:'100%' }}>
            <div className="skeleton" style={{ width:200, height:20, marginBottom:12 }} />
            <div className="skeleton" style={{ width:'80%', height:14 }} />
            <div className="skeleton" style={{ width:'70%', height:14, marginTop:8 }} />
            <div className="skeleton" style={{ width:'60%', height:14, marginTop:8 }} />
          </div>
        )}
        {generated && !loading && (
          <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}>
            {/* Header */}
            <div style={{ borderBottom:'2px solid var(--accent)', paddingBottom:16, marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:'0.625rem', fontWeight:700, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:4 }}>NAVIK Urban Intelligence Platform</div>
                  <h2 style={{ fontSize:'1.25rem', marginBottom:4 }}>{type?.label}</h2>
                  <p style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>Period: {dateFrom} to {dateTo} · Hyderabad Metropolitan Region</p>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:'0.625rem', color:'var(--text-muted)' }}>Authorities:</div>
                  <div style={{ fontSize:'0.625rem', color:'var(--text-2)', marginTop:2 }}>TGSRTC · GHMC · TS Traffic Police</div>
                  <div style={{ fontSize:'0.5625rem', fontFamily:'var(--font-mono)', color:'var(--text-muted)', marginTop:2 }}>SIH PS #26124 · BEL</div>
                </div>
              </div>
            </div>

            {/* Content by type */}
            {reportType === 'infrastructure_deficiency' && (
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                  {[
                    { label:'Total Defects', value:defects.length, color:'var(--text)' },
                    { label:'Potholes', value:potholes, color:'var(--danger)' },
                    { label:'Waterlogging', value:waterlog, color:'var(--info)' },
                    { label:'Work Orders', value:workOrders.length, color:'var(--warn)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px', textAlign:'center' }}>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'2rem', color }}>{value}</div>
                      <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:4 }}>{label}</div>
                    </div>
                  ))}
                </div>
                <div className="panel">
                  <div className="panel-header"><h3 style={{ fontSize:'0.9375rem' }}>Defect Category Breakdown</h3></div>
                  <div style={{ padding:'14px' }}>
                    {[
                      { cat:'Pothole',              count:potholes,  color:'var(--danger)' },
                      { cat:'Waterlogging',          count:waterlog,  color:'var(--info)' },
                      { cat:'Missing Signboard',     count:signboard, color:'var(--warn)' },
                      { cat:'Missing Divider',       count:defects.filter(d=>d.category==='missing_divider').length, color:'#ff8c42' },
                      { cat:'Missing Zebra Crossing',count:defects.filter(d=>d.category==='missing_zebra_crossing').length, color:'var(--ok)' },
                      { cat:'Damaged Road',           count:defects.filter(d=>d.category==='damaged_road').length, color:'#a78bfa' },
                    ].map(({ cat, count, color }) => (
                      <div key={cat} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                        <div style={{ width:130, fontSize:'0.8125rem', color:'var(--text-2)' }}>{cat}</div>
                        <div style={{ flex:1, height:6, background:'var(--surface-2)', borderRadius:999 }}>
                          <div style={{ height:'100%', width:`${(count/defects.length)*100}%`, background:color, borderRadius:999 }} />
                        </div>
                        <div style={{ fontFamily:'var(--font-mono)', fontWeight:700, color, width:24, textAlign:'right' }}>{count}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-header"><h3 style={{ fontSize:'0.9375rem' }}>Responsible Authority</h3></div>
                  <div style={{ padding:'14px', fontSize:'0.875rem', color:'var(--text-2)', lineHeight:1.8 }}>
                    <div><strong style={{ color:'var(--text)' }}>GHMC Roads & Buildings</strong> — Pothole repairs, road markings, signage restoration, drainage improvement</div>
                    <div><strong style={{ color:'var(--text)' }}>TGSRTC Technical Wing</strong> — Fleet defect data, camera evidence, route-level defect reports</div>
                    <div><strong style={{ color:'var(--text)' }}>HMWS&SB</strong> — Waterlogging, stormwater drain clearance coordination</div>
                  </div>
                </div>
              </div>
            )}
            {reportType === 'incident_summary' && (
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                  {[
                    { label:'Total Incidents', value:incidents.length,       color:'var(--text)' },
                    { label:'Hit & Run',        value:hitRun,                color:'var(--danger)' },
                    { label:'School Zone',      value:schoolInc,             color:'var(--warn)' },
                    { label:'Resolved',         value:incidents.filter(i=>i.status==='resolved').length, color:'var(--ok)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px', textAlign:'center' }}>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'2rem', color }}>{value}</div>
                      <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:4 }}>{label}</div>
                    </div>
                  ))}
                </div>
                <div className="panel">
                  <div className="panel-header"><h3 style={{ fontSize:'0.9375rem' }}>Hit & Run Records (ANPR)</h3></div>
                  <table className="data-table">
                    <thead><tr>{['Incident ID','Plate','Location','Confidence','Status'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {incidents.filter(i => i.type==='hit_and_run').slice(0,8).map(inc => (
                        <tr key={inc.id}>
                          <td style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:'var(--accent)' }}>{inc.id}</td>
                          <td style={{ fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--danger)' }}>{inc.plateNumber ?? '—'}</td>
                          <td style={{ fontSize:'0.8125rem', color:'var(--text-2)' }}>{inc.locationLabel}</td>
                          <td style={{ fontFamily:'var(--font-mono)', color:inc.plateConfidence&&inc.plateConfidence>=90?'var(--ok)':'var(--warn)' }}>{inc.plateConfidence}%</td>
                          <td><span className={`badge ${inc.status==='resolved'?'badge-success':inc.status==='dispatched'?'badge-info':'badge-warning'}`}>{inc.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {reportType === 'fleet_performance' && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                {[
                  { label:'Total Buses',      value:buses.length,                                   color:'var(--text)' },
                  { label:'Active Today',     value:activeBuses,                                    color:'var(--ok)' },
                  { label:'Maintenance',      value:buses.filter(b=>b.status==='maintenance').length,color:'var(--info)' },
                  { label:'Offline',          value:buses.filter(b=>b.status==='offline').length,   color:'var(--danger)' },
                  { label:'Defects Reported', value:defects.length,                                 color:'var(--warn)' },
                  { label:'Fleet Uptime',     value:`${Math.round(activeBuses/buses.length*100)}%`, color:'var(--ok)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'16px', textAlign:'center' }}>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.75rem', color }}>{value}</div>
                    <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:4 }}>{label}</div>
                  </div>
                ))}
              </div>
            )}
            {reportType === 'school_safety' && (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                  {[
                    { label:'School Zones',     value:schoolZones.length, color:'var(--warn)' },
                    { label:'Zone Incidents',   value:schoolInc,           color:'var(--danger)' },
                    { label:'Active Now',       value:schoolZones.filter(sz => {
                      const h = new Date().getHours(), m = new Date().getMinutes();
                      const curr = h*60+m;
                      return sz.alertTimes.some(t => { const s=parseInt(t.start)*60+parseInt(t.start.slice(3)), e=parseInt(t.end)*60+parseInt(t.end.slice(3)); return curr>=s&&curr<=e; });
                    }).length, color:'var(--ok)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px', textAlign:'center' }}>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'2rem', color }}>{value}</div>
                      <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:4 }}>{label}</div>
                    </div>
                  ))}
                </div>
                <div className="panel">
                  <div className="panel-header"><h3 style={{ fontSize:'0.9375rem' }}>School Zone Registry</h3></div>
                  <table className="data-table">
                    <thead><tr>{['Zone ID','Name','Alert Times','Radius'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>
                      {schoolZones.map(sz => (
                        <tr key={sz.id}>
                          <td style={{ fontFamily:'var(--font-mono)', color:'var(--accent)' }}>{sz.id}</td>
                          <td style={{ color:'var(--text-2)' }}>{sz.name}</td>
                          <td style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:'var(--text-2)' }}>{sz.alertTimes.map(t=>`${t.start}–${t.end}`).join(', ')}</td>
                          <td style={{ fontFamily:'var(--font-mono)', color:'var(--text-2)' }}>{sz.radius}m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {reportType === 'traffic_analytics' && (
              <div style={{ fontSize:'0.875rem', color:'var(--text-2)', lineHeight:1.9, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'20px' }}>
                <h3 style={{ color:'var(--text)', marginBottom:12 }}>Traffic Analytics Summary</h3>
                <p>The Hyderabad metropolitan fleet recorded <strong style={{ color:'var(--accent)' }}>{buses.filter(b=>b.status==='active').length} active TGSRTC buses</strong> across 15 routes during the report period.</p>
                <p>Peak congestion was recorded on <strong>Kondapur–Madhapur (score: 92)</strong> and <strong>Hitech City–Gachibowli (score: 88)</strong> during 08:00–10:00 and 17:00–19:00 windows.</p>
                <p>Traffic Advisor Agent issued <strong style={{ color:'var(--accent)' }}>{useNavikStore.getState().advisories.length} advisories</strong>. O-D analysis shows highest demand corridor: Hitech City → Ameerpet ({(8200).toLocaleString()} trips/day).</p>
                <p>Average route delay across fleet: <strong style={{ color:'var(--warn)' }}>{useNavikStore.getState().kpis.avgRouteDelay} minutes</strong> above schedule.</p>
              </div>
            )}

            <div style={{ marginTop:20, padding:'12px 16px', borderRadius:8, background:'rgba(255,255,255,0.03)', border:'1px solid var(--border)', fontSize:'0.6875rem', color:'var(--text-muted)' }}>
              Generated by NAVIK AI Platform · SIH PS #26124 · BEL · {new Date().toLocaleString('en-IN')} · Data sources: TGSRTC fleet telemetry, GHMC infrastructure records, TS Traffic Police ANPR
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
