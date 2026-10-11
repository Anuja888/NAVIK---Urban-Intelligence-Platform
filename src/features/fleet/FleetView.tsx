import { motion } from 'framer-motion';
import { Search, ChevronRight, Bus as BusIcon, Radio, Activity } from 'lucide-react';
import { useNavikStore } from '../../store/navikStore';
import { busStatusColor, busStatusLabel, formatRelative } from '../../components/ui/helpers';
import type { Bus } from '../../types';

const ROUTES_LIST = ['5K','10H','12C','27D','65X','218D','MF-1','MF-3','88A','142C','7G','33P','49M','E1','N3'];
const STATUS_KEYS: Bus['status'][] = ['active','idle','maintenance','offline'];

export function FleetView() {
  const buses        = useNavikStore((s) => s.buses);
  const busFilter    = useNavikStore((s) => s.busFilter);
  const setBusFilter = useNavikStore((s) => s.setBusFilter);
  const selectBus    = useNavikStore((s) => s.selectBus);
  const openLiveFeed = useNavikStore((s) => s.openLiveFeed);

  const filtered = buses.filter((b) => {
    if (busFilter.route  && b.routeNumber !== busFilter.route)  return false;
    if (busFilter.status && b.status       !== busFilter.status) return false;
    if (busFilter.search) {
      const q = busFilter.search.toLowerCase();
      return b.id.toLowerCase().includes(q) || b.routeNumber.toLowerCase().includes(q) || b.driverName.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = Object.fromEntries(STATUS_KEYS.map((s) => [s, buses.filter((b) => b.status === s).length])) as Record<Bus['status'], number>;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', background:'var(--bg)' }}>
      {/* Toolbar */}
      <div style={{ flexShrink:0, padding:'12px 20px', borderBottom:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:10 }}>
        {/* Status pills */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {STATUS_KEYS.map((status) => {
            const color  = busStatusColor(status);
            const active = busFilter.status === status;
            return (
              <button key={status} onClick={() => setBusFilter({ status: active?'':status })}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 12px', borderRadius:8, background:active?`${color}15`:'var(--surface-2)', border:`1px solid ${active?color+'40':'var(--border)'}`, color:active?color:'var(--text-muted)', cursor:'pointer', fontSize:'0.75rem', fontWeight:active?700:500, transition:'all 0.13s' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:color, boxShadow:active?`0 0 5px ${color}`:'none' }} />
                {busStatusLabel(status)} <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.625rem', opacity:0.8 }}>{counts[status]}</span>
              </button>
            );
          })}
          <span style={{ marginLeft:'auto', fontSize:'0.75rem', color:'var(--text-muted)', alignSelf:'center' }}>{buses.length} total</span>
        </div>
        {/* Search + route */}
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ flex:1, position:'relative' }}>
            <Search size={13} strokeWidth={2} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' } as React.CSSProperties} />
            <input className="form-input" style={{ paddingLeft:32, height:34, fontSize:'0.8125rem' }} placeholder="Search bus ID, route, driver…" value={busFilter.search} onChange={(e) => setBusFilter({ search:e.target.value })} />
          </div>
          <select className="form-select" style={{ width:130, height:34, fontSize:'0.8125rem' }} value={busFilter.route} onChange={(e) => setBusFilter({ route:e.target.value })}>
            <option value="">All Routes</option>
            {ROUTES_LIST.map((r) => <option key={r} value={r}>Route {r}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <BusIcon size={36} />
            <h4>No buses match your filters</h4>
            <button className="btn btn-secondary btn-sm" onClick={() => setBusFilter({ route:'',status:'',search:'' })}>Clear filters</button>
          </div>
        ) : (
          <table className="data-table">
            <thead><tr>{['Bus ID','Route','Driver','Status','Speed','Defects','Last Seen',''].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.map((bus, i) => {
                const color = busStatusColor(bus.status);
                return (
                  <motion.tr key={bus.id} className="row-clickable" initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:Math.min(i*0.015,0.3) }} onClick={() => selectBus(bus.id)}>
                    <td style={{ fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--text)' }}>{bus.id}</td>
                    <td><span className="badge badge-muted">{bus.routeNumber}</span></td>
                    <td style={{ color:'var(--text-2)' }}>{bus.driverName}</td>
                    <td>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:'0.75rem', fontWeight:600, color }}>
                        <span style={{ width:6, height:6, borderRadius:'50%', background:color, boxShadow:bus.status==='active'?`0 0 5px ${color}`:'none' }} />
                        {busStatusLabel(bus.status)}
                      </span>
                    </td>
                    <td style={{ fontFamily:'var(--font-mono)', color:bus.status==='active'?'var(--text-2)':'var(--surface-3)' }}>
                      {bus.status==='active'?`${Math.round(bus.speed)} km/h`:'—'}
                    </td>
                    <td style={{ fontFamily:'var(--font-mono)', fontWeight:bus.defectsReported>4?700:400, color:bus.defectsReported>4?'var(--warn)':'var(--text-muted)' }}>
                      {bus.defectsReported}
                    </td>
                    <td style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:'var(--text-muted)' }}>{formatRelative(bus.lastSeen)}</td>
                    <td>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <button className="btn btn-ghost btn-xs" style={{ color:'var(--accent)' }} onClick={(e) => { e.stopPropagation(); openLiveFeed(bus.id); }} title="Live feed">
                          <Radio size={11} />
                        </button>
                        <ChevronRight size={12} style={{ color:'var(--surface-3)' } as React.CSSProperties} />
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div style={{ flexShrink:0, padding:'8px 20px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:6 }}>
        <Activity size={10} style={{ color:'var(--surface-3)' } as React.CSSProperties} />
        <span style={{ fontSize:'0.625rem', color:'var(--surface-3)', fontFamily:'var(--font-mono)' }}>{filtered.length} / {buses.length} vehicles · TGSRTC Hyderabad Fleet</span>
      </div>
    </div>
  );
}
