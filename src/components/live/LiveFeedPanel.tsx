import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Cpu, Wifi, MapPin, Gauge, ZapOff } from 'lucide-react';
import { useNavikStore } from '../../store/navikStore';

const DETECTION_CONFIGS = [
  { category: 'pothole',             color: '#EF4444', label: 'Pothole',      minConf: 82, maxConf: 97 },
  { category: 'vehicle_car',         color: '#3B82F6', label: 'Car',          minConf: 91, maxConf: 99 },
  { category: 'vehicle_two_wheeler', color: '#06B6D4', label: '2-Wheeler',    minConf: 88, maxConf: 97 },
  { category: 'vehicle_truck',       color: '#8B5CF6', label: 'Truck',        minConf: 93, maxConf: 99 },
  { category: 'pedestrian',          color: '#F59E0B', label: 'Pedestrian',   minConf: 84, maxConf: 96 },
  { category: 'waterlogging',        color: '#10B981', label: 'Waterlogging', minConf: 79, maxConf: 95 },
  { category: 'signboard_missing',   color: '#F97316', label: 'Missing Sign', minConf: 81, maxConf: 94 },
];

// Each camera has its own characteristic detection profile
const CAM_DETECTION_PROFILE: Record<string, string[]> = {
  Front:  ['vehicle_car', 'vehicle_two_wheeler', 'vehicle_truck', 'pedestrian', 'pothole'],
  Rear:   ['vehicle_car', 'vehicle_two_wheeler', 'vehicle_truck'],
  Left:   ['pedestrian', 'signboard_missing', 'pothole', 'waterlogging'],
  Right:  ['pedestrian', 'signboard_missing', 'waterlogging'],
  Cabin:  ['pedestrian'],
};

// Each camera has a different scene perspective
const CAM_SCENES: Record<string, string[]> = {
  Front: [
    'linear-gradient(180deg,#1a2540 0%,#1a2540 28%,#3d4a5c 28%,#3d4a5c 30%,#2d3748 30%,#2d3748 72%,#1e2535 72%)',
    'linear-gradient(180deg,#0c1322 0%,#162032 26%,#4a5568 26%,#4a5568 28%,#2d3748 28%,#2d3748 74%,#1a2030 74%)',
  ],
  Rear: [
    'linear-gradient(180deg,#1e293b 0%,#1e293b 30%,#334155 30%,#334155 32%,#475569 32%,#475569 78%,#1e293b 78%)',
  ],
  Left: [
    'linear-gradient(90deg,#1a2540 0%,#2d3a4f 40%,#374151 60%,#1e2535 100%)',
  ],
  Right: [
    'linear-gradient(270deg,#1a2540 0%,#2d3a4f 40%,#374151 60%,#1e2535 100%)',
  ],
  Cabin: [
    'linear-gradient(180deg,#111827 0%,#1f2937 50%,#111827 100%)',
  ],
};

interface DetBox {
  id: string;
  config: typeof DETECTION_CONFIGS[0];
  x: number; y: number; w: number; h: number;
  confidence: number;
}

// Seeded RNG — stable per (camera, frameSlot) pair so detections don't jump
function seededR(seed: number) {
  let s = seed | 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

function genDetections(busId: string, cameraLabel: string, frameSlot: number): DetBox[] {
  // Seed combines bus + camera + a slow-changing slot (changes every 4s not every 1.2s)
  const camCode = cameraLabel.charCodeAt(0) * 17;
  const busSeed = busId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = seededR(busSeed * 1000 + camCode + frameSlot);

  const profile = CAM_DETECTION_PROFILE[cameraLabel] ?? CAM_DETECTION_PROFILE['Front'];
  const count = Math.floor(r() * 3) + 1; // 1-3 detections

  const selected = [...profile].sort(() => r() - 0.5).slice(0, Math.min(count, profile.length));
  const configs = selected.map(cat => DETECTION_CONFIGS.find(d => d.category === cat)!).filter(Boolean);

  return configs.map((config, i) => ({
    id: `d-${cameraLabel}-${frameSlot}-${i}`,
    config,
    x: 0.05 + r() * 0.58,
    y: 0.10 + r() * 0.55,
    w: 0.10 + r() * 0.22,
    h: 0.08 + r() * 0.16,
    confidence: Math.round(config.minConf + r() * (config.maxConf - config.minConf)),
  }));
}

export function LiveFeedPanel() {
  const busId         = useNavikStore((s) => s.activeLiveFeedBusId);
  const closeLiveFeed = useNavikStore((s) => s.closeLiveFeed);
  const buses         = useNavikStore((s) => s.buses);
  const bus           = buses.find((b) => b.id === busId);

  const [activeCam, setActiveCam] = useState('Front');
  // frameSlot advances every 4 seconds — detections stable within that window
  const [frameSlot,   setFrameSlot]   = useState(0);
  const [sceneIdx,    setSceneIdx]    = useState(0);
  const [frameCount,  setFrameCount]  = useState(0);
  const detections = useRef<DetBox[]>([]);
  const [_tick, setTick] = useState(0); // force re-render when detections change

  // Reset camera to Front whenever a different bus opens
  useEffect(() => {
    setActiveCam('Front');
    setFrameSlot(0);
    setSceneIdx(0);
    setFrameCount(0);
  }, [busId]);

  // Slow tick: advance frameSlot every 4 seconds — detections stable, not flickering
  useEffect(() => {
    if (!busId) return;
    const id = setInterval(() => {
      setFrameSlot((s) => s + 1);
      setSceneIdx((s) => (s + 1) % 2);
    }, 4000);
    return () => clearInterval(id);
  }, [busId]);

  // Fast tick: just advance frame counter (visual only — FPS counter)
  useEffect(() => {
    if (!busId) return;
    const id = setInterval(() => setFrameCount((n) => n + 1), 250);
    return () => clearInterval(id);
  }, [busId]);

  // Recompute detections when camera or frameSlot changes — NOT on every render
  useEffect(() => {
    if (!busId) return;
    detections.current = genDetections(busId, activeCam, frameSlot);
    setTick((t) => t + 1);
  }, [busId, activeCam, frameSlot]);

  const handleCamChange = useCallback((label: string) => {
    setActiveCam(label);
    // Immediately show new camera's detections
    if (busId) {
      detections.current = genDetections(busId, label, frameSlot);
      setTick((t) => t + 1);
    }
  }, [busId, frameSlot]);

  if (!busId || !bus) return null;

  const currentCam = bus.cameras.find((c) => c.label === activeCam) ?? bus.cameras[0];
  const isOnline   = currentCam?.status === 'online';
  const scenes     = CAM_SCENES[activeCam] ?? CAM_SCENES['Front'];
  const scene      = scenes[sceneIdx % scenes.length];

  const camStatusColor: Record<string, string> = {
    online: '#15803D', degraded: '#A16207', offline: '#B42318',
  };

  return (
    <AnimatePresence>
      <motion.div
        key="lfp"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 600,
          background: 'rgba(2,6,14,0.92)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}
        onClick={(e) => { if (e.target === e.currentTarget) closeLiveFeed(); }}
      >
        <motion.div
          initial={{ scale: 0.97, y: 8 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.97, y: 8 }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          style={{
            background: '#0F172A',
            border: '1px solid #1E293B',
            borderRadius: 14,
            width: '100%', maxWidth: 960,
            maxHeight: '92vh',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 32px 80px rgba(0,0,0,0.9)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div style={{
            height: 48, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px',
            borderBottom: '1px solid #1E293B',
            background: '#0A0F1E',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Camera size={14} strokeWidth={2} color="#06B6D4" />
              <span style={{ fontWeight: 700, fontSize: 14, color: '#F1F5F9' }}>
                Live Feed — Route {bus.routeNumber}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                background: '#1E293B', color: '#94A3B8',
                padding: '1px 7px', borderRadius: 99, border: '1px solid #334155',
              }}>{bus.id}</span>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#15803D', boxShadow: '0 0 6px #15803D' }} />
            </div>
            <button
              onClick={closeLiveFeed}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B', padding: 6, borderRadius: 6, display: 'flex' }}
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          {/* ── Body ── */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

            {/* Video pane */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 320, background: '#040810' }}>
              {isOnline ? (
                <>
                  {/* Camera-specific scene */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: scene,
                    transition: 'background 1.5s ease',
                  }}>
                    {/* Scene props based on camera */}
                    {(activeCam === 'Front' || activeCam === 'Rear') && (
                      <>
                        <div style={{ position: 'absolute', bottom: '27%', left: '47%', width: 3, height: '25%', background: 'rgba(255,255,160,0.45)', borderRadius: 2 }} />
                        <div style={{ position: 'absolute', bottom: '27%', left: '53%', width: 3, height: '25%', background: 'rgba(255,255,160,0.45)', borderRadius: 2 }} />
                        <div style={{ position: 'absolute', bottom: '31%', left: '22%', width: 68, height: 36, background: '#991B1B', borderRadius: '8px 8px 4px 4px', opacity: 0.9 }} />
                        <div style={{ position: 'absolute', bottom: '31%', left: '58%', width: 54, height: 29, background: '#1E3A5F', borderRadius: '8px 8px 4px 4px', opacity: 0.9 }} />
                        <div style={{ position: 'absolute', bottom: '29%', left: '15%', width: 22, height: 18, background: '#14532D', borderRadius: 4, opacity: 0.85 }} />
                        <div style={{ position: 'absolute', bottom: '30%', left: '74%', width: 46, height: 25, background: '#4C1D95', borderRadius: '8px 8px 4px 4px', opacity: 0.85 }} />
                      </>
                    )}
                    {activeCam === 'Left' && (
                      <>
                        <div style={{ position: 'absolute', bottom: '20%', left: '10%', right: '10%', height: 60, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
                        <div style={{ position: 'absolute', bottom: '45%', left: '40%', width: 28, height: 70, background: '#374151', borderRadius: 3, opacity: 0.9 }} />
                        <div style={{ position: 'absolute', bottom: '45%', left: '55%', width: 28, height: 55, background: '#374151', borderRadius: 3, opacity: 0.8 }} />
                      </>
                    )}
                    {activeCam === 'Right' && (
                      <>
                        <div style={{ position: 'absolute', bottom: '20%', left: '10%', right: '10%', height: 60, background: 'rgba(255,255,255,0.04)', borderRadius: 4 }} />
                        <div style={{ position: 'absolute', bottom: '45%', right: '40%', width: 28, height: 65, background: '#374151', borderRadius: 3, opacity: 0.9 }} />
                      </>
                    )}
                    {activeCam === 'Cabin' && (
                      <div style={{ position: 'absolute', bottom: '35%', left: '50%', transform: 'translateX(-50%)', width: 120, height: 80, background: '#1E293B', borderRadius: 8, border: '1px solid #334155', opacity: 0.7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 11, color: '#64748B', fontFamily: 'var(--font-mono)' }}>DRIVER SEAT</span>
                      </div>
                    )}
                  </div>

                  {/* Degraded noise */}
                  {currentCam.status === 'degraded' && (
                    <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.10) 2px,rgba(0,0,0,0.10) 4px)', pointerEvents: 'none' }} />
                  )}

                  {/* Scan line */}
                  <div className="scan-overlay" />

                  {/* Detection bounding boxes — stable, not flickering */}
                  <AnimatePresence>
                    {detections.current.map((det) => (
                      <motion.div
                        key={det.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{
                          position: 'absolute',
                          left: `${det.x * 100}%`, top: `${det.y * 100}%`,
                          width: `${det.w * 100}%`, height: `${det.h * 100}%`,
                          border: `1.5px solid ${det.config.color}`,
                          borderRadius: 4, pointerEvents: 'none',
                          boxShadow: `0 0 8px ${det.config.color}55`,
                        }}
                      >
                        <div style={{
                          position: 'absolute', top: -20, left: 0,
                          background: `${det.config.color}F0`,
                          color: '#fff',
                          fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
                          padding: '2px 6px', borderRadius: '3px 3px 0 0',
                          whiteSpace: 'nowrap',
                        }}>
                          {det.config.label} {det.confidence}%
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Telemetry overlay */}
                  <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {[
                      { Icon: Wifi,   color: '#15803D', text: `REC · ${new Date().toLocaleTimeString('en-IN', { hour12: false })}` },
                      { Icon: MapPin, color: '#06B6D4', text: `${bus.position.lat.toFixed(4)}, ${bus.position.lng.toFixed(4)}` },
                      { Icon: Gauge,  color: '#06B6D4', text: `${Math.round(bus.speed)} km/h` },
                    ].map(({ Icon, color, text }) => (
                      <div key={text} style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: 'rgba(2,6,14,0.80)', backdropFilter: 'blur(6px)',
                        borderRadius: 5, padding: '2px 8px',
                        border: '1px solid rgba(255,255,255,0.07)',
                      }}>
                        <Icon size={9} strokeWidth={2.5} color={color} />
                        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#94A3B8' }}>{text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Camera label + FPS */}
                  <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <div style={{ background: 'rgba(2,6,14,0.85)', borderRadius: 5, padding: '2px 9px', border: '1px solid rgba(6,182,212,0.3)' }}>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#06B6D4', fontWeight: 700, letterSpacing: '0.08em' }}>
                        {activeCam.toUpperCase()} CAM
                      </span>
                    </div>
                    <div style={{ background: 'rgba(2,6,14,0.80)', borderRadius: 5, padding: '2px 9px', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#475569' }}>
                        {Math.min(30, 28 + (frameCount % 3))} fps · f{String(frameCount).padStart(4, '0')}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                /* Offline / degraded */
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#040810' }}>
                  <ZapOff size={28} strokeWidth={1.5} color="#334155" />
                  <span style={{ fontSize: 14, color: '#475569' }}>
                    {currentCam?.status === 'degraded' ? 'Signal degraded' : 'Camera offline'}
                  </span>
                </div>
              )}
            </div>

            {/* ── Sidebar ── */}
            <div style={{
              width: 220, flexShrink: 0,
              borderLeft: '1px solid #1E293B',
              display: 'flex', flexDirection: 'column',
              background: '#0A0F1E',
              overflow: 'hidden',
            }}>
              {/* Camera list */}
              <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid #1E293B', flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>
                  Cameras
                </div>
                {bus.cameras.map((cam) => {
                  const isAct   = activeCam === cam.label;
                  const hexCol  = camStatusColor[cam.status] ?? '#64748B';
                  return (
                    <button
                      key={cam.id}
                      onClick={() => handleCamChange(cam.label)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '7px 10px', marginBottom: 3,
                        background: isAct ? 'rgba(6,182,212,0.10)' : 'transparent',
                        border: `1px solid ${isAct ? 'rgba(6,182,212,0.30)' : 'transparent'}`,
                        borderRadius: 7, cursor: 'pointer', transition: 'all 0.12s',
                      }}
                    >
                      <span style={{ fontSize: 13, color: isAct ? '#F1F5F9' : '#64748B', fontWeight: isAct ? 600 : 400 }}>
                        {cam.label}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: hexCol }} />
                        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: hexCol, textTransform: 'uppercase', fontWeight: 700 }}>
                          {cam.status}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Detections list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Cpu size={11} strokeWidth={2} color="#06B6D4" />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                    Detections
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'var(--font-mono)', color: '#334155' }}>
                    {detections.current.length} obj
                  </span>
                </div>

                {detections.current.map((det, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: 6, padding: '7px 10px',
                      background: '#111827',
                      border: `1px solid ${det.config.color}20`,
                      borderLeft: `3px solid ${det.config.color}`,
                      borderRadius: 7,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: det.config.color }}>{det.config.label}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 4 }}>
                      <div style={{ flex: 1, height: 3, background: '#1E293B', borderRadius: 99 }}>
                        <div style={{ height: '100%', width: `${det.confidence}%`, background: det.config.color, borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#64748B' }}>{det.confidence}%</span>
                    </div>
                  </div>
                ))}

                {detections.current.length === 0 && (
                  <div style={{ fontSize: 12, color: '#334155', textAlign: 'center', marginTop: 20 }}>
                    No detections
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
