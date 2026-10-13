// ═══════════════════════════════════════════════════════════
// NAVIK — Zustand Store v3
// SIH PS #26124 · Single source of truth for all state
// ═══════════════════════════════════════════════════════════
import { create } from 'zustand';
import type {
  Bus, Incident, RoadDefect, SchoolZone, TrafficSegment,
  HeatPoint, ODFlowEntry, MapLayer, MapMode, AppView,
  IncidentStatus, DefectStatus, DashboardKPIs,
  WorkOrder, WorkOrderStatus,
  PursuitSession, PursuitSighting,
  EdgeNode, BandwidthPolicy,
  RoadHealthSegment,
  TrafficAdvisory, AdvisoryAction,
  AgentActivityEntry,
} from '../types';
import {
  generateBuses, generateIncidents, generateDefects,
  generateSchoolZones, generateTrafficSegments, generateHeatPoints,
  generateODFlows, generateEdgeNodes, generateRoadHealthSegments,
  generateAgentActivityLog,
  LIVE_INCIDENT_TEMPLATES, makeAIPipeline, genPlate, pickLocation,
} from '../lib/seedData';
import { computeWorkOrder, verifyRepair } from '../lib/civilAgent';
import { generatePursuitSightings, buildEvidencePacket } from '../lib/pursuitAgent';

// ── Toast ──────────────────────────────────────────────────
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

// ── Store Interface ────────────────────────────────────────
interface NavikState {
  // ── Core data ──
  buses:           Bus[];
  incidents:       Incident[];
  defects:         RoadDefect[];
  schoolZones:     SchoolZone[];
  trafficSegments: TrafficSegment[];
  heatPoints:      HeatPoint[];
  odFlows:         ODFlowEntry[];

  // ── Feature 1: Civil Works ──
  workOrders:      WorkOrder[];

  // ── Feature 2: Pursuit ──
  pursuitSessions: PursuitSession[];

  // ── Feature 3: Edge Network ──
  edgeNodes:         EdgeNode[];
  bandwidthPolicy:   BandwidthPolicy;

  // ── Feature 4: Road Health ──
  roadHealthSegments: RoadHealthSegment[];

  // ── Feature 5: Traffic Advisor ──
  advisories: TrafficAdvisory[];

  // ── Agents hub ──
  agentActivityLog: AgentActivityEntry[];

  // ── UI ──
  view:               AppView;
  activeLayers:       Set<MapLayer>;
  mapMode:            MapMode;
  selectedBusId:      string | null;
  selectedIncidentId: string | null;
  selectedDefectId:   string | null;
  selectedWorkOrderId:string | null;
  selectedPursuitId:  string | null;
  drawerOpen:         boolean;
  drawerMode:         'incident'|'defect'|'bus'|'work_order'|'pursuit'|null;
  activeLiveFeedBusId:string | null;
  newIncidentIds:     Set<string>;

  // ── Filters ──
  incidentFilter: { type:string; severity:string; status:string; search:string };
  defectFilter:   { category:string; severity:string; status:string; search:string };
  busFilter:      { route:string; status:string; search:string };
  woFilter:       { status:string; circle:string };

  // ── Toasts ──
  toasts: Toast[];

  // ── KPIs ──
  kpis: DashboardKPIs;

  // ── Actions: Navigation & UI ──
  setView: (v: AppView) => void;
  toggleLayer: (l: MapLayer) => void;
  setMapMode: (m: MapMode) => void;
  selectBus:       (id: string | null) => void;
  selectIncident:  (id: string | null) => void;
  selectDefect:    (id: string | null) => void;
  selectWorkOrder: (id: string | null) => void;
  selectPursuit:   (id: string | null) => void;
  closeDrawer:     () => void;
  openLiveFeed:    (busId: string) => void;
  closeLiveFeed:   () => void;

  // ── Actions: Data mutations ──
  updateIncidentStatus: (id:string, status:IncidentStatus, action?:string) => void;
  updateDefectStatus:   (id:string, status:DefectStatus) => void;
  addIncident:          (inc: Incident) => void;
  markIncidentSeen:     (id: string) => void;

  // ── Actions: Civil Works ──
  generateWorkOrder:    (defectId: string) => WorkOrder | null;
  updateWorkOrderStatus:(id:string, status:WorkOrderStatus, note?:string) => void;
  assignContractor:     (id:string, contractor:string) => void;
  triggerVerification:  (workOrderId:string) => void;

  // ── Actions: Pursuit ──
  startPursuit:        (incidentId:string) => PursuitSession | null;
  addPursuitSighting:  (pursuitId:string, sighting:PursuitSighting) => void;
  generateEvidenceHash:(pursuitId:string) => void;
  sharePursuitPolice:  (pursuitId:string) => void;
  updatePursuitStatus: (id:string, status:PursuitSession['status']) => void;

  // ── Actions: Edge Network ──
  updateBandwidthPolicy:(policy: Partial<BandwidthPolicy>) => void;
  simulateNetworkDrop:  (busId:string) => void;
  simulateReconnect:    (busId:string) => void;
  startOTAUpdate:       (busIds:string[]) => void;
  rollbackOTA:          (busId:string) => void;

  // ── Actions: Road Health ──
  applyRerouteSuggestion:(segmentId:string) => void;
  prePositionCrew:       (segmentId:string) => void;

  // ── Actions: Traffic Advisor ──
  generateAdvisory:     (segmentId:string) => TrafficAdvisory | null;
  simulateAdvisory:     (advisoryId:string, actionIdx:number) => void;
  applyAdvisory:        (advisoryId:string) => void;
  undoAdvisory:         (advisoryId:string) => void;

  // ── Actions: Filters ──
  setIncidentFilter: (f: Partial<NavikState['incidentFilter']>) => void;
  setDefectFilter:   (f: Partial<NavikState['defectFilter']>)   => void;
  setBusFilter:      (f: Partial<NavikState['busFilter']>)       => void;
  setWoFilter:       (f: Partial<NavikState['woFilter']>)        => void;

  // ── Actions: Toasts ──
  addToast:    (t: Omit<Toast,'id'>) => void;
  removeToast: (id:string) => void;

  // ── Simulation ──
  moveBuses:       () => void;
  streamLiveEvent: () => void;
  recomputeKPIs:   () => void;
  addAgentLog:     (entry: Omit<AgentActivityEntry,'id'>) => void;
}

// ── Initial data ──────────────────────────────────────────
const initialBuses     = generateBuses();
const initialIncidents = generateIncidents();
const initialDefects   = generateDefects();
const initialEdgeNodes = generateEdgeNodes(initialBuses);
const initialRHS       = generateRoadHealthSegments();
const initialAgentLog  = generateAgentActivityLog();

function computeKPIs(
  buses: Bus[], incidents: Incident[], defects: RoadDefect[],
  workOrders: WorkOrder[], edgeNodes: EdgeNode[]
): DashboardKPIs {
  const bandwidthSaved = edgeNodes.reduce((s,n) => s + n.bandwidthSavedMB, 0) / 1024;
  return {
    activeBuses:     buses.filter(b => b.status === 'active').length,
    liveIncidents:   incidents.filter(i => i.status !== 'resolved').length,
    avgRouteDelay:   Math.round(
      incidents.filter(i => i.type === 'congestion_alert')
        .reduce((s,i) => s + (i.congestionScore ?? 50) * 0.3, 0) /
      Math.max(incidents.filter(i => i.type === 'congestion_alert').length, 1)
    ),
    defectsPending:  defects.filter(d => d.status === 'pending' || d.status === 'under_review').length,
    workOrdersOpen:  workOrders.filter(w => !['ai_verified','rejected'].includes(w.status)).length,
    bandwidthSavedGB: Math.round(bandwidthSaved * 10) / 10,
  };
}

// ── Live incident counter ──────────────────────────────────
let liveIncCounter = 100;
function makeLiveIncident(): Incident {
  const tpl = LIVE_INCIDENT_TEMPLATES[liveIncCounter % LIVE_INCIDENT_TEMPLATES.length];
  liveIncCounter++;
  const seed = `live-${liveIncCounter}`;
  const loc  = pickLocation(seed);
  const busN = Math.floor(Math.random() * 50) + 1;
  const busId = `BUS-${String(busN).padStart(3,'0')}`;
  const now  = new Date().toISOString();
  return {
    id: `INC-LIVE-${String(liveIncCounter).padStart(4,'0')}`,
    type: tpl.type,
    status: 'new',
    severity: tpl.severity,
    position: {
      lat: loc.pos.lat + (Math.random()-0.5)*0.02,
      lng: loc.pos.lng + (Math.random()-0.5)*0.02,
    },
    detectedBy: busId,
    timestamp: now,
    description: tpl.description,
    locationLabel: loc.label,
    ...(tpl.withANPR ? {
      plateNumber:     genPlate(seed),
      plateConfidence: Math.round(82 + Math.random()*14),
    } : {}),
    ...(tpl.type === 'congestion_alert' ? {
      congestionScore: Math.round(78 + Math.random()*20),
      vehicleCounts: [
        { type:'car'         as const, count:Math.floor(40+Math.random()*80), confidence:0.94 },
        { type:'two_wheeler' as const, count:Math.floor(30+Math.random()*60), confidence:0.91 },
        { type:'bus'         as const, count:Math.floor(5 +Math.random()*15), confidence:0.97 },
        { type:'auto'        as const, count:Math.floor(8 +Math.random()*20), confidence:0.88 },
      ],
    } : {}),
    aiPipeline: makeAIPipeline(now, !!tpl.withANPR),
    actions: [],
  };
}

// ── Store ──────────────────────────────────────────────────
export const useNavikStore = create<NavikState>((set, get) => ({
  buses:              initialBuses,
  incidents:          initialIncidents,
  defects:            initialDefects,
  schoolZones:        generateSchoolZones(),
  trafficSegments:    generateTrafficSegments(),
  heatPoints:         generateHeatPoints(),
  odFlows:            generateODFlows(),
  workOrders:         [],
  pursuitSessions:    [],
  edgeNodes:          initialEdgeNodes,
  bandwidthPolicy:    { minConfidenceToUpload:75, keyframeCount:3, clipLengthSec:8 },
  roadHealthSegments: initialRHS,
  advisories:         [],
  agentActivityLog:   initialAgentLog,

  view:               'dashboard',
  activeLayers:       new Set(['buses','incidents','defects'] as MapLayer[]),
  mapMode:            'standard',
  selectedBusId:      null,
  selectedIncidentId: null,
  selectedDefectId:   null,
  selectedWorkOrderId:null,
  selectedPursuitId:  null,
  drawerOpen:         false,
  drawerMode:         null,
  activeLiveFeedBusId:null,
  newIncidentIds:     new Set(),

  incidentFilter: { type:'', severity:'', status:'', search:'' },
  defectFilter:   { category:'', severity:'', status:'', search:'' },
  busFilter:      { route:'', status:'', search:'' },
  woFilter:       { status:'', circle:'' },

  toasts: [],
  kpis:   computeKPIs(initialBuses, initialIncidents, initialDefects, [], initialEdgeNodes),

  // ── Navigation ────────────────────────────────────────────
  setView: (view) => set({ view }),

  toggleLayer: (layer) => set(state => {
    const next = new Set(state.activeLayers);
    if (next.has(layer)) next.delete(layer); else next.add(layer);
    return { activeLayers: next };
  }),

  setMapMode: (mapMode) => set({ mapMode }),

  // ── Selection ─────────────────────────────────────────────
  selectBus: (id) => set({
    selectedBusId: id, drawerOpen: id !== null,
    drawerMode: id !== null ? 'bus' : null,
    selectedIncidentId:null, selectedDefectId:null,
    selectedWorkOrderId:null, selectedPursuitId:null,
  }),
  selectIncident: (id) => set({
    selectedIncidentId: id, drawerOpen: id !== null,
    drawerMode: id !== null ? 'incident' : null,
    selectedBusId:null, selectedDefectId:null,
    selectedWorkOrderId:null, selectedPursuitId:null,
  }),
  selectDefect: (id) => set({
    selectedDefectId: id, drawerOpen: id !== null,
    drawerMode: id !== null ? 'defect' : null,
    selectedBusId:null, selectedIncidentId:null,
    selectedWorkOrderId:null, selectedPursuitId:null,
  }),
  selectWorkOrder: (id) => set({
    selectedWorkOrderId: id, drawerOpen: id !== null,
    drawerMode: id !== null ? 'work_order' : null,
    selectedBusId:null, selectedIncidentId:null,
    selectedDefectId:null, selectedPursuitId:null,
  }),
  selectPursuit: (id) => set({
    selectedPursuitId: id, drawerOpen: id !== null,
    drawerMode: id !== null ? 'pursuit' : null,
    selectedBusId:null, selectedIncidentId:null,
    selectedDefectId:null, selectedWorkOrderId:null,
  }),
  closeDrawer: () => set({
    drawerOpen:false, drawerMode:null,
    selectedBusId:null, selectedIncidentId:null,
    selectedDefectId:null, selectedWorkOrderId:null, selectedPursuitId:null,
  }),
  openLiveFeed:  (busId) => set({ activeLiveFeedBusId: busId }),
  closeLiveFeed: ()      => set({ activeLiveFeedBusId: null }),

  // ── Incident ──────────────────────────────────────────────
  updateIncidentStatus: (id, status, action) => set(state => ({
    incidents: state.incidents.map(inc => inc.id === id ? {
      ...inc, status,
      actions: action ? [...(inc.actions??[]), `${action} — ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`] : inc.actions,
      resolvedAt: status === 'resolved' ? new Date().toISOString() : inc.resolvedAt,
    } : inc),
  })),

  updateDefectStatus: (id, status) => set(state => ({
    defects: state.defects.map(d => d.id === id ? {...d, status} : d),
  })),

  addIncident: (incident) => set(state => {
    const incidents  = [incident, ...state.incidents];
    const newIds     = new Set(state.newIncidentIds);
    newIds.add(incident.id);
    return {
      incidents,
      newIncidentIds: newIds,
      kpis: computeKPIs(state.buses, incidents, state.defects, state.workOrders, state.edgeNodes),
    };
  }),

  markIncidentSeen: (id) => set(state => {
    const s = new Set(state.newIncidentIds); s.delete(id);
    return { newIncidentIds: s };
  }),

  // ── Civil Works ───────────────────────────────────────────
  generateWorkOrder: (defectId) => {
    const { defects, buses, schoolZones, workOrders, addToast, addAgentLog } = get();
    const defect = defects.find(d => d.id === defectId);
    if (!defect) return null;
    // Prevent duplicate
    if (workOrders.find(w => w.defectId === defectId && w.status !== 'rejected')) {
      addToast({ type:'warning', title:'Work order already exists', message:`${defectId} already has an open work order.` });
      return null;
    }
    const wo = computeWorkOrder(defect, buses, schoolZones, workOrders.length + 1);
    set(state => ({
      workOrders: [...state.workOrders, wo],
      defects: state.defects.map(d => d.id === defectId ? {...d, workOrderId: wo.id} : d),
      kpis: computeKPIs(state.buses, state.incidents, state.defects, [...state.workOrders, wo], state.edgeNodes),
    }));
    addAgentLog({
      agentId:'civil_engineer', timestamp:new Date().toISOString(),
      action:`Generated work order ${wo.id} for ${defect.category} at ${defect.locationLabel}`,
      entityId:wo.id, entityType:'work_order',
      reasoning:wo.reasoningTrace.join(' → '),
      outcome:'success',
    });
    addToast({ type:'success', title:`Work Order ${wo.id} Created`, message:`Priority ${wo.priorityScore}/100 · SLA ${wo.slaHours}h` });
    return wo;
  },

  updateWorkOrderStatus: (id, status, note) => set(state => ({
    workOrders: state.workOrders.map(w => w.id === id ? {
      ...w, status, updatedAt: new Date().toISOString(),
      actions: note ? [...w.actions, `${note} — ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`] : w.actions,
    } : w),
  })),

  assignContractor: (id, contractor) => set(state => ({
    workOrders: state.workOrders.map(w => w.id === id ? {
      ...w, contractorName: contractor, updatedAt: new Date().toISOString(),
      actions: [...w.actions, `Assigned to ${contractor} — ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`],
    } : w),
  })),

  triggerVerification: (workOrderId) => {
    const { workOrders, defects, addToast, addAgentLog } = get();
    const wo = workOrders.find(w => w.id === workOrderId);
    if (!wo) return;
    const result = verifyRepair(wo);
    set(state => ({
      workOrders: state.workOrders.map(w => w.id === workOrderId ? {
        ...w,
        status: result.pass ? 'ai_verified' : 'reopened',
        verificationResult: result.pass ? 'pass' : 'fail',
        verificationAt: new Date().toISOString(),
        afterPhotoPlaceholder: result.pass ? 'after_photo_placeholder.jpg' : undefined,
        actions: [...w.actions, result.pass
          ? `AI Verified — re-scan clean ✓ — ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`
          : `Repair FAILED verification — reopened — ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`
        ],
      } : w),
      defects: result.pass ? state.defects.map(d => d.id === wo.defectId ? {...d, status:'resolved'} : d) : state.defects,
    }));
    if (result.pass) {
      addToast({ type:'success', title:'✓ Repair AI-Verified', message:`${workOrderId} — re-scan confirmed clean.` });
      addAgentLog({ agentId:'civil_engineer', timestamp:new Date().toISOString(), action:`Verified repair ${workOrderId} — PASS`, entityId:workOrderId, entityType:'work_order', reasoning:result.reason, outcome:'success' });
    } else {
      addToast({ type:'error', title:'✗ Repair Failed Verification', message:`${workOrderId} reopened — defect persists.` });
      addAgentLog({ agentId:'civil_engineer', timestamp:new Date().toISOString(), action:`Verified repair ${workOrderId} — FAIL`, entityId:workOrderId, entityType:'work_order', reasoning:result.reason, outcome:'error' });
    }
    void defects;
  },

  // ── Pursuit ───────────────────────────────────────────────
  startPursuit: (incidentId) => {
    const { incidents, buses, pursuitSessions, addToast, addAgentLog, updateIncidentStatus } = get();
    const incident = incidents.find(i => i.id === incidentId);
    if (!incident?.plateNumber) { addToast({ type:'error', title:'No plate number', message:'Pursuit requires an ANPR-detected plate.' }); return null; }
    if (pursuitSessions.find(p => p.incidentId === incidentId && p.status !== 'closed')) {
      addToast({ type:'warning', title:'Pursuit already active', message:`Incident ${incidentId} already being tracked.` }); return null;
    }
    const session = generatePursuitSightings(incident, buses, pursuitSessions.length + 1);
    set(state => ({
      pursuitSessions: [...state.pursuitSessions, session],
      incidents: state.incidents.map(i => i.id === incidentId ? {...i, pursuitId: session.id} : i),
    }));
    updateIncidentStatus(incidentId, 'under_review', `Pursuit ${session.id} initiated`);
    addAgentLog({ agentId:'pursuit', timestamp:new Date().toISOString(), action:`Pursuit ${session.id} started for plate ${incident.plateNumber}`, entityId:session.id, entityType:'pursuit', reasoning:`Plate broadcast to ${buses.filter(b=>b.status==='active').length} active buses`, outcome:'success' });
    addToast({ type:'info', title:`🔍 Pursuit ${session.id} Initiated`, message:`Tracking ${incident.plateNumber} — ${session.sightings.length} initial sightings` });
    return session;
  },

  addPursuitSighting: (pursuitId, sighting) => set(state => ({
    pursuitSessions: state.pursuitSessions.map(p => p.id === pursuitId ? {
      ...p,
      sightings: [...p.sightings, sighting],
      fusedConfidence: Math.min(99, p.fusedConfidence + (sighting.confidence - p.fusedConfidence) * 0.4),
      updatedAt: new Date().toISOString(),
    } : p),
  })),

  generateEvidenceHash: (pursuitId) => {
    const { pursuitSessions, addToast } = get();
    const session = pursuitSessions.find(p => p.id === pursuitId);
    if (!session) return;
    const packet = buildEvidencePacket(session);
    set(state => ({
      pursuitSessions: state.pursuitSessions.map(p => p.id === pursuitId ? {
        ...p,
        evidenceHash: packet.hash,
        chainOfCustody: [...p.chainOfCustody, { action:'Evidence packet generated', actor:'System', timestamp:new Date().toISOString() }],
      } : p),
    }));
    addToast({ type:'success', title:'Evidence Packet Sealed', message:`SHA-256: ${packet.hash.slice(0,16)}…` });
  },

  sharePursuitPolice: (pursuitId) => {
    const { addToast, addAgentLog } = get();
    const link = `https://navik.tgsrtc.gov.in/evidence/${pursuitId}?token=${Math.random().toString(36).slice(2,10)}&exp=${Date.now()+3600000}`;
    set(state => ({
      pursuitSessions: state.pursuitSessions.map(p => p.id === pursuitId ? {
        ...p,
        shareLink: link, status: 'handed_to_police',
        chainOfCustody: [...p.chainOfCustody,
          { action:'Shared with TS Traffic Police', actor:'Operator', timestamp:new Date().toISOString() },
        ],
        actions: [...p.actions, `Shared with TS Traffic Police — ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`],
      } : p),
    }));
    addToast({ type:'success', title:'🔐 Shared with TS Traffic Police', message:'Secure expiring link created. Chain-of-custody logged.' });
    addAgentLog({ agentId:'pursuit', timestamp:new Date().toISOString(), action:`Evidence shared with TS Traffic Police for ${pursuitId}`, entityId:pursuitId, entityType:'pursuit', reasoning:'Secure one-time link generated, 1h TTL, SHA-256 integrity verified', outcome:'success' });
  },

  updatePursuitStatus: (id, status) => set(state => ({
    pursuitSessions: state.pursuitSessions.map(p => p.id === id ? {...p, status, updatedAt:new Date().toISOString()} : p),
  })),

  // ── Edge Network ──────────────────────────────────────────
  updateBandwidthPolicy: (policy) => set(state => ({
    bandwidthPolicy: { ...state.bandwidthPolicy, ...policy },
  })),

  simulateNetworkDrop: (busId) => {
    set(state => ({
      edgeNodes: state.edgeNodes.map(n => n.busId === busId ? {...n, uplinkStatus:'offline', queuedEvents: n.queuedEvents + Math.floor(Math.random()*5)+2} : n),
      buses: state.buses.map(b => b.id === busId ? {...b} : b),
    }));
    get().addToast({ type:'warning', title:'Network Drop Simulated', message:`${busId} — edge node now offline, buffering events.` });
  },

  simulateReconnect: (busId) => {
    const node = get().edgeNodes.find(n => n.busId === busId);
    if (!node) return;
    const queued = node.queuedEvents;
    set(state => ({
      edgeNodes: state.edgeNodes.map(n => n.busId === busId ? {
        ...n, uplinkStatus:'online', queuedEvents:0,
        uploadedEventsToday: n.uploadedEventsToday + queued,
        lastHeartbeat: new Date().toISOString(),
      } : n),
    }));
    get().addToast({ type:'success', title:'Reconnected & Synced', message:`${busId} — ${queued} queued events uploaded successfully.` });
  },

  startOTAUpdate: (busIds) => {
    set(state => ({
      edgeNodes: state.edgeNodes.map(n => busIds.includes(n.busId) ? {...n, otaProgress:0, otaError:null} : n),
    }));
    // Simulate progress
    busIds.forEach((busId, i) => {
      const duration = 3000 + i * 800;
      const interval = setInterval(() => {
        set(state => ({
          edgeNodes: state.edgeNodes.map(n => {
            if (n.busId !== busId || n.otaProgress === null) return n;
            const next = Math.min(100, n.otaProgress + Math.floor(Math.random()*15)+5);
            if (next >= 100) {
              clearInterval(interval);
              // 10% chance of failure
              if (Math.random() < 0.1) {
                return { ...n, otaProgress:null, otaError:'Checksum mismatch — rollback initiated', modelVersion:'v2.3.1' };
              }
              return { ...n, otaProgress:null, modelVersion:'v2.4.0', otaError:null };
            }
            return { ...n, otaProgress:next };
          }),
        }));
      }, duration / 10);
    });
    get().addToast({ type:'info', title:'OTA Update Started', message:`Rolling v2.4.0 to ${busIds.length} edge nodes.` });
  },

  rollbackOTA: (busId) => {
    set(state => ({
      edgeNodes: state.edgeNodes.map(n => n.busId === busId ? {...n, modelVersion:'v2.3.1', otaError:null, otaProgress:null} : n),
    }));
    get().addToast({ type:'warning', title:'OTA Rolled Back', message:`${busId} reverted to v2.3.1.` });
  },

  // ── Road Health ───────────────────────────────────────────
  applyRerouteSuggestion: (segmentId) => {
    const seg = get().roadHealthSegments.find(s => s.id === segmentId);
    if (!seg) return;
    set(state => ({
      roadHealthSegments: state.roadHealthSegments.map(s => s.id === segmentId ? {
        ...s, lastScannedAt:new Date().toISOString(), hoursSinceLastScan:0, coverageFreshness:'fresh',
      } : s),
    }));
    get().addToast({ type:'success', title:'Reroute Applied', message:`Coverage updated for ${seg.name}.` });
  },

  prePositionCrew: (segmentId) => {
    const { generateWorkOrder, defects, addToast } = get();
    const relatedDefect = defects.find(d => d.roadSegmentId === segmentId && d.status === 'pending');
    if (relatedDefect) {
      const wo = generateWorkOrder(relatedDefect.id);
      if (wo) addToast({ type:'success', title:'Crew Pre-Positioned', message:`Draft work order ${wo.id} created for ${relatedDefect.locationLabel}.` });
    } else {
      addToast({ type:'info', title:'Pre-position noted', message:'No pending defects found on segment — crew stand-by logged.' });
    }
  },

  // ── Traffic Advisor ───────────────────────────────────────
  generateAdvisory: (segmentId) => {
    const { trafficSegments, addToast, addAgentLog } = get();
    const seg = trafficSegments.find(s => s.id === segmentId);
    if (!seg) return null;

    const actions: AdvisoryAction[] = [
      {
        type:'signal_retiming', label:'Signal Re-timing', rank:1,
        rationale:`Adaptive signal control on ${seg.name} can reduce cycle time by ~35%, improving throughput.`,
        expectedCongestionAfter: Math.max(20, seg.congestionScore - 28),
        expectedSpeedAfter:      Math.min(60, seg.avgSpeed + 18),
        expectedDelayAfter:      Math.max(0, seg.delay - 12),
        affectedRoutes:          ['5K','10H','218D'],
      },
      {
        type:'diversion', label:'Divert via Parallel Road', rank:2,
        alternatRoad:'Inner Ring Road diversion via Banjara Hills Rd 12',
        rationale:'Shift ~30% of through-traffic to parallel corridor to reduce volume on primary segment.',
        expectedCongestionAfter: Math.max(30, seg.congestionScore - 20),
        expectedSpeedAfter:      Math.min(55, seg.avgSpeed + 12),
        expectedDelayAfter:      Math.max(2, seg.delay - 8),
        affectedRoutes:          ['65X','142C'],
      },
      {
        type:'deploy_marshal', label:'Deploy Traffic Marshal', rank:3,
        rationale:'Manual traffic management at key junction can improve flow at peak times.',
        expectedCongestionAfter: Math.max(40, seg.congestionScore - 14),
        expectedSpeedAfter:      Math.min(50, seg.avgSpeed + 8),
        expectedDelayAfter:      Math.max(4, seg.delay - 5),
        affectedRoutes:          ['27D','33P'],
      },
    ];

    const reasoning = [
      `Segment "${seg.name}" — current congestion score: ${seg.congestionScore}/100`,
      `Average speed: ${seg.avgSpeed} km/h (threshold: <25 km/h triggers advisory)`,
      `Route delay: +${seg.delay} min above schedule`,
      `Vehicle density: ${seg.vehicleDensity} vehicles/km`,
      `Signal re-timing ranked #1 — highest throughput improvement, lowest deployment cost`,
      `Diversion ranked #2 — requires field confirmation of alternate route capacity`,
      `Marshal deployment ranked #3 — effective but personnel-dependent`,
    ];

    const advisory: TrafficAdvisory = {
      id: `ADV-${String(get().advisories.length+1).padStart(3,'0')}`,
      segmentId,
      segmentName: seg.name,
      createdAt: new Date().toISOString(),
      status: 'proposed',
      beforeCongestion: seg.congestionScore,
      beforeSpeed:      seg.avgSpeed,
      beforeDelay:      seg.delay,
      actions,
      selectedActionIndex: 0,
      simulationRun: false,
      logEntry: '',
      reasoningTrace: reasoning,
    };

    set(state => ({ advisories: [...state.advisories, advisory] }));
    addAgentLog({ agentId:'traffic_advisor', timestamp:new Date().toISOString(), action:`Advisory ${advisory.id} generated for ${seg.name}`, entityId:advisory.id, entityType:'advisory', reasoning:reasoning.slice(0,3).join(' · '), outcome:'success' });
    addToast({ type:'info', title:`Advisory ${advisory.id} Ready`, message:`${actions.length} ranked actions for ${seg.name}` });
    return advisory;
  },

  simulateAdvisory: (advisoryId, actionIdx) => {
    set(state => ({
      advisories: state.advisories.map(a => a.id === advisoryId ? {
        ...a, status:'simulated', selectedActionIndex:actionIdx, simulationRun:true,
      } : a),
    }));
    get().addToast({ type:'success', title:'Simulation Complete', message:'Before/after comparison ready.' });
  },

  applyAdvisory: (advisoryId) => {
    const { advisories, trafficSegments, addToast, addAgentLog } = get();
    const adv = advisories.find(a => a.id === advisoryId);
    if (!adv) return;
    const action = adv.actions[adv.selectedActionIndex];
    set(state => ({
      advisories: state.advisories.map(a => a.id === advisoryId ? {
        ...a, status:'applied', appliedAt:new Date().toISOString(),
        logEntry:`Applied: ${action.label} at ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`,
      } : a),
      trafficSegments: state.trafficSegments.map(s => s.id === adv.segmentId ? {
        ...s,
        congestionScore: action.expectedCongestionAfter,
        avgSpeed:        action.expectedSpeedAfter,
        delay:           action.expectedDelayAfter,
        advisoryApplied: true,
        advisoryId:      advisoryId,
      } : s),
    }));
    get().recomputeKPIs();
    addAgentLog({ agentId:'traffic_advisor', timestamp:new Date().toISOString(), action:`Applied advisory ${advisoryId}: ${action.label}`, entityId:advisoryId, entityType:'advisory', reasoning:`Congestion: ${adv.beforeCongestion}→${action.expectedCongestionAfter}, Speed: ${adv.beforeSpeed}→${action.expectedSpeedAfter} km/h`, outcome:'success' });
    addToast({ type:'success', title:'Advisory Applied', message:`${action.label} — live map & KPIs updated.` });
    void trafficSegments;
  },

  undoAdvisory: (advisoryId) => {
    const { advisories, addToast } = get();
    const adv = advisories.find(a => a.id === advisoryId);
    if (!adv) return;
    set(state => ({
      advisories: state.advisories.map(a => a.id === advisoryId ? {
        ...a, status:'undone', undoneAt:new Date().toISOString(),
      } : a),
      trafficSegments: state.trafficSegments.map(s => s.id === adv.segmentId ? {
        ...s,
        congestionScore: adv.beforeCongestion,
        avgSpeed:        adv.beforeSpeed,
        delay:           adv.beforeDelay,
        advisoryApplied: false,
        advisoryId:      undefined,
      } : s),
    }));
    get().recomputeKPIs();
    addToast({ type:'warning', title:'Advisory Undone', message:`${adv.segmentName} reverted to original state.` });
  },

  // ── Filters ───────────────────────────────────────────────
  setIncidentFilter: (f) => set(s => ({ incidentFilter: {...s.incidentFilter, ...f} })),
  setDefectFilter:   (f) => set(s => ({ defectFilter:   {...s.defectFilter,   ...f} })),
  setBusFilter:      (f) => set(s => ({ busFilter:      {...s.busFilter,      ...f} })),
  setWoFilter:       (f) => set(s => ({ woFilter:       {...s.woFilter,       ...f} })),

  // ── Toasts ────────────────────────────────────────────────
  addToast: (toast) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    set(s => ({ toasts: [...s.toasts, {...toast, id}] }));
    setTimeout(() => get().removeToast(id), 5000);
  },
  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  // ── Agent log ─────────────────────────────────────────────
  addAgentLog: (entry) => set(s => ({
    agentActivityLog: [{ ...entry, id:`aal-${Date.now()}` }, ...s.agentActivityLog].slice(0, 100),
  })),

  // ── Simulation ────────────────────────────────────────────
  moveBuses: () => set(state => {
    const buses = state.buses.map(bus => {
      if (bus.status !== 'active') return bus;
      const poly = bus.routePolyline;
      const nextIdx = (bus.currentRouteIndex + 1) % poly.length;
      const target  = poly[nextIdx];
      const jitter  = () => (Math.random()-0.5)*0.0005;
      return {
        ...bus,
        currentRouteIndex: nextIdx,
        position: { lat: target.lat + jitter(), lng: target.lng + jitter() },
        speed:   Math.round(Math.max(15, Math.min(65, bus.speed + (Math.random()-0.5)*6))),
        heading: Math.round(
          Math.atan2(target.lng - bus.position.lng, target.lat - bus.position.lat) * 180 / Math.PI + 360
        ) % 360,
        lastSeen: new Date().toISOString(),
      };
    });
    return { buses };
  }),

  streamLiveEvent: () => {
    const { addIncident, addToast } = get();
    const inc = makeLiveIncident();
    addIncident(inc);
    const isANPR = !!inc.plateNumber;
    addToast({
      type:    inc.severity === 'critical' ? 'error' : inc.severity === 'high' ? 'warning' : 'info',
      title:   `${isANPR ? '🚨' : inc.type === 'congestion_alert' ? '🚦' : '⚠'} ${inc.locationLabel}`,
      message: inc.description.replace('LIVE: ',''),
    });
  },

  recomputeKPIs: () => set(state => ({
    kpis: computeKPIs(state.buses, state.incidents, state.defects, state.workOrders, state.edgeNodes),
  })),
}));
