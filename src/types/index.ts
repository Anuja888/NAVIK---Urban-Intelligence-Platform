// ═══════════════════════════════════════════════════════════
// NAVIK — Complete Type Definitions
// SIH PS #26124 · BEL Urban Intelligence Platform
// ═══════════════════════════════════════════════════════════

// ── Geo ─────────────────────────────────────────────────────
export interface LatLng { lat: number; lng: number; }

// ── Bus / Fleet ──────────────────────────────────────────────
export type BusStatus = 'active' | 'idle' | 'maintenance' | 'offline';

export interface Camera {
  id: string;
  label: 'Front' | 'Rear' | 'Left' | 'Right' | 'Cabin';
  status: 'online' | 'offline' | 'degraded';
}

export interface Bus {
  id: string;
  routeNumber: string;
  routeName: string;
  driverName: string;
  licensePlate: string;
  status: BusStatus;
  speed: number;          // km/h
  heading: number;        // degrees
  position: LatLng;
  lastSeen: string;       // ISO
  cameras: Camera[];
  defectsReported: number;
  routePolyline: LatLng[];
  currentRouteIndex: number;
  startTime: string;
  endTime: string;
  edgeNodeId: string;     // links to EdgeNode
}

// ── Defects / Infrastructure ─────────────────────────────────
export type DefectCategory =
  | 'pothole' | 'waterlogging' | 'missing_signboard'
  | 'missing_divider' | 'missing_zebra_crossing' | 'damaged_road';

export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type DefectStatus = 'pending' | 'under_review' | 'dispatched' | 'resolved';

export interface RoadDefect {
  id: string;
  category: DefectCategory;
  severity: Severity;
  status: DefectStatus;
  position: LatLng;
  detectedBy: string;
  detectedAt: string;
  description: string;
  confidenceScore: number;
  recurrenceCount: number;
  imageFrame?: string;
  locationLabel: string;
  workOrderId?: string;   // linked work order
  roadSegmentId?: string;
}

// ── Incidents ────────────────────────────────────────────────
export type IncidentType =
  | 'hit_and_run' | 'rash_driving' | 'pedestrian_hazard'
  | 'school_zone_alert' | 'road_defect' | 'congestion_alert'
  | 'vehicle_breakdown' | 'waterlogging_critical';

export type IncidentStatus = 'new' | 'under_review' | 'dispatched' | 'resolved';

export interface AIPipelineStep {
  label: string;
  timestamp: string;
  duration: number;
}

export interface VehicleDetection {
  type: 'car' | 'bus' | 'two_wheeler' | 'truck' | 'auto';
  count: number;
  confidence: number;
}

export interface Incident {
  id: string;
  type: IncidentType;
  status: IncidentStatus;
  severity: Severity;
  position: LatLng;
  detectedBy: string;
  timestamp: string;
  description: string;
  locationLabel: string;
  plateNumber?: string;
  plateConfidence?: number;
  evidenceFrame?: string;
  pedestrianCount?: number;
  isSchoolZone?: boolean;
  vehicleCounts?: VehicleDetection[];
  congestionScore?: number;
  aiPipeline?: AIPipelineStep[];
  actions?: string[];
  assignedTo?: string;
  resolvedAt?: string;
  pursuitId?: string;     // linked pursuit session
}

// ── Traffic ──────────────────────────────────────────────────
export interface TrafficSegment {
  id: string;
  name: string;
  from: LatLng;
  to: LatLng;
  congestionScore: number;
  vehicleDensity: number;
  avgSpeed: number;
  delay: number;
  advisoryApplied?: boolean;
  advisoryId?: string;
}

export interface HeatPoint { lat: number; lng: number; intensity: number; }

export interface RouteDelay {
  route: string;
  routeName: string;
  data: Array<{ hour: string; scheduled: number; actual: number; delay: number }>;
}

export interface ODFlowEntry {
  from: string; to: string;
  fromPos: LatLng; toPos: LatLng;
  volume: number;
}

export interface SchoolZone {
  id: string; name: string;
  position: LatLng; radius: number;
  alertTimes: Array<{ start: string; end: string }>;
}

// ── Work Orders (Civil Engineer Agent) ───────────────────────
export type WorkOrderStatus =
  | 'drafted' | 'approved' | 'crew_dispatched'
  | 'in_progress' | 'completed' | 'ai_verified' | 'rejected' | 'reopened';

export type RepairMethod =
  | 'cold_mix_patch' | 'hot_mix_patch' | 'full_depth_reclamation'
  | 'micro_surfacing' | 'fix_drainage_first';

export interface WorkOrderBOQ {
  bituminousMixKg: number;
  tackCoatLitres: number;
  aggregateCuM: number;
  crewSize: number;
  equipment: string[];
  estimatedHours: number;
  estimatedCostINR: number;
  trafficManagementPlan: string;
}

export interface WorkOrder {
  id: string;                  // WO-YYYYMMDD-NNN
  defectId: string;
  defectCategory: DefectCategory;
  locationLabel: string;
  position: LatLng;
  severity: Severity;
  status: WorkOrderStatus;
  createdAt: string;
  updatedAt: string;
  // Dimensions (Civil Agent computed)
  estimatedLengthCm: number;
  estimatedWidthCm: number;
  depthClass: 'shallow' | 'medium' | 'deep';
  areaSqM: number;
  roadClass: 'arterial' | 'sub_arterial' | 'local';
  trafficVolumeClass: 'high' | 'medium' | 'low';
  nearSchoolZone: boolean;
  rainfallForecastMM: number;
  priorityScore: number;       // 0-100
  slaHours: number;
  slaDeadline: string;         // ISO
  repairMethod: RepairMethod;
  repairMethodLabel: string;
  boq: WorkOrderBOQ;
  ghmcCircle: string;
  ghmcWard: string;
  contractorName: string | null;
  // Action log
  actions: string[];
  reasoningTrace: string[];    // agent's reasoning steps
  // Closed-loop
  verificationScheduled: boolean;
  verificationResult?: 'pass' | 'fail';
  verificationAt?: string;
  afterPhotoPlaceholder?: string;
}

// ── Pursuit Agent ─────────────────────────────────────────────
export type PursuitStatus = 'tracking' | 'located' | 'handed_to_police' | 'closed';

export interface PursuitSighting {
  id: string;
  pursuitId: string;
  busId: string;
  cameraLabel: string;
  timestamp: string;
  position: LatLng;
  confidence: number;
  plateRead: string;
  heading: number;
  speed: number;
  locationLabel: string;
  frameIndex: number;
}

export interface PursuitSession {
  id: string;
  incidentId: string;
  plateNumber: string;
  status: PursuitStatus;
  startedAt: string;
  updatedAt: string;
  sightings: PursuitSighting[];
  fusedConfidence: number;
  predictedRoute: LatLng[];
  etaZoneCenter: LatLng | null;
  evidenceHash: string | null;
  shareLink: string | null;
  chainOfCustody: Array<{ action: string; actor: string; timestamp: string }>;
  draftComplaintText: string;
  actions: string[];
}

// ── Edge Network (Feature 3) ──────────────────────────────────
export type EdgeUplink = 'online' | 'buffering' | 'offline';
export type ModelVersion = 'v2.3.1' | 'v2.4.0';

export interface EdgeNode {
  id: string;
  busId: string;
  fps: number;
  gpuTempC: number;
  inferenceLatencyMs: number;
  modelVersion: ModelVersion;
  cameraStatuses: Array<{ label: string; status: 'online' | 'offline' | 'degraded' }>;
  uplinkStatus: EdgeUplink;
  queuedEvents: number;       // buffered locally during drop
  totalEventsToday: number;
  uploadedEventsToday: number;
  bandwidthSavedMB: number;
  lastHeartbeat: string;
  otaProgress: number | null; // null = idle, 0-100 = updating
  otaError: string | null;
}

export interface BandwidthPolicy {
  minConfidenceToUpload: number;  // 0-100
  keyframeCount: number;          // per event
  clipLengthSec: number;
}

// ── Road Health (Feature 4) ───────────────────────────────────
export interface RoadHealthSegment {
  id: string;
  name: string;
  from: LatLng; to: LatLng;
  rhi: number;                    // 0-100, higher=healthier
  defectDensity: number;          // defects per km
  recurrenceScore: number;
  ageYears: number;
  trafficLoad: 'high' | 'medium' | 'low';
  rainExposure: number;           // 0-10
  lastScannedAt: string;          // ISO
  hoursSinceLastScan: number;
  failureProbability30d: number;  // 0-1
  predictedPotholeCount: number;
  coverageFreshness: 'fresh' | 'stale' | 'critical'; // <2h / 2-6h / >6h
  suggestedRerouteBus?: string;
  prePositionCrewRecommended: boolean;
}

// ── Traffic Advisor Agent (Feature 5) ────────────────────────
export type AdvisoryActionType =
  | 'signal_retiming' | 'diversion' | 'deploy_marshal'
  | 'hold_buses' | 'dynamic_speed_limit';

export interface AdvisoryAction {
  type: AdvisoryActionType;
  label: string;
  rationale: string;
  alternatRoad?: string;
  expectedCongestionAfter: number;
  expectedSpeedAfter: number;
  expectedDelayAfter: number;
  affectedRoutes: string[];
  rank: number;
}

export interface TrafficAdvisory {
  id: string;
  segmentId: string;
  segmentName: string;
  createdAt: string;
  status: 'proposed' | 'simulated' | 'applied' | 'undone';
  beforeCongestion: number;
  beforeSpeed: number;
  beforeDelay: number;
  actions: AdvisoryAction[];
  selectedActionIndex: number;
  simulationRun: boolean;
  appliedAt?: string;
  undoneAt?: string;
  logEntry: string;
  reasoningTrace: string[];
}

// ── Agents Hub ────────────────────────────────────────────────
export type AgentId = 'civil_engineer' | 'pursuit' | 'traffic_advisor' | 'safety_guardian';
export type AgentStatus = 'idle' | 'active' | 'busy' | 'error';

export interface AgentActivityEntry {
  id: string;
  agentId: AgentId;
  timestamp: string;
  action: string;
  entityId?: string;
  entityType?: string;
  reasoning?: string;
  outcome: 'success' | 'pending' | 'error';
}

// ── Reports ───────────────────────────────────────────────────
export type ReportType =
  | 'infrastructure_deficiency' | 'incident_summary'
  | 'traffic_analytics' | 'fleet_performance' | 'school_safety';

export interface ReportConfig {
  type: ReportType;
  dateFrom: string;
  dateTo: string;
  routes?: string[];
}

// ── App State ─────────────────────────────────────────────────
export type MapLayer =
  | 'buses' | 'incidents' | 'heatmap' | 'defects'
  | 'school_zones' | 'od_flow' | 'road_health' | 'pursuit_trail';

export type MapMode = 'standard' | 'od_flow' | 'road_health';

export type AppView =
  | 'dashboard' | 'fleet' | 'incidents' | 'agents'
  | 'civil_works' | 'road_health' | 'edge_network'
  | 'analytics' | 'reports' | 'live_feed';

export interface LiveFeedDetection {
  id: string; category: string; confidence: number;
  bbox: { x: number; y: number; w: number; h: number };
  label: string; severity?: Severity; timestamp: string;
}

export interface DashboardKPIs {
  activeBuses: number;
  liveIncidents: number;
  avgRouteDelay: number;
  defectsPending: number;
  workOrdersOpen: number;
  bandwidthSavedGB: number;
}
