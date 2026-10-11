import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Cpu, Wifi, MapPin, Gauge, ZapOff } from 'lucide-react';
import { useNavikStore } from '../../store/navikStore';

const DETECTION_CONFIGS = [
  { category:'pothole',            color:'#ff5c5c', label:'Pothole',      minConf:82, maxConf:97 },
  { category:'vehicle_car',        color:'#5b8cff', label:'Car',          minConf:91, maxConf:99 },
  { category:'vehicle_two_wheeler',color:'#3dd5f3', label:'2-Wheeler',    minConf:88, maxConf:97 },
  { category:'vehicle_truck',      color:'#a78bfa', label:'Truck',        minConf:93, maxConf:99 },
  { category:'pedestrian',         color:'#f5b83d', label:'Pedestrian',   minConf:84, maxConf:96 },
  { category:'waterlogging',       color:'#2ec4a0', label:'Waterlogging', minConf:79, maxConf:95 },
  { category:'signboard_missing',  color:'#ff8c42', label:'Missing Sign', minConf:81, maxConf:94 },
];

interface DetBox { id:string; config:typeof DETECTION_CONFIGS[0]; x:number; y:number; w:number; h:number; confidence:number; }

function seededR(seed:number) {
  let s=seed;
  return () => { s=(s*1664525+1013904223)&0xffffffff; return (s>>>0)/4294967296; };
}

function genDetections(busId:string, frameIdx:number): DetBox[] {
  const r=seededR(busId.charCodeAt(busId.length-1)*100+frameIdx);
  const count=Math.floor(r()*4)+1;
  return [...DETECTION_CONFIGS].sort(()=>r()-0.5).slice(0,count).map((config,i) => ({
    id:`d-${frameIdx}-${i}`, config,
    x:0.05+r()*0.58, y:0.12+r()*0.52,
    w:0.08+r()*0.22, h:0.07+r()*0.18,
    confidence:Math.max(config.minConf,Math.min(config.maxConf,Math.round((config.minConf+config.maxConf)/2+(Math.random()-0.5)*6))),
  }));
}

const SCENES=[
  'linear-gradient(180deg,#1a2540 0%,#1a2540 28%,#3d4a5c 28%,#3d4a5c 30%,#2d3748 30%,#2d3748 72%,#1e2535 72%)',
  'linear-gradient(180deg,#0c1322 0%,#162032 26%,#4a5568 26%,#4a5568 28%,#2d3748 28%,#2d3748 74%,#1a2030 74%)',
  'linear-gradient(180deg,#6b7a8d 0%,#6b7a8d 26%,#4a5568 26%,#4a5568 28%,#374151 28%,#374151 75%,#2a3040 75%)',
];

export function LiveFeedPanel() {
  const busId        = useNavikStore((s) => s.activeLiveFeedBusId);
  const closeLiveFeed = useNavikStore((s) => s.closeLiveFeed);
  const buses        = useNavikStore((s) => s.buses);
  const bus          = buses.find((b) => b.id === busId);

  const [scene,        setScene]       = useState(0);
  const [detections,   setDetections]  = useState<DetBox[]>([]);
  const [activeCam,    setActiveCam]   = useState('Front');
  const [frameCount,   setFrameCount]  = useState(0);

  useEffect(() => {
    if (!busId) return;
    const id = setInterval(() => {
      const ts = Date.now();
      if (ts % 6000 < 1200) setScene((s) => (s+1) % SCENES.length);
      setDetections(genDetections(busId, ts));
      setFrameCount((n) => n+1);
    }, 1200);
    return () => clearInterval(id);
  }, [busId]);

  if (!busId || !bus) return null;

  const currentCam = bus.cameras.find((c) => c.label === activeCam) ?? bus.cameras[0];
  const isOnline   = currentCam?.status === 'online';
  const camColors  = { online:'var(--ok)', degraded:'var(--warn)', offline:'var(--danger)' };

  return (
    <AnimatePresence>
      <motion.div key="lfp" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.18 }}
        style={{ position:'fixed', inset:0, zIndex:600, background:'rgba(4,6,11,0.90)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
        onClick={(e) => { if (e.target===e.currentTarget) closeLiveFeed(); }}>
        <motion.div initial={{ scale:0.96, y:12 }} animate={{ scale:1, y:0 }} exit={{ scale:0.96, y:12 }} transition={{ type:'spring', stiffness:360, damping:32 }}
          style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:16, width:'100%', maxWidth:920, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 80px rgba(0,0,0,0.85)' }}
          onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div style={{ height:50, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 18px', borderBottom:'1px solid var(--border)', background:'var(--bg)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <Camera size={14} strokeWidth={2} style={{ color:'var(--accent)' } as React.CSSProperties} />
              <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.9375rem', color:'var(--text)' }}>Live Feed — Route {bus.routeNumber}</span>
              <span className="badge badge-muted" style={{ fontFamily:'var(--font-mono)', fontSize:'0.5rem' }}>{bus.id}</span>
              <span className="live-dot" />
            </div>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={closeLiveFeed} aria-label="Close live feed"><X size={15} /></button>
          </div>

          {/* Body */}
          <div style={{ display:'flex', flex:1, overflow:'hidden', minHeight:0 }}>
            {/* Video pane */}
            <div style={{ flex:1, position:'relative', overflow:'hidden', minHeight:300, background:'#040810' }}>
              {isOnline ? (
                <>
                  {/* Scene */}
                  <div style={{ position:'absolute', inset:0, background:SCENES[scene], transition:'background 1s ease' }}>
                    <div style={{ position:'absolute', bottom:'27%', left:'47%', width:3, height:'26%', background:'rgba(255,255,160,0.45)', borderRadius:2 }} />
                    <div style={{ position:'absolute', bottom:'27%', left:'53%', width:3, height:'26%', background:'rgba(255,255,160,0.45)', borderRadius:2 }} />
                    <div style={{ position:'absolute', bottom:'30%', left:'25%', width:64, height:34, background:'#b91c1c', borderRadius:'7px 7px 4px 4px', opacity:0.9 }} />
                    <div style={{ position:'absolute', bottom:'30%', left:'60%', width:52, height:27, background:'#1d4ed8', borderRadius:'7px 7px 4px 4px', opacity:0.9 }} />
                    <div style={{ position:'absolute', bottom:'28%', left:'16%', width:20, height:17, background:'#15803d', borderRadius:4, opacity:0.85 }} />
                    <div style={{ position:'absolute', bottom:'29%', left:'72%', width:44, height:24, background:'#6b21a8', borderRadius:'7px 7px 4px 4px', opacity:0.85 }} />
                  </div>
                  {/* Degraded grain */}
                  {currentCam.status === 'degraded' && (
                    <div style={{ position:'absolute', inset:0, background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.12) 2px,rgba(0,0,0,0.12) 4px)', pointerEvents:'none' }} />
                  )}
                  {/* Scan line */}
                  <div className="scan-overlay" />
                  {/* Detection boxes */}
                  <AnimatePresence>
                    {detections.map((det) => (
                      <motion.div key={det.id} initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.14 }}
                        style={{ position:'absolute', left:`${det.x*100}%`, top:`${det.y*100}%`, width:`${det.w*100}%`, height:`${det.h*100}%`, border:`1.5px solid ${det.config.color}`, borderRadius:4, pointerEvents:'none', boxShadow:`0 0 8px ${det.config.color}44` }}>
                        <div style={{ position:'absolute', top:-20, left:0, background:`${det.config.color}EE`, color:'#04060b', fontSize:'0.5rem', fontFamily:'var(--font-mono)', fontWeight:700, padding:'2px 5px', borderRadius:'3px 3px 0 0', whiteSpace:'nowrap', letterSpacing:'0.03em' }}>
                          {det.config.label} {det.confidence}%
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {/* Bottom telemetry */}
                  <div style={{ position:'absolute', bottom:10, left:10, display:'flex', flexDirection:'column', gap:4 }}>
                    {[
                      { icon:Wifi, color:'var(--ok)', text:`REC · ${new Date().toLocaleTimeString('en-IN',{hour12:false})}` },
                      { icon:MapPin, color:'var(--accent)', text:`${bus.position.lat.toFixed(4)}, ${bus.position.lng.toFixed(4)}` },
                      { icon:Gauge, color:'var(--accent)', text:`${Math.round(bus.speed)} km/h` },
                    ].map(({ icon:Icon, color, text }) => (
                      <div key={text} style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(4,6,11,0.82)', backdropFilter:'blur(8px)', borderRadius:6, padding:'3px 8px', border:'1px solid rgba(255,255,255,0.06)' }}>
                        <Icon size={9} strokeWidth={2.5} style={{ color, flexShrink:0 } as React.CSSProperties} />
                        <span style={{ fontSize:'0.5rem', fontFamily:'var(--font-mono)', color:'var(--text-muted)' }}>{text}</span>
                      </div>
                    ))}
                  </div>
                  {/* Top-right HUD */}
                  <div style={{ position:'absolute', top:10, right:10, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                    <div style={{ background:'rgba(4,6,11,0.82)', backdropFilter:'blur(8px)', borderRadius:6, padding:'3px 8px', border:'1px solid rgba(61,213,243,0.2)' }}>
                      <span style={{ fontSize:'0.5rem', fontFamily:'var(--font-mono)', color:'var(--accent)', fontWeight:700, letterSpacing:'0.08em' }}>{activeCam.toUpperCase()} CAM</span>
                    </div>
                    <div style={{ background:'rgba(4,6,11,0.82)', backdropFilter:'blur(8px)', borderRadius:6, padding:'3px 8px', border:'1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize:'0.5rem', fontFamily:'var(--font-mono)', color:'var(--text-muted)' }}>
                        30fps · f{frameCount.toString().padStart(4,'0')}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, background:'#060a12' }}>
                  {currentCam?.status === 'degraded' ? <Camera size={28} strokeWidth={1.5} style={{ color:'var(--warn)' } as React.CSSProperties} /> : <ZapOff size={28} strokeWidth={1.5} style={{ color:'var(--surface-2)' } as React.CSSProperties} />}
                  <span style={{ fontSize:'0.875rem', color:'var(--text-muted)' }}>{currentCam?.status === 'degraded' ? 'Signal degraded' : 'Camera offline'}</span>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div style={{ width:212, flexShrink:0, borderLeft:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg)' }}>
              {/* Camera selector */}
              <div style={{ padding:'12px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
                <div style={{ fontSize:'0.5625rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Cameras</div>
                {bus.cameras.map((cam) => {
                  const cc = camColors[cam.status];
                  const isAct = activeCam === cam.label;
                  return (
                    <button key={cam.id} onClick={() => setActiveCam(cam.label)}
                      style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', padding:'6px 8px', marginBottom:3, background:isAct?'rgba(61,213,243,0.08)':'transparent', border:`1px solid ${isAct?'rgba(61,213,243,0.22)':'transparent'}`, borderRadius:7, cursor:'pointer', transition:'all 0.12s' }}>
                      <span style={{ fontSize:'0.8125rem', color:isAct?'var(--text)':'var(--text-muted)' }}>{cam.label}</span>
                      <span style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <span style={{ width:6, height:6, borderRadius:'50%', background:cc, boxShadow:`0 0 4px ${cc}` }} />
                        <span style={{ fontSize:'0.4375rem', fontFamily:'var(--font-mono)', color:cc, textTransform:'uppercase', fontWeight:700, letterSpacing:'0.06em' }}>{cam.status}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Detections */}
              <div style={{ flex:1, overflowY:'auto', padding:'12px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:10 }}>
                  <Cpu size={11} strokeWidth={2.2} style={{ color:'var(--accent)' } as React.CSSProperties} />
                  <span style={{ fontSize:'0.5625rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Detections</span>
                  <span style={{ marginLeft:'auto', fontSize:'0.5rem', fontFamily:'var(--font-mono)', color:'var(--surface-2)' }}>{detections.length} obj</span>
                </div>
                <AnimatePresence>
                  {detections.map((det) => (
                    <motion.div key={det.id} initial={{ opacity:0, y:-5 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:0.14 }}
                      style={{ marginBottom:6, padding:'7px 9px', background:'var(--surface-2)', border:`1px solid ${det.config.color}22`, borderLeft:`3px solid ${det.config.color}`, borderRadius:7 }}>
                      <div style={{ fontSize:'0.8125rem', fontWeight:600, color:det.config.color }}>{det.config.label}</div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:3 }}>
                        <div style={{ flex:1, height:3, background:'var(--surface-2)', borderRadius:999, marginRight:7 }}>
                          <div style={{ height:'100%', width:`${det.confidence}%`, background:det.config.color, borderRadius:999 }} />
                        </div>
                        <span style={{ fontSize:'0.5rem', fontFamily:'var(--font-mono)', color:'var(--text-muted)', flexShrink:0 }}>{det.confidence}%</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {detections.length===0 && <div style={{ fontSize:'0.75rem', color:'var(--surface-2)', textAlign:'center', marginTop:24 }}>No active detections</div>}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
