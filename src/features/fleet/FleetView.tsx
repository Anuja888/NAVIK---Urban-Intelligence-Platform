import { Search, ChevronRight, Bus as BusIcon, Radio } from 'lucide-react';
import { useNavikStore } from '../../store/navikStore';
import { busStatusLabel, formatRelative } from '../../components/ui/helpers';
import type { Bus } from '../../types';

const ROUTES_LIST = ['5K','10H','12C','27D','65X','218D','MF-1','MF-3','88A','142C','7G','33P','49M','E1','N3'];
const STATUS_KEYS: Bus['status'][] = ['active','idle','maintenance','offline'];

// Hex versions of status colours for dot (CSS vars not reliable in inline SVG)
const STATUS_HEX: Record<Bus['status'], string> = {
  active:      '#15803D',
  idle:        '#A16207',
  maintenance: '#1D4ED8',
  offline:     '#B42318',
};

export function FleetView() {
  const buses        = useNavikStore((s) => s.buses);
  const busFilter    = useNavikStore((s) => s.busFilter);
  const setBusFilter = useNavikStore((s) => s.setBusFilter);
  const selectBus    = useNavikStore((s) => s.selectBus);
  const openLiveFeed = useNavikStore((s) => s.openLiveFeed);

  const filtered = buses.filter((b) => {
    if (busFilter.route  && b.routeNumber !== busFilter.route)  return false;
    if (busFilter.status && b.status      !== busFilter.status) return false;
    if (busFilter.search) {
      const q = busFilter.search.toLowerCase();
      return b.id.toLowerCase().includes(q) || b.routeNumber.toLowerCase().includes(q) || b.driverName.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = Object.fromEntries(
    STATUS_KEYS.map((s) => [s, buses.filter((b) => b.status === s).length])
  ) as Record<Bus['status'], number>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--canvas)' }}>

      {/* Toolbar */}
      <div style={{ flexShrink: 0, padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Status filter pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUS_KEYS.map((status) => {
            const hex    = STATUS_HEX[status];
            const active = busFilter.status === status;
            return (
              <button key={status}
                onClick={() => setBusFilter({ status: active ? '' : status })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 99,
                  background: active ? 'var(--accent-soft)' : 'var(--surface-2)',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  color: active ? 'var(--accent)' : 'var(--ink-2)',
                  cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400,
                  transition: 'all 0.12s',
                }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: hex, flexShrink: 0 }} />
                {busStatusLabel(status)}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{counts[status]}</span>
              </button>
            );
          })}
        </div>

        {/* Search + route */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={13} strokeWidth={2} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--placeholder)' } as React.CSSProperties} />
            <input className="form-input" style={{ paddingLeft: 32, height: 34 }}
              placeholder="Search bus ID, route, driver…"
              value={busFilter.search} onChange={(e) => setBusFilter({ search: e.target.value })} />
          </div>
          <select className="form-select" style={{ width: 128, height: 34 }}
            value={busFilter.route} onChange={(e) => setBusFilter({ route: e.target.value })}>
            <option value="">All routes</option>
            {ROUTES_LIST.map((r) => <option key={r} value={r}>Route {r}</option>)}
          </select>
          {(busFilter.route || busFilter.status || busFilter.search) && (
            <button className="btn btn-ghost btn-sm" onClick={() => setBusFilter({ route: '', status: '', search: '' })}>Clear</button>
          )}
        </div>
      </div>

      {/* Table — sticky header, 48px rows, no wrapping on IDs/speeds */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <BusIcon size={32} />
            <h4>No buses match filters</h4>
            <button className="btn btn-secondary btn-sm" onClick={() => setBusFilter({ route: '', status: '', search: '' })}>Clear filters</button>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {/* Sentence case, 13px — per spec */}
                {['Bus ID','Route','Driver','Status','Speed','Defects','Last seen',''].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((bus) => {
                const hex = STATUS_HEX[bus.status];
                return (
                  <tr key={bus.id} className="row-clickable" onClick={() => selectBus(bus.id)}>
                    {/* nowrap on ID and speed */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="mono tabnum" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{bus.id}</span>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{bus.routeNumber}</span>
                    </td>
                    <td style={{ color: 'var(--ink-2)', fontSize: 13 }}>{bus.driverName}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: hex, flexShrink: 0 }} />
                        {busStatusLabel(bus.status)}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="mono tabnum" style={{ fontSize: 13, color: 'var(--ink)' }}>
                        {bus.status === 'active' ? `${Math.round(bus.speed)} km/h` : '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 13, fontWeight: bus.defectsReported > 4 ? 600 : 400, color: bus.defectsReported > 4 ? 'var(--warn)' : 'var(--ink-2)' }}>
                        {bus.defectsReported}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatRelative(bus.lastSeen)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button className="btn btn-ghost btn-xs" style={{ color: 'var(--accent)' }}
                          onClick={(e) => { e.stopPropagation(); openLiveFeed(bus.id); }} title="Live feed">
                          <Radio size={12} />
                        </button>
                        <ChevronRight size={13} style={{ color: 'var(--muted)' } as React.CSSProperties} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div style={{ flexShrink: 0, padding: '8px 20px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--muted)', background: 'var(--surface)' }}>
        {filtered.length} / {buses.length} vehicles · TGSRTC Hyderabad
      </div>
    </div>
  );
}

import React from 'react';
