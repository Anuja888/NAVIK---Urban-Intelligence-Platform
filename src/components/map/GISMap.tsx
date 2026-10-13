import { useEffect, useRef } from 'react';
import * as React from 'react';
import { MapContainer, TileLayer, Polyline, useMap, Circle, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { useNavikStore } from '../../store/navikStore';
import { severityColor, incidentTypeLabel, busStatusColor, defectCategoryLabel, formatTime } from '../ui/helpers';
import type { Bus, Incident, RoadDefect } from '../../types';

// ── SVG marker factories ───────────────────────────────────
function makeBusIcon(bus: Bus): L.DivIcon {
  const color = busStatusColor(bus.status);
  const isActive = bus.status === 'active';
  // Heading arrow direction
  const rad  = (bus.heading * Math.PI) / 180;
  const ax   = 18 + Math.sin(rad) * 10;
  const ay   = 18 - Math.cos(rad) * 10;
  const svg = `
    <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="16" fill="${color}1A" stroke="${color}" stroke-width="1.5"/>
      <rect x="11" y="12" width="14" height="10" rx="2" fill="${color}" opacity="0.9"/>
      <rect x="12" y="14" width="4" height="3" rx="0.8" fill="#05080e" opacity="0.55"/>
      <rect x="20" y="14" width="4" height="3" rx="0.8" fill="#05080e" opacity="0.55"/>
      <circle cx="14" cy="23" r="2" fill="${color}" stroke="#05080e" stroke-width="1"/>
      <circle cx="22" cy="23" r="2" fill="${color}" stroke="#05080e" stroke-width="1"/>
      ${isActive ? `<line x1="18" y1="18" x2="${ax.toFixed(1)}" y2="${ay.toFixed(1)}" stroke="${color}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>` : ''}
      ${isActive ? `<circle cx="18" cy="10" r="3" fill="#2ec4a0" stroke="#05080e" stroke-width="1"/>` : ''}
    </svg>`;
  return L.divIcon({
    className: '',
    html: `<div style="cursor:pointer;filter:drop-shadow(0 2px 6px ${color}66)">${svg}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function makeIncidentIcon(incident: Incident): L.DivIcon {
  const color = severityColor(incident.severity);
  const isNew = incident.status === 'new';
  const pulse = isNew
    ? `<circle cx="18" cy="18" r="16" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.5" style="animation:pulse-ring 1.5s ease-out infinite"/>`
    : '';
  const svg = `
    <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      ${pulse}
      <polygon points="18,5 33,30 3,30" fill="${color}CC" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>
      <text x="18" y="25" text-anchor="middle" font-size="13" fill="#05080e" font-weight="bold" font-family="sans-serif">!</text>
    </svg>`;
  return L.divIcon({
    className: '',
    html: `<div title="${incidentTypeLabel(incident.type)}" style="cursor:pointer;filter:drop-shadow(0 2px 8px ${color}88)">${svg}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 30],
  });
}

function makeDefectIcon(defect: RoadDefect): L.DivIcon {
  const color = severityColor(defect.severity);
  // Category-specific shape hint
  const shape = defect.category === 'pothole' ? '●' :
    defect.category === 'waterlogging' ? '◆' :
    defect.category === 'missing_signboard' ? '▲' : '■';
  const svg = `
    <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="24" height="24" rx="5" fill="${color}1A" stroke="${color}" stroke-width="1.5"/>
      <text x="14" y="19" text-anchor="middle" font-size="12" fill="${color}" font-family="sans-serif">${shape}</text>
    </svg>`;
  return L.divIcon({
    className: '',
    html: `<div title="${defectCategoryLabel(defect.category)}" style="cursor:pointer;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">${svg}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

// ── Heatmap layer ──────────────────────────────────────────
function HeatmapLayer() {
  const map        = useMap();
  const heatPoints = useNavikStore((s) => s.heatPoints);
  const layerRef   = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (layerRef.current) map.removeLayer(layerRef.current);
    const pts = heatPoints.map((p) => [p.lat, p.lng, p.intensity] as [number, number, number]);
    layerRef.current = (L as any).heatLayer(pts, {
      radius: 30, blur: 20, maxZoom: 14,
      gradient: { 0.2: '#2ec4a0', 0.45: '#f5b83d', 0.7: '#ff8c42', 1.0: '#ff5c5c' },
    }).addTo(map);
    return () => { if (layerRef.current) map.removeLayer(layerRef.current!); };
  }, [map, heatPoints]);
  return null;
}

// ── OD Flow lines ──────────────────────────────────────────
function ODFlowLayer() {
  const flows  = useNavikStore((s) => s.odFlows);
  const maxVol = Math.max(...flows.map((f) => f.volume), 1);
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const odColor = isDark ? '#2DD4BF' : '#0F766E';
  return (
    <>
      {flows.map((f, i) => (
        <Polyline
          key={i}
          positions={[[f.fromPos.lat, f.fromPos.lng], [f.toPos.lat, f.toPos.lng]]}
          pathOptions={{
            color: odColor,
            weight: Math.max(1.5, (f.volume / maxVol) * 8),
            opacity: 0.6,
            dashArray: '6 4',
          }}
        >
          <Popup>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, padding: '8px 10px' }}>
              <strong style={{ color: 'var(--ink)' }}>{f.from} → {f.to}</strong>
              <div style={{ marginTop: 4, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                {f.volume.toLocaleString()} trips/day
              </div>
            </div>
          </Popup>
        </Polyline>
      ))}
    </>
  );
}

// ── Bus markers (imperative for performance) ───────────────
function BusMarkers() {
  const buses        = useNavikStore((s) => s.buses);
  const activeLayers = useNavikStore((s) => s.activeLayers);
  const selectBus    = useNavikStore((s) => s.selectBus);
  const map          = useMap();
  const markersRef   = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!activeLayers.has('buses')) {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      return;
    }
    const existing = new Set(markersRef.current.keys());
    buses.forEach((bus) => {
      existing.delete(bus.id);
      const icon = makeBusIcon(bus);
      if (markersRef.current.has(bus.id)) {
        const m = markersRef.current.get(bus.id)!;
        m.setLatLng([bus.position.lat, bus.position.lng]);
        m.setIcon(icon);
      } else {
        const m = L.marker([bus.position.lat, bus.position.lng], { icon })
          .addTo(map)
          .bindTooltip(
            `<strong>${bus.routeNumber}</strong> · ${bus.driverName}<br/>${bus.speed} km/h · ${bus.id}`,
            { className: 'leaflet-tooltip', direction: 'top', offset: [0, -20] }
          );
        m.on('click', () => selectBus(bus.id));
        markersRef.current.set(bus.id, m);
      }
    });
    existing.forEach((id) => { markersRef.current.get(id)?.remove(); markersRef.current.delete(id); });
  }, [buses, activeLayers, map, selectBus]);

  useEffect(() => () => { markersRef.current.forEach((m) => m.remove()); }, []);
  return null;
}

// ── Incident markers ───────────────────────────────────────
function IncidentMarkers() {
  const incidents    = useNavikStore((s) => s.incidents);
  const activeLayers = useNavikStore((s) => s.activeLayers);
  const selectIncident = useNavikStore((s) => s.selectIncident);
  const map          = useMap();
  const markersRef   = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!activeLayers.has('incidents')) {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      return;
    }
    const existing = new Set(markersRef.current.keys());
    const visible  = incidents.filter((i) => i.status !== 'resolved');
    visible.forEach((inc) => {
      existing.delete(inc.id);
      const icon = makeIncidentIcon(inc);
      if (markersRef.current.has(inc.id)) {
        markersRef.current.get(inc.id)!.setIcon(icon);
      } else {
        const m = L.marker([inc.position.lat, inc.position.lng], { icon, zIndexOffset: 100 })
          .addTo(map)
          .bindTooltip(`<strong>${incidentTypeLabel(inc.type)}</strong><br/>${inc.locationLabel}<br/>${formatTime(inc.timestamp)}`,
            { direction: 'top', offset: [0, -30] });
        m.on('click', () => selectIncident(inc.id));
        markersRef.current.set(inc.id, m);
      }
    });
    existing.forEach((id) => { markersRef.current.get(id)?.remove(); markersRef.current.delete(id); });
  }, [incidents, activeLayers, map, selectIncident]);

  useEffect(() => () => { markersRef.current.forEach((m) => m.remove()); }, []);
  return null;
}

// ── Defect markers ─────────────────────────────────────────
function DefectMarkers() {
  const defects      = useNavikStore((s) => s.defects);
  const activeLayers = useNavikStore((s) => s.activeLayers);
  const selectDefect = useNavikStore((s) => s.selectDefect);
  const map          = useMap();
  const markersRef   = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!activeLayers.has('defects')) {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      return;
    }
    const existing = new Set(markersRef.current.keys());
    const visible  = defects.filter((d) => d.status !== 'resolved');
    visible.forEach((def) => {
      existing.delete(def.id);
      const icon = makeDefectIcon(def);
      if (markersRef.current.has(def.id)) {
        markersRef.current.get(def.id)!.setIcon(icon);
      } else {
        const m = L.marker([def.position.lat, def.position.lng], { icon })
          .addTo(map)
          .bindTooltip(`<strong>${defectCategoryLabel(def.category)}</strong><br/>${def.locationLabel}`, { direction: 'top', offset: [0, -14] });
        m.on('click', () => selectDefect(def.id));
        markersRef.current.set(def.id, m);
      }
    });
    existing.forEach((id) => { markersRef.current.get(id)?.remove(); markersRef.current.delete(id); });
  }, [defects, activeLayers, map, selectDefect]);

  useEffect(() => () => { markersRef.current.forEach((m) => m.remove()); }, []);
  return null;
}

// ── School zones ───────────────────────────────────────────
function SchoolZoneMarkers() {
  const zones        = useNavikStore((s) => s.schoolZones);
  const activeLayers = useNavikStore((s) => s.activeLayers);
  if (!activeLayers.has('school_zones')) return null;
  return (
    <>
      {zones.map((z) => (
        <Circle key={z.id} center={[z.position.lat, z.position.lng]} radius={z.radius}
          pathOptions={{ color: '#f5b83d', fillColor: '#f5b83d', fillOpacity: 0.08, weight: 1.5, dashArray: '5 4' }}>
          <Popup>
            <div style={{ padding: '8px 10px', fontFamily: 'var(--font-ui)', fontSize: 13 }}>
              <strong>🏫 {z.name}</strong>
              <div style={{ marginTop: 4, color: 'var(--ink-2)', fontSize: 12 }}>
                Alert: {z.alertTimes.map((t) => `${t.start}–${t.end}`).join(', ')}
              </div>
            </div>
          </Popup>
        </Circle>
      ))}
    </>
  );
}

// ── Route polylines ────────────────────────────────────────
function RoutePolylines() {
  const buses        = useNavikStore((s) => s.buses);
  const activeLayers = useNavikStore((s) => s.activeLayers);
  if (!activeLayers.has('buses')) return null;
  const seen = new Set<string>();
  return (
    <>
      {buses.map((bus) => {
        if (seen.has(bus.routeNumber)) return null;
        seen.add(bus.routeNumber);
        return (
          <Polyline key={bus.routeNumber}
            positions={bus.routePolyline.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: 'rgba(255,255,255,0.08)', weight: 2, dashArray: '4 6' }} />
        );
      })}
    </>
  );
}

// ── Pursuit trail layer ────────────────────────────────────
function PursuitTrailLayer() {
  const pursuitSessions = useNavikStore((s) => s.pursuitSessions);
  const activeLayers    = useNavikStore((s) => s.activeLayers);
  const map             = useMap();
  const markersRef      = useRef<L.Layer[]>([]);

  useEffect(() => {
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    if (!activeLayers.has('pursuit_trail')) return;

    pursuitSessions.forEach((session) => {
      if (session.sightings.length < 2) return;
      const coords = session.sightings.map((s) => [s.position.lat, s.position.lng] as [number, number]);
      const line = L.polyline(coords, {
        color: '#ff5c5c', weight: 2.5, dashArray: '6 4', opacity: 0.85,
      }).addTo(map);
      markersRef.current.push(line);

      // Numbered pins
      session.sightings.forEach((sighting, i) => {
        const pin = L.marker([sighting.position.lat, sighting.position.lng], {
          icon: L.divIcon({
            className: '',
            html: `<div style="width:22px;height:22px;border-radius:50%;background:#ff5c5c;border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700;font-family:monospace">${i+1}</div>`,
            iconSize: [22, 22], iconAnchor: [11, 11],
          }),
        }).addTo(map);
        markersRef.current.push(pin);
      });

      // Predicted route
      if (session.predictedRoute.length > 1) {
        const predicted = L.polyline(
          session.predictedRoute.map((p) => [p.lat, p.lng] as [number, number]),
          { color: '#ff5c5c', weight: 2, dashArray: '3 8', opacity: 0.5 }
        ).addTo(map);
        markersRef.current.push(predicted);
      }
    });
  }, [pursuitSessions, activeLayers, map]);

  useEffect(() => () => { markersRef.current.forEach((m) => map.removeLayer(m)); }, []);
  return null;
}

// ── Layer popover (replaces 7 chips with single button) ────
const LAYER_DEFS = [
  { id: 'buses'         as const, label: 'Buses',    hexL: '#15803D', hexD: '#6EE7B7' },
  { id: 'incidents'     as const, label: 'Incidents',hexL: '#B42318', hexD: '#FDA29B' },
  { id: 'heatmap'       as const, label: 'Heatmap',  hexL: '#C2410C', hexD: '#FDBA74' },
  { id: 'defects'       as const, label: 'Defects',  hexL: '#A16207', hexD: '#FCD34D' },
  { id: 'school_zones'  as const, label: 'Schools',  hexL: '#A16207', hexD: '#FCD34D' },
  { id: 'od_flow'       as const, label: 'O-D Flow', hexL: '#0F766E', hexD: '#2DD4BF' },
  { id: 'pursuit_trail' as const, label: 'Pursuit',  hexL: '#B42318', hexD: '#FDA29B' },
];

function LayerPopover() {
  const activeLayers = useNavikStore((s) => s.activeLayers);
  const toggleLayer  = useNavikStore((s) => s.toggleLayer);
  const buses        = useNavikStore((s) => s.buses);
  const incidents    = useNavikStore((s) => s.incidents);
  const defects      = useNavikStore((s) => s.defects);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  React.useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const counts: Partial<Record<string, number>> = {
    buses:     buses.filter((b) => b.status === 'active').length,
    incidents: incidents.filter((i) => i.status !== 'resolved').length,
    defects:   defects.filter((d) => d.status !== 'resolved').length,
  };

  const activeCount = LAYER_DEFS.filter((l) => activeLayers.has(l.id)).length;

  return (
    <div ref={ref} style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 500 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 13px',
          background: isDark ? '#1B2433' : '#FFFFFF',
          border: `1px solid ${isDark ? '#2A3648' : '#E5E7EB'}`,
          borderRadius: 8, cursor: 'pointer',
          fontSize: 13, fontWeight: 500,
          color: isDark ? '#F1F5F9' : '#0F172A',
          boxShadow: '0 2px 8px rgba(15,23,42,0.10)',
          fontFamily: '"Plus Jakarta Sans", sans-serif',
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: isDark ? '#2DD4BF' : '#0F766E' }} />
        Layers {activeCount < LAYER_DEFS.length && <span style={{ fontSize: 11, color: isDark ? '#94A3B8' : '#64748B' }}>{activeCount}/{LAYER_DEFS.length}</span>}
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0, marginBottom: 6,
          background: isDark ? '#1B2433' : '#FFFFFF',
          border: `1px solid ${isDark ? '#2A3648' : '#E5E7EB'}`,
          borderRadius: 10, boxShadow: '0 4px 20px rgba(15,23,42,0.14)',
          padding: '6px', minWidth: 175,
        }}>
          {LAYER_DEFS.map((layer) => {
            const active = activeLayers.has(layer.id);
            const hex    = isDark ? layer.hexD : layer.hexL;
            const count  = counts[layer.id];
            return (
              <button key={layer.id} onClick={() => toggleLayer(layer.id)} style={{
                display: 'flex', alignItems: 'center', gap: 9,
                width: '100%', padding: '7px 10px',
                background: active ? (isDark ? '#232F42' : '#F1F4F8') : 'transparent',
                border: 'none', borderRadius: 7, cursor: 'pointer', textAlign: 'left',
                fontSize: 13, fontFamily: '"Plus Jakarta Sans", sans-serif',
                color: active ? (isDark ? '#F1F5F9' : '#0F172A') : (isDark ? '#94A3B8' : '#64748B'),
                transition: 'background 0.1s', marginBottom: 2,
              }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: active ? hex : (isDark ? '#3A4A63' : '#D1D5DB'), flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{layer.label}</span>
                {count !== undefined && active && <span style={{ fontSize: 11, fontFamily: '"JetBrains Mono", monospace' }}>{count}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Theme-aware tile selector ──────────────────────────────
function useMapTheme() {
  const [isDark, setIsDark] = React.useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark'
  );
  React.useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

// ── Main GIS Map ───────────────────────────────────────────
export function GISMap() {
  const activeLayers = useNavikStore((s) => s.activeLayers);
  const isDark = useMapTheme();

  // Both tile providers are 100% free, no API key required:
  // Dark  → Stadia Alidade Smooth Dark (free for localhost / non-commercial)
  // Light → OpenStreetMap standard (always free)
  const tileUrl = isDark
    ? 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const tileAttribution = isDark
    ? '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  // Light OSM tiles look better with a subtle CSS filter in light mode
  const tileClassName = isDark ? undefined : 'map-tiles-light';

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <LayerPopover />
      <MapContainer
        center={[17.4065, 78.4772]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        attributionControl={true}
        maxZoom={19}
        minZoom={10}
      >
        <TileLayer
          key={tileUrl}          /* force remount on theme change */
          url={tileUrl}
          attribution={tileAttribution}
          maxZoom={19}
          className={tileClassName}
        />

        <RoutePolylines />
        <BusMarkers />
        <IncidentMarkers />
        <DefectMarkers />
        <SchoolZoneMarkers />
        <PursuitTrailLayer />
        {activeLayers.has('heatmap') && <HeatmapLayer />}
        {activeLayers.has('od_flow') && <ODFlowLayer />}
      </MapContainer>
    </div>
  );
}
