// ═══════════════════════════════════════════════════════════
// NAVIK — AI Lab
// Real inference powered by local Ollama models
// llama3.2:3b · qwen2.5-coder:3b · bge-m3 · qwen2.5vl:7b
// ═══════════════════════════════════════════════════════════

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Zap, Search, HardHat, Shield, Activity, AlertCircle, Loader, Upload, X } from 'lucide-react';
import { useAI } from '../../hooks/useAI';
import { useNavikStore } from '../../store/navikStore';
import {
  runCivilAgentAnalysis,
  runTrafficAdvisor,
  runPursuitAnalysis,
  enrichIncidentDescription,
  semanticSearch,
  type CivilAgentAnalysis,
  type TrafficAdvisoryAnalysis,
  type PursuitAnalysis,
} from '../../lib/aiAgents';
import { analyzeImage } from '../../lib/ollamaClient';

// ── AI status badge ────────────────────────────────────────
function AIStatusBar() {
  const { status, check } = useAI();

  const modelList = [
    { key: 'reasoning'  as const, name: 'llama3.2:3b',       role: 'Reasoning' },
    { key: 'structured' as const, name: 'qwen2.5-coder:3b',  role: 'Structured' },
    { key: 'embedding'  as const, name: 'bge-m3:latest',      role: 'Embeddings' },
    { key: 'vision'     as const, name: 'qwen2.5vl:7b',       role: 'Vision' },
  ];

  return (
    <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <Cpu size={14} color={status.available ? '#15803D' : '#B42318'} />
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>
          Ollama {status.available ? 'Connected' : 'Offline'}
        </span>
        {status.checking && <Loader size={12} style={{ animation: 'spin 1s linear infinite' } as React.CSSProperties} color="var(--muted)" />}
      </div>

      <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
        {modelList.map(({ name, role }) => {
          const available = status.models.some((m) => m.startsWith(name.split(':')[0]));
          return (
            <div key={name} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 10px', borderRadius: 99,
              background: available ? '#15803D12' : '#B4231810',
              border: `1px solid ${available ? '#15803D28' : '#B4231828'}`,
              fontSize: 12,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: available ? '#15803D' : '#B42318' }} />
              <span style={{ fontFamily: 'var(--font-mono)', color: available ? '#15803D' : '#B42318' }}>{name}</span>
              <span style={{ color: 'var(--muted)' }}>· {role}</span>
            </div>
          );
        })}
      </div>

      <button className="btn btn-ghost btn-xs" onClick={check}>Refresh</button>
      {status.lastChecked && (
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          {status.lastChecked.toLocaleTimeString('en-IN', { hour12: false })}
        </span>
      )}
    </div>
  );
}

// ── Shared result box ──────────────────────────────────────
function ResultBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        marginTop: 12, padding: '12px 14px',
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderLeft: '3px solid var(--accent)', borderRadius: 8,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {label}
      </div>
      {children}
    </motion.div>
  );
}

// ── Civil Engineer AI Panel ────────────────────────────────
function CivilPanel() {
  const defects = useNavikStore((s) => s.defects);
  const [selectedDefectId, setSelectedDefectId] = useState(defects[0]?.id ?? '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CivilAgentAnalysis | null>(null);
  const [error, setError] = useState('');

  const pending = defects.filter((d) => d.status !== 'resolved');

  async function run() {
    const defect = defects.find((d) => d.id === selectedDefectId);
    if (!defect) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await runCivilAgentAnalysis(defect);
      setResult(r);
    } catch (e) {
      setError(String(e));
    } finally { setLoading(false); }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select className="form-select" style={{ flex: 1, height: 34, fontSize: 13 }}
          value={selectedDefectId} onChange={(e) => setSelectedDefectId(e.target.value)}>
          {pending.map((d) => (
            <option key={d.id} value={d.id}>
              {d.id} — {d.category} @ {d.locationLabel} [{d.severity}]
            </option>
          ))}
        </select>
        <button className="btn btn-primary btn-sm" onClick={run} disabled={loading || !selectedDefectId}>
          {loading ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' } as React.CSSProperties} /> Analysing…</> : <><Zap size={12} /> Run AI Analysis</>}
        </button>
      </div>

      {error && <div style={{ padding: '8px 12px', background: '#B4231812', border: '1px solid #B4231828', borderRadius: 7, fontSize: 13, color: '#B42318' }}>Error: {error}</div>}

      {result && (
        <ResultBox label={`llama3.2:3b + qwen2.5-coder:3b analysis`}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {[
              { label: 'Priority Score', value: `${result.priorityScore}/100`, color: result.priorityScore > 70 ? '#B42318' : result.priorityScore > 50 ? '#A16207' : '#15803D' },
              { label: 'Urgency', value: result.urgency.replace(/_/g, ' '), color: result.urgency === 'immediate' ? '#B42318' : '#A16207' },
              { label: 'Estimated Cost', value: `₹${result.estimatedCostINR.toLocaleString('en-IN')}`, color: 'var(--ink)' },
              { label: 'IRC Reference', value: result.irc82Reference, color: 'var(--accent)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 8 }}>
            <strong>Repair recommendation:</strong> {result.repairRecommendation}
          </div>
          <div style={{ padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.6, fontFamily: 'var(--font-mono)' }}>
            <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>AI Reasoning (llama3.2:3b):</div>
            {result.reasoning}
          </div>
        </ResultBox>
      )}
    </div>
  );
}

// ── Traffic Advisor AI Panel ───────────────────────────────
function TrafficPanel() {
  const segments = useNavikStore((s) => s.trafficSegments);
  const [selectedId, setSelectedId] = useState(segments[0]?.id ?? '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrafficAdvisoryAnalysis | null>(null);
  const [error, setError] = useState('');

  async function run() {
    const seg = segments.find((s) => s.id === selectedId);
    if (!seg) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await runTrafficAdvisor(seg);
      setResult(r);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select className="form-select" style={{ flex: 1, height: 34, fontSize: 13 }}
          value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {[...segments].sort((a,b) => b.congestionScore - a.congestionScore).map((s) => (
            <option key={s.id} value={s.id}>{s.name} — score {s.congestionScore}</option>
          ))}
        </select>
        <button className="btn btn-primary btn-sm" onClick={run} disabled={loading}>
          {loading ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' } as React.CSSProperties} /> Advising…</> : <><Activity size={12} /> Get Advisory</>}
        </button>
      </div>

      {error && <div style={{ padding: '8px 12px', background: '#B4231812', borderRadius: 7, fontSize: 13, color: '#B42318' }}>{error}</div>}

      {result && (
        <ResultBox label="qwen2.5-coder:3b advisory">
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>{result.topAction}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 8 }}>{result.rationale}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, background: '#15803D12', color: '#15803D', border: '1px solid #15803D28', padding: '2px 8px', borderRadius: 99 }}>
              −{result.estimatedDelayReductionMin} min delay
            </span>
            <span style={{ fontSize: 12, background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '2px 8px', borderRadius: 99 }}>
              {result.expectedImpact}
            </span>
          </div>
          {result.alternateRoute && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>Alternate route: {result.alternateRoute}</div>
          )}
          {result.affectedBuses.length > 0 && (
            <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {result.affectedBuses.map((b) => <span key={b} className="badge badge-neutral">{b}</span>)}
            </div>
          )}
        </ResultBox>
      )}
    </div>
  );
}

// ── Pursuit Agent AI Panel ─────────────────────────────────
function PursuitPanel() {
  const incidents = useNavikStore((s) => s.incidents);
  const anprIncidents = incidents.filter((i) => i.plateNumber && (i.type === 'hit_and_run' || i.type === 'rash_driving'));
  const [selectedId, setSelectedId] = useState(anprIncidents[0]?.id ?? '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PursuitAnalysis | null>(null);
  const [error, setError] = useState('');

  async function run() {
    const inc = incidents.find((i) => i.id === selectedId);
    if (!inc?.plateNumber) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await runPursuitAnalysis(
        inc.plateNumber,
        inc.locationLabel,
        [],
        inc.plateConfidence ?? 85
      );
      setResult(r);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  return (
    <div>
      {anprIncidents.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--muted)', padding: 16, textAlign: 'center' }}>
          No ANPR incidents available. Wait for a hit-and-run or rash driving incident to stream in.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <select className="form-select" style={{ flex: 1, height: 34, fontSize: 13 }}
              value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {anprIncidents.slice(0,10).map((i) => (
                <option key={i.id} value={i.id}>{i.plateNumber} — {i.locationLabel}</option>
              ))}
            </select>
            <button className="btn btn-primary btn-sm" onClick={run} disabled={loading}>
              {loading ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' } as React.CSSProperties} /> Analysing…</> : <><Shield size={12} /> Analyse Suspect</>}
            </button>
          </div>

          {error && <div style={{ padding: '8px 12px', background: '#B4231812', borderRadius: 7, fontSize: 13, color: '#B42318' }}>{error}</div>}

          {result && (
            <ResultBox label="llama3.2:3b pursuit analysis">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div style={{ padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Predicted direction</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{result.predictedDirection}</div>
                </div>
                <div style={{ padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Likely route</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{result.likelyEscapeRoute}</div>
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Recommended checkpoints</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {result.recommendedCheckpoints.map((cp, i) => (
                    <span key={i} style={{ fontSize: 12, background: '#B4231812', color: '#B42318', border: '1px solid #B4231828', padding: '2px 8px', borderRadius: 99 }}>{cp}</span>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 8 }}>{result.evidenceSummary}</div>
              <details>
                <summary style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer' }}>Draft FIR Text (AI-generated)</summary>
                <div style={{ marginTop: 8, padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.7 }}>
                  {result.draftFIRText}
                </div>
              </details>
            </ResultBox>
          )}
        </>
      )}
    </div>
  );
}

// ── Vision Analysis Panel ──────────────────────────────────
function VisionPanel() {
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('Identify any road defects, potholes, waterlogging, missing signboards, or traffic violations in this image. List each finding with severity (critical/high/medium/low).');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(',')[1];
      setImageB64(b64);
      setResult(''); setError('');
    };
    reader.readAsDataURL(f);
  }

  async function run() {
    if (!imageB64) return;
    setLoading(true); setError(''); setResult('');
    try {
      const r = await analyzeImage(imageB64, prompt, { maxTokens: 400, timeoutMs: 120000 });
      setResult(r);
    } catch (e) {
      setError(`Vision analysis failed: ${String(e)}`);
    } finally { setLoading(false); }
  }

  return (
    <div>
      <div style={{ marginBottom: 10, padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--ink-2)' }}>
        Using <strong style={{ color: 'var(--ink)' }}>qwen2.5vl:7b</strong> — 8.3B parameter vision-language model.
        Upload any road/traffic image to get AI analysis.
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>
          <Upload size={12} /> Upload Image
        </button>
        {imageB64 && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setImageB64(null); setResult(''); }}>
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {imageB64 && (
        <div style={{ marginBottom: 10 }}>
          <img src={`data:image/jpeg;base64,${imageB64}`} alt="uploaded" style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <label className="form-label">Analysis prompt</label>
        <textarea className="form-textarea" value={prompt} onChange={(e) => setPrompt(e.target.value)} style={{ fontSize: 13, minHeight: 64 }} />
      </div>

      <button className="btn btn-primary btn-sm" onClick={run} disabled={loading || !imageB64}>
        {loading ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' } as React.CSSProperties} /> Analysing with qwen2.5vl…</> : <><Zap size={12} /> Analyse Image</>}
      </button>

      {error && <div style={{ marginTop: 10, padding: '8px 12px', background: '#B4231812', borderRadius: 7, fontSize: 13, color: '#B42318' }}>{error}</div>}

      {result && (
        <ResultBox label="qwen2.5vl:7b vision output">
          <pre style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink)', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{result}</pre>
        </ResultBox>
      )}
    </div>
  );
}

// ── Semantic Search Panel ──────────────────────────────────
function SemanticSearchPanel() {
  const incidents = useNavikStore((s) => s.incidents);
  const [query, setQuery] = useState('vehicle speeding near school children');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ id: string; score: number; inc: typeof incidents[0] }>>([]);
  const [error, setError] = useState('');

  async function run() {
    setLoading(true); setError(''); setResults([]);
    try {
      const candidates = incidents.slice(0, 30).map((i) => ({
        id: i.id,
        text: `${i.type} ${i.description} ${i.locationLabel} ${i.severity}`,
      }));
      const scored = await semanticSearch(query, candidates, 5);
      setResults(scored.map((s) => ({
        ...s,
        inc: incidents.find((i) => i.id === s.id)!,
      })).filter((r) => r.inc));
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div style={{ marginBottom: 10, padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--ink-2)' }}>
        Using <strong style={{ color: 'var(--ink)' }}>bge-m3:latest</strong> — 566M parameter multilingual embedding model (dim=1024).
        Search incidents by meaning, not keywords.
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input className="form-input" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. children crossing dangerously" style={{ flex: 1, height: 36 }}
          onKeyDown={(e) => e.key === 'Enter' && run()} />
        <button className="btn btn-primary btn-sm" onClick={run} disabled={loading}>
          {loading ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' } as React.CSSProperties} /> Searching…</> : <><Search size={12} /> Search</>}
        </button>
      </div>

      {error && <div style={{ padding: '8px 12px', background: '#B4231812', borderRadius: 7, fontSize: 13, color: '#B42318' }}>{error}</div>}

      <AnimatePresence>
        {results.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            style={{ padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{r.inc.type.replace(/_/g,' ')} — {r.inc.locationLabel}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{r.inc.description?.slice(0,80)}…</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: r.score > 0.8 ? '#15803D' : r.score > 0.6 ? '#A16207' : 'var(--muted)' }}>
                {(r.score * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>similarity</div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Incident Enrichment Panel ──────────────────────────────
function EnrichPanel() {
  const incidents = useNavikStore((s) => s.incidents);
  const [selectedId, setSelectedId] = useState(incidents[0]?.id ?? '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  async function run() {
    const inc = incidents.find((i) => i.id === selectedId);
    if (!inc) return;
    setLoading(true); setError(''); setResult('');
    try {
      const r = await enrichIncidentDescription(inc.type, inc.locationLabel, {
        severity: inc.severity,
        plateNumber: inc.plateNumber,
        congestionScore: inc.congestionScore,
      });
      setResult(r);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <select className="form-select" style={{ flex: 1, height: 34, fontSize: 13 }}
          value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {incidents.slice(0,20).map((i) => (
            <option key={i.id} value={i.id}>{i.id} — {i.type} @ {i.locationLabel}</option>
          ))}
        </select>
        <button className="btn btn-primary btn-sm" onClick={run} disabled={loading}>
          {loading ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' } as React.CSSProperties} /> Writing…</> : <><Zap size={12} /> Enrich Description</>}
        </button>
      </div>

      {error && <div style={{ padding: '8px 12px', background: '#B4231812', borderRadius: 7, fontSize: 13, color: '#B42318' }}>{error}</div>}

      {result && (
        <ResultBox label="llama3.2:3b enriched description">
          <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.7, margin: 0 }}>{result}</p>
        </ResultBox>
      )}
    </div>
  );
}

// ── Main AILabView ─────────────────────────────────────────
const PANELS = [
  { id: 'civil',    label: 'Civil Engineer',  icon: HardHat,   model: 'qwen2.5-coder:3b' },
  { id: 'traffic',  label: 'Traffic Advisor', icon: Activity,  model: 'qwen2.5-coder:3b' },
  { id: 'pursuit',  label: 'Pursuit Agent',   icon: Shield,    model: 'llama3.2:3b' },
  { id: 'vision',   label: 'Vision Analysis', icon: Cpu,       model: 'qwen2.5vl:7b' },
  { id: 'search',   label: 'Semantic Search', icon: Search,    model: 'bge-m3:latest' },
  { id: 'enrich',   label: 'Enrich Incident', icon: Zap,       model: 'llama3.2:3b' },
] as const;

type PanelId = typeof PANELS[number]['id'];

export function AILabView() {
  const [activePanel, setActivePanel] = useState<PanelId>('civil');
  const { status } = useAI();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--canvas)' }}>
      {/* AI Status Bar */}
      <AIStatusBar />

      {!status.available && !status.checking && (
        <div style={{ padding: '10px 20px', background: '#B4231810', borderBottom: '1px solid #B4231828', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={14} color="#B42318" />
          <span style={{ fontSize: 13, color: '#B42318' }}>
            Ollama not reachable. Start Ollama with <code style={{ fontFamily: 'var(--font-mono)', background: '#B4231812', padding: '1px 5px', borderRadius: 4 }}>OLLAMA_MODELS=D:\ollama_models\models ollama serve</code>
          </span>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Panel selector */}
        <div style={{ width: 200, flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--surface)', padding: '12px 8px', overflowY: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px 8px' }}>
            AI Features
          </div>
          {PANELS.map(({ id, label, icon: Icon, model }) => {
            const active = activePanel === id;
            return (
              <button key={id} onClick={() => setActivePanel(id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: 'none',
                  background: active ? 'var(--accent-soft)' : 'transparent',
                  cursor: 'pointer', marginBottom: 2, display: 'flex', flexDirection: 'column', gap: 2,
                  transition: 'background 0.12s',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Icon size={13} strokeWidth={active ? 2.2 : 1.8} color={active ? 'var(--accent)' : 'var(--muted)'} />
                  <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--accent)' : 'var(--ink)' }}>{label}</span>
                </div>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--muted)', paddingLeft: 20 }}>{model}</span>
              </button>
            );
          })}

          <div style={{ padding: '12px 8px 4px', marginTop: 12, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
            All inference runs <strong>locally</strong> via Ollama at<br />
            <code style={{ fontFamily: 'var(--font-mono)' }}>localhost:11434</code>
          </div>
        </div>

        {/* Active panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <AnimatePresence mode="wait">
            <motion.div key={activePanel} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {activePanel === 'civil'   && <CivilPanel />}
              {activePanel === 'traffic' && <TrafficPanel />}
              {activePanel === 'pursuit' && <PursuitPanel />}
              {activePanel === 'vision'  && <VisionPanel />}
              {activePanel === 'search'  && <SemanticSearchPanel />}
              {activePanel === 'enrich'  && <EnrichPanel />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
