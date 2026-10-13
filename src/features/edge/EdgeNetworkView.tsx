import { useState } from 'react';
import { Cpu, Wifi, WifiOff, RefreshCw, Download, Sliders, BarChart2, AlertTriangle } from 'lucide-react';
import { useNavikStore } from '../../store/navikStore';
import type { EdgeNode } from '../../types';

// ── Constants for bandwidth calculation ───────────────────
const RAW_MBPS_PER_CAM = 4;   // 4 Mbps raw per camera
const NUM_CAMS          = 4;
const HOURS_PER_DAY     = 14; // operating hours

function calcBandwidth(policy: ReturnType<typeof useNavikStore.getState>['bandwidthPolicy']) {
  const rawMbPerDay  = RAW_MBPS_PER_CAM * NUM_CAMS * HOURS_PER_DAY * 3600 / 8 / 1024 / 1024; // GB
  // Uploaded = events × keyframes × avg frame size (quality filtered)
  const uploadRatio  = (100 - policy.minConfidenceToUpload) / 100 * 0.3 + 0.05; // fraction uploaded
  const uploadedGB   = rawMbPerDay * uploadRatio * (policy.keyframeCount / 5) * (policy.clipLengthSec / 8);
  const savedGB      = rawMbPerDay - uploadedGB;
  return { rawMbPerDay: Math.round(rawMbPerDay * 10) / 10, uploadedGB: Math.round(uploadedGB * 100) / 100, savedGB: Math.round(savedGB * 100) / 100 };
}

// ── Edge node tile ─────────────────────────────────────────
function EdgeNodeTile({ node, onDrop, onReconnect }: {
  node: EdgeNode;
  onDrop: (busId: string) => void;
  onReconnect: (busId: string) => void;
}) {
  const uplinkColors = { online: '#15803D', buffering: '#A16207', offline: '#B42318' };
  const uplinkColor  = uplinkColors[node.uplinkStatus];
  const camColors    = { online: '#15803D', degraded: '#A16207', offline: '#B42318' };
  const tempColor    = node.gpuTempC > 75 ? '#B42318' : node.gpuTempC > 60 ? '#A16207' : '#15803D';

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${node.uplinkStatus === 'offline' ? 'var(--danger)' : node.uplinkStatus === 'buffering' ? 'var(--warn)' : 'var(--border)'}`,
      borderRadius: 10,
      padding: '12px 14px',
      transition: 'border-color 0.2s',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{node.id}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{node.busId}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {node.uplinkStatus === 'offline'
            ? <WifiOff size={13} />
            : <Wifi size={13} />
          }
          <span style={{ fontSize: 11, fontWeight: 700, color: uplinkColor, textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            {node.uplinkStatus}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 10 }}>
        {[
          { label: 'FPS',      value: `${node.fps}`,               color: 'var(--accent)' },
          { label: 'GPU°C',    value: `${node.gpuTempC}°`,         color: tempColor },
          { label: 'Latency',  value: `${node.inferenceLatencyMs}ms`, color: 'var(--info)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--surface-2)', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color }}>{value}</div>
            <div style={{ fontSize: '0.5rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 1 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Camera dots */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
        {node.cameraStatuses.map((cam) => (
          <div key={cam.label} title={`${cam.label}: ${cam.status}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: camColors[cam.status], boxShadow: `0 0 5px ${camColors[cam.status]}66` }} />
            <span style={{ fontSize: '0.4375rem', color: 'var(--muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>{cam.label[0]}</span>
          </div>
        ))}
      </div>

      {/* Model version + queued */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: node.modelVersion === 'v2.4.0' ? 'var(--ok)' : 'var(--muted)' }}>
          {node.modelVersion}
        </span>
        {node.queuedEvents > 0 && (
          <span style={{ fontSize: 11, background: 'var(--warn-subtle)', color: 'var(--warn)', border: '1px solid rgba(245,184,61,0.25)', padding: '1px 6px', borderRadius: 999, fontFamily: 'var(--font-mono)' }}>
            {node.queuedEvents} queued
          </span>
        )}
      </div>

      {/* OTA progress */}
      {node.otaProgress !== null && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: 'var(--accent)' }}>OTA v2.4.0</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{node.otaProgress}%</span>
          </div>
          <div className="progress-bar progress-bar-striped">
            <div className="progress-bar-fill" style={{ width: `${node.otaProgress}%`, background: 'var(--accent)' }} />
          </div>
        </div>
      )}

      {node.otaError && (
        <div style={{ fontSize: 11, color: 'var(--danger)', background: 'var(--danger-subtle)', border: '1px solid rgba(255,92,92,0.25)', padding: '4px 8px', borderRadius: 6, marginBottom: 8 }}>
          ✗ {node.otaError}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        {node.uplinkStatus === 'online' && (
          <button className="btn btn-ghost btn-xs" style={{ fontSize: 11 }} onClick={() => onDrop(node.busId)}>
            <WifiOff size={10} /> Drop
          </button>
        )}
        {(node.uplinkStatus === 'offline' || node.uplinkStatus === 'buffering') && (
          <button className="btn btn-success btn-xs" style={{ fontSize: 11 }} onClick={() => onReconnect(node.busId)}>
            <RefreshCw size={10} /> Reconnect
          </button>
        )}
      </div>
    </div>
  );
}

export function EdgeNetworkView() {
  const edgeNodes            = useNavikStore((s) => s.edgeNodes);
  const bandwidthPolicy      = useNavikStore((s) => s.bandwidthPolicy);
  const updateBandwidthPolicy = useNavikStore((s) => s.updateBandwidthPolicy);
  const simulateNetworkDrop  = useNavikStore((s) => s.simulateNetworkDrop);
  const simulateReconnect    = useNavikStore((s) => s.simulateReconnect);
  const startOTAUpdate       = useNavikStore((s) => s.startOTAUpdate);
  const [selectedBusIds, setSelectedBusIds] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('');

  const _totalBandwidthSaved = edgeNodes.reduce((s, n) => s + n.bandwidthSavedMB, 0) / 1024;
  void _totalBandwidthSaved;
  const totalUploaded       = edgeNodes.reduce((s, n) => s + n.uploadedEventsToday, 0);
  const totalEvents         = edgeNodes.reduce((s, n) => s + n.totalEventsToday, 0);
  const offlineCount        = edgeNodes.filter((n) => n.uplinkStatus === 'offline').length;
  const bufferingCount      = edgeNodes.filter((n) => n.uplinkStatus === 'buffering').length;

  // Policy-based bandwidth calc for the hero metric
  const bwCalc        = edgeNodes.length > 0 ? calcBandwidth(bandwidthPolicy) : null;
  const fleetRawGB    = bwCalc ? bwCalc.rawMbPerDay * edgeNodes.length : 0;
  const fleetUploadGB = bwCalc ? bwCalc.uploadedGB * edgeNodes.length : 0;
  const fleetSavedGB  = fleetRawGB - fleetUploadGB;
  const savingPct     = fleetRawGB > 0 ? Math.round((fleetSavedGB / fleetRawGB) * 100) : 0;

  const filtered = edgeNodes.filter((n) => !filterStatus || n.uplinkStatus === filterStatus);

  function toggleBusSelect(busId: string) {
    setSelectedBusIds((prev) => prev.includes(busId) ? prev.filter((id) => id !== busId) : [...prev, busId]);
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--canvas)' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Cpu size={16} color="var(--accent)" />
        <h2 style={{ fontSize: 15, marginRight: 'auto' }}>Edge Network Console</h2>
        {/* Hero stats */}
        {[
          { label: 'Bandwidth Saved', value: `${fleetSavedGB.toFixed(1)} GB/day`, color: 'var(--accent)', sub: `${savingPct}% reduction` },
          { label: 'Events Today',    value: `${totalEvents}`,                    color: 'var(--ink-2)', sub: `${totalUploaded} uploaded` },
          { label: 'Offline',         value: `${offlineCount}`,                   color: offlineCount > 0 ? 'var(--danger)' : 'var(--ok)', sub: `${bufferingCount} buffering` },
        ].map(({ label, value, color, sub }) => (
          <div key={label} style={{ textAlign: 'center', minWidth: 100 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 18, color, letterSpacing: '-0.03em' }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: policy panel */}
        <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--border)', overflow: 'auto', padding: '16px' }}>
          {/* Bandwidth comparison */}
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="panel-header"><BarChart2 size={13} color="var(--accent)" /><span style={{ fontSize: 13, fontWeight: 600 }}>Bandwidth Comparison</span></div>
            <div style={{ padding: '14px' }}>
              {[
                { label: 'Raw (4 cams)',  value: fleetRawGB,    color: 'var(--danger)' },
                { label: 'Uploaded',      value: fleetUploadGB, color: 'var(--warn)' },
                { label: 'Saved',         value: fleetSavedGB,  color: 'var(--ok)' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color, fontWeight: 700 }}>{value.toFixed(1)} GB</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${Math.min(100, (value / fleetRawGB) * 100)}%`, background: color, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>
                Assumptions: {NUM_CAMS} cams × {RAW_MBPS_PER_CAM} Mbps raw · {HOURS_PER_DAY}h/day · {edgeNodes.length} buses
              </div>
            </div>
          </div>

          {/* Upload policy sliders */}
          <div className="panel" style={{ marginBottom: 16 }}>
            <div className="panel-header"><Sliders size={13} color="var(--accent)" /><span style={{ fontSize: 13, fontWeight: 600 }}>Upload Policy</span></div>
            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { key: 'minConfidenceToUpload' as const, label: 'Min Confidence to Upload', min: 50, max: 98, unit: '%', description: 'Only upload events above this confidence threshold' },
                { key: 'keyframeCount' as const,          label: 'Keyframes per Event',      min: 1,  max: 10, unit: ' frames', description: 'Number of keyframes captured per detection event' },
                { key: 'clipLengthSec' as const,          label: 'Clip Length',              min: 2,  max: 30, unit: 's', description: 'Duration of video clip uploaded per event' },
              ].map(({ key, label, min, max, unit, description }) => (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0 }}>{label}</label>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 700 }}>
                      {bandwidthPolicy[key]}{unit}
                    </span>
                  </div>
                  <input type="range" min={min} max={max} value={bandwidthPolicy[key]}
                    onChange={(e) => updateBandwidthPolicy({ [key]: Number(e.target.value) })}
                    style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* OTA update */}
          <div className="panel">
            <div className="panel-header"><Download size={13} color="var(--accent)" /><span style={{ fontSize: 13, fontWeight: 600 }}>OTA Update</span></div>
            <div style={{ padding: '14px' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
                Roll v2.3.1 → v2.4.0 · {edgeNodes.filter(n => n.modelVersion === 'v2.3.1').length} nodes on old version
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm btn-full" onClick={() => {
                  const targets = selectedBusIds.length > 0
                    ? selectedBusIds
                    : edgeNodes.filter(n => n.modelVersion === 'v2.3.1' && n.uplinkStatus === 'online').slice(0, 5).map(n => n.busId);
                  if (targets.length) startOTAUpdate(targets);
                }}>
                  <Download size={12} />
                  {selectedBusIds.length > 0 ? `Update ${selectedBusIds.length} Selected` : 'Update All Online (v2.3.1)'}
                </button>
              </div>
              {selectedBusIds.length > 0 && (
                <button className="btn btn-ghost btn-xs" style={{ marginTop: 6 }} onClick={() => setSelectedBusIds([])}>Clear selection</button>
              )}
            </div>
          </div>
        </div>

        {/* Right: node grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {/* Filter + select */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="form-select" style={{ width: 140, height: 32, fontSize: 13 }}
              value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option value="online">Online</option>
              <option value="buffering">Buffering</option>
              <option value="offline">Offline</option>
            </select>
            {offlineCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: 'var(--danger-subtle)', border: '1px solid rgba(255,92,92,0.25)' }}>
                <AlertTriangle size={12} color="var(--danger)" />
                <span style={{ fontSize: 12, color: 'var(--danger)' }}>{offlineCount} offline</span>
              </div>
            )}
            <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>
              {filtered.length} nodes · click to select for OTA
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {filtered.map((node) => (
              <div key={node.id} style={{ position: 'relative' }} onClick={() => toggleBusSelect(node.busId)}>
                {selectedBusIds.includes(node.busId) && (
                  <div style={{ position: 'absolute', inset: 0, borderRadius: 10, border: '2px solid var(--accent)', zIndex: 1, pointerEvents: 'none', boxShadow: 'var(--shadow-accent)' }} />
                )}
                <EdgeNodeTile
                  node={node}
                  onDrop={(id) => { simulateNetworkDrop(id); }}
                  onReconnect={(id) => { simulateReconnect(id); }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
