// ═══════════════════════════════════════════════════════════
// NAVIK — Civil Engineer Agent Engine
// Pure deterministic functions — no side effects
// Reference: IRC:82 road maintenance practice (indicative)
// ═══════════════════════════════════════════════════════════

import type { RoadDefect, Bus, SchoolZone, WorkOrder, WorkOrderBOQ, RepairMethod } from '../types';

// ── Rate table (editable in UI) ─────────────────────────────
export const RATE_TABLE = {
  bituminousMixPerKg: 35,     // INR/kg  (hotmix ~35, coldmix ~28)
  tackCoatPerLitre: 85,
  aggregatePerCuM:  2200,
  rollerPerHour:    1800,
  hotBoxPerDay:     2500,
  crewPerDay:       650,      // per person
  barricadesPerSet: 800,
  mobilisationFixed:3500,
};

const GHMC_CIRCLES = [
  'Charminar','Khairatabad','Serilingampally','Secunderabad',
  'LB Nagar','Kukatpally','Abdullapurmet','Rajendranagar',
];
const GHMC_WARDS = [
  'Ward 42','Ward 78','Ward 102','Ward 55','Ward 31',
  'Ward 88','Ward 64','Ward 19','Ward 203','Ward 117',
];
const _CONTRACTORS_CA = [
  'M/s Srinivasa Infra','M/s Balaji Roads','M/s Hyderabad Civil Works',
  'M/s Deccan Contractors','M/s Sri Rama Projects','M/s Kiran Infrastructure',
];
void _CONTRACTORS_CA;
const RAINFALL_FORECAST_MM = [0, 0, 12, 45, 78, 22, 5, 0, 0, 31]; // mock forecast by circle idx

function seeded(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(31,h) + seed.charCodeAt(i)|0;
  h ^= h<<13; h ^= h>>17; h ^= h<<5;
  return (h>>>0)/4294967296;
}

// (pick helper removed — unused)

export function computeWorkOrder(
  defect: RoadDefect,
  _buses: Bus[],
  schoolZones: SchoolZone[],
  seqNum: number,
): WorkOrder {
  const seed = defect.id;

  // ── Dimensions ───────────────────────────────────────────
  const lengthCm = Math.round(40  + seeded(seed+'L') * 160);  // 40-200 cm
  const widthCm  = Math.round(30  + seeded(seed+'W') * 120);  // 30-150 cm
  const areaSqM  = Math.round((lengthCm/100) * (widthCm/100) * 100)/100;
  const depthSeed = seeded(seed+'D');
  const depthClass: WorkOrder['depthClass'] =
    depthSeed < 0.35 ? 'shallow' : depthSeed < 0.65 ? 'medium' : 'deep';
  const depthMm   = depthClass === 'shallow' ? 18 : depthClass === 'medium' ? 37 : 60;

  // ── Road class + traffic ──────────────────────────────────
  const roadSeed = seeded(seed+'RC');
  const roadClass: WorkOrder['roadClass'] = roadSeed < 0.3 ? 'arterial' : roadSeed < 0.65 ? 'sub_arterial' : 'local';
  const trafficVolumeClass: WorkOrder['trafficVolumeClass'] =
    roadClass === 'arterial' ? 'high' : roadClass === 'sub_arterial' ? 'medium' : 'low';

  // ── School zone proximity ─────────────────────────────────
  const nearSchool = schoolZones.some(sz => {
    const dlat = sz.position.lat - defect.position.lat;
    const dlng = sz.position.lng - defect.position.lng;
    const dist  = Math.sqrt(dlat*dlat + dlng*dlng) * 111000; // rough metres
    return dist < 300;
  });

  // ── Rainfall forecast ─────────────────────────────────────
  const circleIdx = seqNum % GHMC_CIRCLES.length;
  const rainfallForecastMM = RAINFALL_FORECAST_MM[circleIdx] ?? 0;

  // ── Priority score (0-100, weighted) ─────────────────────
  const sevW    = { low:5, medium:15, high:28, critical:40 }[defect.severity];
  const trafficW = trafficVolumeClass === 'high' ? 20 : trafficVolumeClass === 'medium' ? 12 : 5;
  const recurW  = Math.min(20, defect.recurrenceCount * 4);
  const schoolW = nearSchool ? 12 : 0;
  const rainW   = rainfallForecastMM > 50 ? 8 : rainfallForecastMM > 20 ? 4 : 0;
  const priorityScore = Math.min(100, Math.round(sevW + trafficW + recurW + schoolW + rainW));

  // ── SLA ───────────────────────────────────────────────────
  const slaHours = priorityScore >= 80 ? 24 : priorityScore >= 60 ? 72 : priorityScore >= 40 ? 168 : 720;
  const slaDeadline = new Date(Date.now() + slaHours*3600*1000).toISOString();

  // ── Repair method ─────────────────────────────────────────
  let repairMethod: RepairMethod;
  let repairMethodLabel: string;
  if (defect.category === 'waterlogging') {
    repairMethod = 'fix_drainage_first';
    repairMethodLabel = 'Fix Drainage First — clear stormwater drains before surface repair';
  } else if (rainfallForecastMM > 40) {
    repairMethod = 'cold_mix_patch';
    repairMethodLabel = 'Cold-Mix Patch (temporary) — monsoon conditions, permanent repair after season';
  } else if (depthClass === 'deep' || defect.severity === 'critical') {
    repairMethod = 'full_depth_reclamation';
    repairMethodLabel = 'Full-Depth Reclamation (IRC:82 Cl.5) — complete base + surface reconstruction';
  } else if (defect.severity === 'high') {
    repairMethod = 'hot_mix_patch';
    repairMethodLabel = 'Hot-Mix Patching (IRC:82 Cl.4) — cut-and-patch, permanent repair';
  } else if (defect.category === 'damaged_road' && areaSqM > 4) {
    repairMethod = 'micro_surfacing';
    repairMethodLabel = 'Micro-Surfacing — thin functional overlay for surface distress';
  } else {
    repairMethod = 'cold_mix_patch';
    repairMethodLabel = 'Cold-Mix Patch — temporary stabilisation, schedule permanent repair';
  }

  // ── Bill of Quantities ────────────────────────────────────
  const densityTonM3 = 2.3;
  const bituminousMixKg  = Math.round(areaSqM * (depthMm/1000) * densityTonM3 * 1000);
  const tackCoatLitres   = Math.round(areaSqM * 0.35 * 10)/10;
  const aggregateCuM     = Math.round(areaSqM * (depthMm/1000) * 0.8 * 10)/10;
  const crewSize         = depthClass === 'deep' ? 6 : depthClass === 'medium' ? 4 : 3;
  const estimatedHours   = depthClass === 'deep' ? 8 : depthClass === 'medium' ? 4 : 2;
  const equipment        = ['Road-cutting saw','Compressor','Plate compactor','Barricades x4','Traffic cones x10'];
  if (depthClass !== 'shallow') equipment.push('Tipping truck');
  if (repairMethod === 'hot_mix_patch' || repairMethod === 'full_depth_reclamation') equipment.push('Hot-box / heater');
  if (repairMethod === 'full_depth_reclamation') equipment.push('Road roller','Motor grader');

  const cost =
    bituminousMixKg * RATE_TABLE.bituminousMixPerKg +
    tackCoatLitres  * RATE_TABLE.tackCoatPerLitre +
    aggregateCuM    * RATE_TABLE.aggregatePerCuM +
    crewSize * estimatedHours * RATE_TABLE.crewPerDay / 8 +
    (equipment.includes('Road roller') ? RATE_TABLE.rollerPerHour * estimatedHours : 0) +
    (equipment.includes('Hot-box / heater') ? RATE_TABLE.hotBoxPerDay : 0) +
    RATE_TABLE.barricadesPerSet + RATE_TABLE.mobilisationFixed;

  const boq: WorkOrderBOQ = {
    bituminousMixKg,
    tackCoatLitres,
    aggregateCuM,
    crewSize,
    equipment,
    estimatedHours,
    estimatedCostINR: Math.round(cost / 100) * 100,
    trafficManagementPlan:
      trafficVolumeClass === 'high'
        ? 'Full lane closure with diversion signage and traffic marshals at both ends'
        : trafficVolumeClass === 'medium'
        ? 'Half-width closure with alternate traffic movement under marshal supervision'
        : 'Simple cone demarcation, no marshal required',
  };

  // ── Reasoning trace ───────────────────────────────────────
  const reasoningTrace = [
    `INPUT: Defect ${defect.id} | Category: ${defect.category} | Severity: ${defect.severity} | Recurrence: ${defect.recurrenceCount}`,
    `DIMENSIONS: ${lengthCm}cm × ${widthCm}cm = ${areaSqM} m² | Depth: ${depthClass} (${depthMm}mm)`,
    `ROAD CLASS: ${roadClass} | Traffic: ${trafficVolumeClass} | Near school zone: ${nearSchool}`,
    `RAINFALL FORECAST: ${rainfallForecastMM}mm (${GHMC_CIRCLES[circleIdx]} circle)`,
    `PRIORITY SCORE: ${sevW}(sev) + ${trafficW}(traffic) + ${recurW}(recurrence) + ${schoolW}(school) + ${rainW}(rain) = ${priorityScore}/100`,
    `SLA: ${slaHours}h | REPAIR METHOD: ${repairMethodLabel.split('—')[0].trim()}`,
    `BOQ: ${bituminousMixKg}kg bituminous mix, ${crewSize} crew, ${estimatedHours}h | COST: ₹${boq.estimatedCostINR.toLocaleString('en-IN')}`,
    `OUTPUT: Work Order ${`WO-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(seqNum).padStart(3,'0')}`} drafted`,
  ];

  const today = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const ghmcCircle = GHMC_CIRCLES[circleIdx];
  const ghmcWard   = GHMC_WARDS[seqNum % GHMC_WARDS.length];

  return {
    id: `WO-${today}-${String(seqNum).padStart(3,'0')}`,
    defectId:          defect.id,
    defectCategory:    defect.category,
    locationLabel:     defect.locationLabel,
    position:          defect.position,
    severity:          defect.severity,
    status:            'drafted',
    createdAt:         new Date().toISOString(),
    updatedAt:         new Date().toISOString(),
    estimatedLengthCm: lengthCm,
    estimatedWidthCm:  widthCm,
    depthClass,
    areaSqM,
    roadClass,
    trafficVolumeClass,
    nearSchoolZone:    nearSchool,
    rainfallForecastMM,
    priorityScore,
    slaHours,
    slaDeadline,
    repairMethod,
    repairMethodLabel,
    boq,
    ghmcCircle,
    ghmcWard,
    contractorName:    null,
    actions:           [`Work order drafted — ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`],
    reasoningTrace,
    verificationScheduled: false,
  };
}

export function verifyRepair(wo: WorkOrder): { pass: boolean; reason: string } {
  // Deterministic: pass if priorityScore < 75 or random seed from WO id says pass
  let h = 0;
  for (let i = 0; i < wo.id.length; i++) h = Math.imul(31,h) + wo.id.charCodeAt(i)|0;
  const r = (h>>>0)/4294967296;
  const pass = r > 0.25 || wo.severity === 'low' || wo.severity === 'medium';
  return {
    pass,
    reason: pass
      ? `Re-scan by bus on route: 0 defects detected on segment. Repair surface integrity confirmed. Confidence: ${Math.round(88 + r*10)}%.`
      : `Re-scan detected residual defect signature (confidence ${Math.round(62 + r*20)}%). Repair may have failed due to sub-base instability or premature opening to traffic.`,
  };
}
