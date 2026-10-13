import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, RefreshCw } from 'lucide-react';
import { useNavikStore } from '../../store/navikStore';

const REPORT_TYPES = [
  { id: 'infrastructure_deficiency', label: 'Infrastructure Deficiency Report',  short: 'Infra Deficiency' },
  { id: 'incident_summary',          label: 'Incident Summary Report',            short: 'Incident Summary' },
  { id: 'fleet_performance',         label: 'Fleet Performance Report',           short: 'Fleet Performance' },
  { id: 'traffic_analytics',         label: 'Traffic Analytics Report',           short: 'Traffic Analytics' },
  { id: 'school_safety',             label: 'School Safety Compliance Report',    short: 'School Safety' },
];

// ── Real HTML-to-download PDF generator ───────────────────
// Produces a complete styled HTML document the browser can print/save as PDF.
function buildReportHTML(params: {
  reportType: string;
  dateFrom: string;
  dateTo: string;
  data: Record<string, unknown>;
}): string {
  const { reportType, dateFrom, dateTo, data } = params;
  const title  = REPORT_TYPES.find((r) => r.id === reportType)?.label ?? 'Report';
  const genDate = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });

  // Helper to escape HTML
  function esc(s: string | number): string {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Section body based on type
  let body = '';

  if (reportType === 'infrastructure_deficiency') {
    const d = data as Record<string, number | unknown[]>;
    const defects = d.defects as unknown[];
    const wos     = d.workOrders as unknown[];
    const rows    = (d.topDefects as Array<{category:string; count:number; pending:number}>) ?? [];
    body = `
      <div class="summary-grid">
        <div class="stat-box"><div class="stat-val">${defects.length}</div><div class="stat-lbl">Total Defects</div></div>
        <div class="stat-box"><div class="stat-val">${d.pending}</div><div class="stat-lbl">Pending / Under Review</div></div>
        <div class="stat-box"><div class="stat-val">${wos.length}</div><div class="stat-lbl">Work Orders Raised</div></div>
        <div class="stat-box"><div class="stat-val">${d.resolved}</div><div class="stat-lbl">Resolved</div></div>
      </div>
      <h3>Defect Category Breakdown</h3>
      <table><thead><tr><th>Category</th><th>Total</th><th>Pending</th><th>Resolved</th></tr></thead><tbody>
        ${rows.map((r) => `<tr><td>${esc(r.category)}</td><td>${esc(r.count)}</td><td>${esc(r.pending)}</td><td>${esc(r.count - r.pending)}</td></tr>`).join('')}
      </tbody></table>
      <h3>Responsible Authorities</h3>
      <table><thead><tr><th>Defect Type</th><th>Responsible Authority</th><th>Action Required</th></tr></thead><tbody>
        <tr><td>Potholes / Damaged Road</td><td>GHMC Roads &amp; Buildings</td><td>Cut-and-patch / full-depth reclamation within SLA</td></tr>
        <tr><td>Waterlogging</td><td>GHMC + HMWS&amp;SB</td><td>Drain clearance and surface repair</td></tr>
        <tr><td>Missing Signboards / Dividers</td><td>GHMC Traffic Engineering</td><td>Replacement within 7 days</td></tr>
        <tr><td>Fleet Defect Data</td><td>TGSRTC Technical Wing</td><td>Route-level defect reports and camera evidence</td></tr>
      </tbody></table>
      <p class="note">Note: All defect data is captured by AI-enabled edge cameras on TGSRTC fleet vehicles. Confidence scores &ge;80% are submitted as actionable reports. Indicative guidance aligned with IRC:82 road maintenance standards.</p>`;
  }

  if (reportType === 'incident_summary') {
    const d = data as Record<string, unknown>;
    const rows = (d.hitRunRows as Array<{id:string;plate:string;location:string;conf:string;status:string}>) ?? [];
    body = `
      <div class="summary-grid">
        <div class="stat-box"><div class="stat-val">${d.total}</div><div class="stat-lbl">Total Incidents</div></div>
        <div class="stat-box"><div class="stat-val">${d.hitRun}</div><div class="stat-lbl">Hit &amp; Run</div></div>
        <div class="stat-box"><div class="stat-val">${d.schoolZone}</div><div class="stat-lbl">School Zone Alerts</div></div>
        <div class="stat-box"><div class="stat-val">${d.resolved}</div><div class="stat-lbl">Resolved</div></div>
      </div>
      <h3>Hit &amp; Run Incidents — ANPR Evidence (Top 10)</h3>
      <table><thead><tr><th>Incident ID</th><th>Plate Number</th><th>Location</th><th>OCR Confidence</th><th>Status</th></tr></thead><tbody>
        ${rows.map((r) => `<tr><td class="mono">${esc(r.id)}</td><td class="mono bold">${esc(r.plate)}</td><td>${esc(r.location)}</td><td>${esc(r.conf)}</td><td>${esc(r.status)}</td></tr>`).join('')}
      </tbody></table>
      <h3>Action by Authority</h3>
      <table><thead><tr><th>Incident Type</th><th>Nodal Authority</th><th>Protocol</th></tr></thead><tbody>
        <tr><td>Hit &amp; Run / Rash Driving</td><td>TS Traffic Police</td><td>FIR under Sec 161/184 MV Act; VAHAN lookup; ANPR evidence packet</td></tr>
        <tr><td>School Zone Speeding</td><td>TS Traffic Police + GHMC</td><td>Challan + signage review</td></tr>
        <tr><td>Waterlogging Critical</td><td>GHMC + HMWS&amp;SB</td><td>Emergency drain crew dispatch</td></tr>
        <tr><td>Congestion Alert</td><td>TGSRTC OCC + Traffic Police</td><td>Signal re-timing / marshal deployment</td></tr>
      </tbody></table>`;
  }

  if (reportType === 'fleet_performance') {
    const d = data as Record<string, number>;
    body = `
      <div class="summary-grid">
        <div class="stat-box"><div class="stat-val">${d.total}</div><div class="stat-lbl">Total Buses</div></div>
        <div class="stat-box"><div class="stat-val">${d.active}</div><div class="stat-lbl">Active Today</div></div>
        <div class="stat-box"><div class="stat-val">${d.uptime}%</div><div class="stat-lbl">Fleet Uptime</div></div>
        <div class="stat-box"><div class="stat-val">${d.defects}</div><div class="stat-lbl">Defects Reported</div></div>
      </div>
      <h3>Fleet Status Summary</h3>
      <table><thead><tr><th>Status</th><th>Count</th><th>%</th><th>Remarks</th></tr></thead><tbody>
        <tr><td>Active (on route)</td><td>${d.active}</td><td>${Math.round(d.active/d.total*100)}%</td><td>Operating within scheduled windows</td></tr>
        <tr><td>Idle (at depot)</td><td>${d.idle}</td><td>${Math.round(d.idle/d.total*100)}%</td><td>Scheduled maintenance or shift change</td></tr>
        <tr><td>Under Maintenance</td><td>${d.maintenance}</td><td>${Math.round(d.maintenance/d.total*100)}%</td><td>Workshop; estimated return within 24h</td></tr>
        <tr><td>Offline</td><td>${d.offline}</td><td>${Math.round(d.offline/d.total*100)}%</td><td>Communication failure; field check required</td></tr>
      </tbody></table>
      <h3>Edge AI Camera Health</h3>
      <table><thead><tr><th>Camera Type</th><th>Online</th><th>Degraded</th><th>Offline</th></tr></thead><tbody>
        <tr><td>Front</td><td>${d.camOnline}</td><td>${d.camDegraded}</td><td>${d.camOffline}</td></tr>
        <tr><td>Rear</td><td>${d.camOnline}</td><td>${d.camDegraded}</td><td>${d.camOffline}</td></tr>
        <tr><td colspan="4" style="font-size:11px;color:#666">Camera statuses are sampled at report generation time. Full logs available in NAVIK Edge Network console.</td></tr>
      </tbody></table>`;
  }

  if (reportType === 'traffic_analytics') {
    const d = data as Record<string, unknown>;
    const segs = (d.segments as Array<{name:string;score:number;speed:number;delay:number}>) ?? [];
    body = `
      <div class="summary-grid">
        <div class="stat-box"><div class="stat-val">${d.avgDelay} min</div><div class="stat-lbl">Avg Route Delay</div></div>
        <div class="stat-box"><div class="stat-val">${d.advisories}</div><div class="stat-lbl">Advisories Issued</div></div>
        <div class="stat-box"><div class="stat-val">${d.activeBuses}</div><div class="stat-lbl">Active Buses</div></div>
        <div class="stat-box"><div class="stat-val">${d.topOD}</div><div class="stat-lbl">Top O-D Volume</div></div>
      </div>
      <h3>Road Segment Congestion (Current)</h3>
      <table><thead><tr><th>Segment</th><th>Congestion Score</th><th>Avg Speed</th><th>Delay</th><th>Level</th></tr></thead><tbody>
        ${segs.map((s) => `<tr><td>${esc(s.name)}</td><td>${esc(s.score)}/100</td><td>${esc(s.speed)} km/h</td><td>+${esc(s.delay)} min</td><td>${s.score >= 80 ? 'CRITICAL' : s.score >= 65 ? 'HIGH' : s.score >= 50 ? 'MEDIUM' : 'LOW'}</td></tr>`).join('')}
      </tbody></table>
      <h3>Top Origin–Destination Corridors</h3>
      <table><thead><tr><th>From</th><th>To</th><th>Volume (trips/day)</th><th>Primary Route</th></tr></thead><tbody>
        <tr><td>Hitech City</td><td>Ameerpet</td><td>8,200</td><td>Route 10H / 65X</td></tr>
        <tr><td>Kukatpally</td><td>Hitech City</td><td>7,400</td><td>Route 5K / 49M</td></tr>
        <tr><td>Miyapur</td><td>Gachibowli</td><td>6,100</td><td>Route 7G / MF-3</td></tr>
        <tr><td>Secunderabad</td><td>Charminar</td><td>6,800</td><td>Route 218D / 12C</td></tr>
      </tbody></table>`;
  }

  if (reportType === 'school_safety') {
    const d = data as Record<string, unknown>;
    const zones = (d.zones as Array<{id:string;name:string;alertTimes:string;radius:number}>) ?? [];
    body = `
      <div class="summary-grid">
        <div class="stat-box"><div class="stat-val">${d.totalZones}</div><div class="stat-lbl">Monitored Zones</div></div>
        <div class="stat-box"><div class="stat-val">${d.zoneIncidents}</div><div class="stat-lbl">Zone Incidents</div></div>
        <div class="stat-box"><div class="stat-val">${d.speeding}</div><div class="stat-lbl">Speeding Detections</div></div>
        <div class="stat-box"><div class="stat-val">${d.pedestrian}</div><div class="stat-lbl">Pedestrian Hazards</div></div>
      </div>
      <h3>School Zone Registry — Hyderabad Metropolitan Region</h3>
      <table><thead><tr><th>Zone ID</th><th>Institution Name</th><th>Alert Windows</th><th>Monitoring Radius</th></tr></thead><tbody>
        ${zones.map((z) => `<tr><td class="mono">${esc(z.id)}</td><td>${esc(z.name)}</td><td>${esc(z.alertTimes)}</td><td>${esc(z.radius)} m</td></tr>`).join('')}
      </tbody></table>
      <h3>Compliance Recommendations</h3>
      <table><thead><tr><th>#</th><th>Recommendation</th><th>Authority</th><th>Priority</th></tr></thead><tbody>
        <tr><td>1</td><td>Deploy speed calming measures (humps / rumble strips) at all 6 zones</td><td>GHMC Traffic Eng.</td><td>High</td></tr>
        <tr><td>2</td><td>Install CCTV with ANPR at school entry/exit gates</td><td>TS Traffic Police</td><td>High</td></tr>
        <tr><td>3</td><td>Refresh zebra crossing markings on all school gate approaches</td><td>GHMC Roads</td><td>Medium</td></tr>
        <tr><td>4</td><td>Deploy traffic marshals during school opening/closing hours</td><td>TS Traffic Police</td><td>Medium</td></tr>
        <tr><td>5</td><td>School bus parking bays to prevent footpath obstruction</td><td>GHMC + Schools</td><td>Low</td></tr>
      </tbody></table>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${title}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family: "Segoe UI", Arial, sans-serif; font-size:12px; color:#0F172A; background:#fff; padding:24px 32px; }
  /* ── Official header ── */
  .header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:20px; padding-bottom:16px; border-bottom:3px solid #0F766E; }
  .header-left h1 { font-size:18px; font-weight:700; color:#0F172A; margin-bottom:4px; }
  .header-left .subtitle { font-size:11px; color:#475569; }
  .header-right { text-align:right; font-size:10px; color:#64748B; line-height:1.7; }
  .header-right strong { color:#0F172A; }
  .emblem { font-size:28px; margin-bottom:6px; }
  /* ── Report meta ── */
  .meta-bar { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px; padding:12px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:6px; }
  .meta-item label { font-size:10px; font-weight:600; color:#64748B; text-transform:uppercase; letter-spacing:.06em; display:block; margin-bottom:2px; }
  .meta-item span  { font-size:12px; font-weight:500; color:#0F172A; }
  /* ── Summary grid ── */
  .summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
  .stat-box { padding:14px 16px; border:1px solid #E2E8F0; border-radius:6px; text-align:center; }
  .stat-val { font-size:26px; font-weight:700; color:#0F172A; line-height:1; margin-bottom:4px; }
  .stat-lbl { font-size:10px; color:#64748B; font-weight:500; }
  /* ── Section headings ── */
  h3 { font-size:13px; font-weight:700; color:#0F172A; margin:18px 0 10px; padding-bottom:6px; border-bottom:1px solid #E2E8F0; }
  /* ── Table ── */
  table { width:100%; border-collapse:collapse; margin-bottom:16px; }
  thead th { background:#F1F5F9; padding:8px 10px; text-align:left; font-size:11px; font-weight:600; color:#475569; border:1px solid #E2E8F0; }
  tbody td { padding:7px 10px; font-size:11px; color:#0F172A; border:1px solid #E2E8F0; vertical-align:top; }
  tbody tr:nth-child(even) td { background:#F8FAFC; }
  .mono  { font-family:"Courier New", monospace; }
  .bold  { font-weight:700; }
  /* ── Footer ── */
  .note { font-size:10px; color:#64748B; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:4px; padding:8px 10px; margin-top:8px; }
  .footer { margin-top:32px; padding-top:12px; border-top:1px solid #E2E8F0; display:flex; justify-content:space-between; font-size:10px; color:#94A3B8; }
  @media print { body { padding:16px 20px; } .meta-bar { break-inside:avoid; } table { break-inside:auto; } }
</style>
</head>
<body>

<!-- Official Header -->
<div class="header">
  <div class="header-left">
    <div class="emblem">🏛️</div>
    <h1>${esc(title)}</h1>
    <div class="subtitle">
      Government of Telangana — TGSRTC Urban Intelligence Platform<br/>
      NAVIK · Smart India Hackathon PS #26124 · BEL
    </div>
  </div>
  <div class="header-right">
    <strong>Issued by</strong><br/>
    Telangana State Road Transport Corporation<br/>
    Operations Control Centre, Hyderabad<br/>
    <br/>
    <strong>For official use only</strong>
  </div>
</div>

<!-- Report Metadata -->
<div class="meta-bar">
  <div class="meta-item"><label>Report type</label><span>${esc(title)}</span></div>
  <div class="meta-item"><label>Period</label><span>${esc(dateFrom)} to ${esc(dateTo)}</span></div>
  <div class="meta-item"><label>Region</label><span>Hyderabad Metropolitan Region</span></div>
  <div class="meta-item"><label>Generated</label><span>${esc(genDate)}</span></div>
</div>

<!-- Body content -->
${body}

<!-- Footer -->
<div class="footer">
  <span>NAVIK Urban Intelligence Platform · TGSRTC · GHMC · TS Traffic Police</span>
  <span>Generated: ${esc(genDate)} · Confidential — For authorised personnel only</span>
</div>

</body>
</html>`;
}

// ── Download helper ────────────────────────────────────────
function downloadHTML(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Main ReportsView ───────────────────────────────────────
export function ReportsView() {
  const [reportType, setReportType] = useState('infrastructure_deficiency');
  const [dateFrom,   setDateFrom]   = useState(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
  const [dateTo,     setDateTo]     = useState(new Date().toISOString().slice(0, 10));
  const [loading,    setLoading]    = useState(false);
  const [generated,  setGenerated]  = useState(false);

  const addToast    = useNavikStore((s) => s.addToast);
  const incidents   = useNavikStore((s) => s.incidents);
  const defects     = useNavikStore((s) => s.defects);
  const buses       = useNavikStore((s) => s.buses);
  const workOrders  = useNavikStore((s) => s.workOrders);
  const schoolZones = useNavikStore((s) => s.schoolZones);
  const trafficSegs = useNavikStore((s) => s.trafficSegments);
  const kpis        = useNavikStore((s) => s.kpis);
  const advisories  = useNavikStore((s) => s.advisories);

  const type = REPORT_TYPES.find((r) => r.id === reportType);

  function generate() {
    setLoading(true);
    setGenerated(false);
    setTimeout(() => {
      setLoading(false);
      setGenerated(true);
      addToast({ type: 'success', title: 'Report ready', message: `${type?.short} report generated.` });
    }, 900);
  }

  function handleDownload() {
    // Build data payload for the selected report type
    let data: Record<string, unknown> = {};

    if (reportType === 'infrastructure_deficiency') {
      const categories = ['pothole','waterlogging','missing_signboard','missing_divider','missing_zebra_crossing','damaged_road'];
      data = {
        defects,
        workOrders,
        pending:  defects.filter(d => d.status === 'pending' || d.status === 'under_review').length,
        resolved: defects.filter(d => d.status === 'resolved').length,
        topDefects: categories.map((cat) => {
          const all  = defects.filter(d => d.category === cat);
          const pend = all.filter(d => d.status !== 'resolved').length;
          return { category: cat.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()), count: all.length, pending: pend };
        }),
      };
    } else if (reportType === 'incident_summary') {
      data = {
        total:     incidents.length,
        hitRun:    incidents.filter(i => i.type === 'hit_and_run').length,
        schoolZone: incidents.filter(i => i.type === 'school_zone_alert').length,
        resolved:  incidents.filter(i => i.status === 'resolved').length,
        hitRunRows: incidents
          .filter(i => i.type === 'hit_and_run')
          .slice(0, 10)
          .map(i => ({
            id:       i.id,
            plate:    i.plateNumber ?? '—',
            location: i.locationLabel,
            conf:     i.plateConfidence ? `${i.plateConfidence}%` : '—',
            status:   i.status,
          })),
      };
    } else if (reportType === 'fleet_performance') {
      const edgeNodes = useNavikStore.getState().edgeNodes;
      const online    = edgeNodes.filter(n => n.uplinkStatus === 'online').length;
      const camAll    = buses.flatMap(b => b.cameras);
      data = {
        total:       buses.length,
        active:      buses.filter(b => b.status === 'active').length,
        idle:        buses.filter(b => b.status === 'idle').length,
        maintenance: buses.filter(b => b.status === 'maintenance').length,
        offline:     buses.filter(b => b.status === 'offline').length,
        uptime:      Math.round(buses.filter(b => b.status === 'active').length / buses.length * 100),
        defects:     defects.length,
        camOnline:   camAll.filter(c => c.status === 'online').length,
        camDegraded: camAll.filter(c => c.status === 'degraded').length,
        camOffline:  camAll.filter(c => c.status === 'offline').length,
        edgeOnline:  online,
      };
    } else if (reportType === 'traffic_analytics') {
      data = {
        avgDelay:   kpis.avgRouteDelay,
        advisories: advisories.length,
        activeBuses: buses.filter(b => b.status === 'active').length,
        topOD:       '8,200 trips/day',
        segments:   trafficSegs.map(s => ({ name: s.name, score: s.congestionScore, speed: s.avgSpeed, delay: s.delay })),
      };
    } else if (reportType === 'school_safety') {
      data = {
        totalZones:  schoolZones.length,
        zoneIncidents: incidents.filter(i => i.type === 'school_zone_alert').length,
        speeding:    incidents.filter(i => i.type === 'school_zone_alert' && i.severity === 'critical').length,
        pedestrian:  incidents.filter(i => i.type === 'pedestrian_hazard').length,
        zones: schoolZones.map(sz => ({
          id: sz.id, name: sz.name,
          alertTimes: sz.alertTimes.map(t => `${t.start}–${t.end}`).join(', '),
          radius: sz.radius,
        })),
      };
    }

    const html     = buildReportHTML({ reportType, dateFrom, dateTo, data });
    const safeName = `NAVIK_${type?.short.replace(/\s+/g,'_')}_${dateFrom}_to_${dateTo}.html`;
    downloadHTML(html, safeName);
    addToast({ type: 'success', title: 'Download started', message: `${safeName} — open in browser and Print → Save as PDF` });
  }

  // Summary stats for preview cards
  const previewStats: Record<string, Array<{label:string;value:string|number;color:string}>> = {
    infrastructure_deficiency: [
      { label: 'Total defects',   value: defects.length,                                             color: '#0F172A' },
      { label: 'Potholes',        value: defects.filter(d=>d.category==='pothole').length,           color: '#B42318' },
      { label: 'Waterlogging',    value: defects.filter(d=>d.category==='waterlogging').length,      color: '#1D4ED8' },
      { label: 'Work orders',     value: workOrders.length,                                          color: '#A16207' },
    ],
    incident_summary: [
      { label: 'Total incidents', value: incidents.length,                                            color: '#0F172A' },
      { label: 'Hit & Run',       value: incidents.filter(i=>i.type==='hit_and_run').length,         color: '#B42318' },
      { label: 'School zone',     value: incidents.filter(i=>i.type==='school_zone_alert').length,   color: '#A16207' },
      { label: 'Resolved',        value: incidents.filter(i=>i.status==='resolved').length,          color: '#15803D' },
    ],
    fleet_performance: [
      { label: 'Total buses',     value: buses.length,                                               color: '#0F172A' },
      { label: 'Active',          value: buses.filter(b=>b.status==='active').length,                color: '#15803D' },
      { label: 'Fleet uptime',    value: `${Math.round(buses.filter(b=>b.status==='active').length/buses.length*100)}%`, color: '#0F766E' },
      { label: 'Defects reported',value: defects.length,                                             color: '#A16207' },
    ],
    traffic_analytics: [
      { label: 'Avg delay',       value: `${kpis.avgRouteDelay} min`,                               color: '#A16207' },
      { label: 'Advisories',      value: advisories.length,                                         color: '#0F766E' },
      { label: 'Active buses',    value: buses.filter(b=>b.status==='active').length,               color: '#0F172A' },
      { label: 'BW saved',        value: `${kpis.bandwidthSavedGB} GB`,                            color: '#1D4ED8' },
    ],
    school_safety: [
      { label: 'School zones',    value: schoolZones.length,                                        color: '#0F172A' },
      { label: 'Zone incidents',  value: incidents.filter(i=>i.type==='school_zone_alert').length,  color: '#A16207' },
      { label: 'Pedestrian haz.', value: incidents.filter(i=>i.type==='pedestrian_hazard').length, color: '#B42318' },
      { label: 'Resolved',        value: incidents.filter(i=>i.type==='school_zone_alert'&&i.status==='resolved').length, color: '#15803D' },
    ],
  };

  const stats = previewStats[reportType] ?? [];

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--canvas)' }}>
      {/* ── Left panel ── */}
      <div style={{ width: 272, flexShrink: 0, borderRight: '1px solid var(--border)', overflow: 'auto', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={14} color="var(--accent)" />
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Generate Report</span>
        </div>

        <div style={{ padding: '12px 14px', flex: 1 }}>
          {/* Report type */}
          <div style={{ marginBottom: 14 }}>
            <div className="form-label">Report type</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {REPORT_TYPES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { setReportType(r.id); setGenerated(false); }}
                  style={{
                    textAlign: 'left', padding: '8px 10px', borderRadius: 8,
                    border: `1px solid ${reportType === r.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: reportType === r.id ? 'var(--accent-soft)' : 'var(--surface-2)',
                    cursor: 'pointer', transition: 'all 0.12s',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: reportType === r.id ? 'var(--accent)' : 'var(--ink)' }}>
                    {r.short}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div style={{ marginBottom: 16 }}>
            <div className="form-label">Period</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <input type="date" className="form-input" style={{ height: 34, fontSize: 13 }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <input type="date" className="form-input" style={{ height: 34, fontSize: 13 }} value={dateTo}   onChange={(e) => setDateTo(e.target.value)}   />
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-primary btn-full" onClick={generate} disabled={loading}>
              {loading
                ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' } as React.CSSProperties} /> Generating…</>
                : <><FileText size={13} /> Generate Report</>}
            </button>
            {generated && (
              <button
                className="btn btn-secondary btn-full"
                onClick={handleDownload}
                title="Downloads an HTML file — open in browser then Print → Save as PDF"
              >
                <Download size={13} /> Download as PDF
              </button>
            )}
          </div>

          {generated && (
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
              Opens as HTML. In your browser press <strong>Ctrl+P → Save as PDF</strong> to get a proper PDF.
            </p>
          )}
        </div>
      </div>

      {/* ── Right: preview ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', background: 'var(--canvas)' }}>
        {!generated && !loading && (
          <div className="empty-state" style={{ height: '100%' }}>
            <FileText size={36} />
            <h4>No report generated yet</h4>
            <p>Select a report type and period, then click Generate Report.</p>
          </div>
        )}
        {loading && (
          <div className="empty-state" style={{ height: '100%' }}>
            <div className="skeleton" style={{ width: 200, height: 18, marginBottom: 10 }} />
            <div className="skeleton" style={{ width: '80%', height: 13 }} />
            <div className="skeleton" style={{ width: '70%', height: 13, marginTop: 8 }} />
            <div className="skeleton" style={{ width: '60%', height: 13, marginTop: 8 }} />
          </div>
        )}
        {generated && !loading && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>

            {/* Official-style preview header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid var(--accent)' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 4 }}>
                  Government of Telangana · TGSRTC
                </div>
                <h2 style={{ fontSize: 18, color: 'var(--ink)', marginBottom: 4 }}>{type?.label}</h2>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Period: {dateFrom} to {dateTo} · Hyderabad Metropolitan Region
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--muted)', lineHeight: 1.7 }}>
                <div style={{ fontWeight: 600, color: 'var(--ink-2)' }}>Nodal Authorities</div>
                TGSRTC · GHMC · TS Traffic Police<br />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>SIH PS #26124 · BEL</span>
              </div>
            </div>

            {/* Summary stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
              {stats.map(({ label, value, color }) => (
                <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 26, color, lineHeight: 1, marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Preview note */}
            <div style={{ padding: '12px 16px', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 8, fontSize: 13, color: 'var(--accent)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Download size={14} />
              <span>
                <strong>Download</strong> to get the full official report with all tables, authority mapping and recommendations. Open the downloaded file in your browser and press <strong>Ctrl+P → Save as PDF</strong>.
              </span>
            </div>

            {/* Responsible authority quick table */}
            <div className="panel" style={{ marginBottom: 20 }}>
              <div className="panel-header"><h3 style={{ fontSize: 14 }}>Responsible authorities</h3></div>
              <table className="data-table">
                <thead><tr><th>Agency</th><th>Scope</th><th>Contact</th></tr></thead>
                <tbody>
                  <tr><td>TGSRTC</td><td>Fleet operations, edge camera data, route management</td><td>OCC, Musheerabad</td></tr>
                  <tr><td>GHMC Roads &amp; Buildings</td><td>Pothole repair, road markings, signage</td><td>Circle offices</td></tr>
                  <tr><td>TS Traffic Police</td><td>Enforcement, ANPR evidence, FIR</td><td>Traffic HQ, Basheerbagh</td></tr>
                  <tr><td>HMWS&amp;SB</td><td>Waterlogging, stormwater drainage</td><td>HMWS&amp;SB Head Office</td></tr>
                </tbody>
              </table>
            </div>

            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--muted)' }}>
              Generated by NAVIK AI Platform · {new Date().toLocaleString('en-IN')} · Data: TGSRTC fleet telemetry + GHMC infrastructure records + TS Traffic Police ANPR · For official use only
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
