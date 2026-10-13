// ═══════════════════════════════════════════════════════════
// NAVIK — Seed Data Generator v3
// SIH PS #26124 · 50 buses · 30+ diverse incidents
// Agencies: TGSRTC (fleet) · GHMC (roads) · TS Traffic Police
// ═══════════════════════════════════════════════════════════

import type {
  Bus, Incident, RoadDefect, SchoolZone, TrafficSegment,
  HeatPoint, ODFlowEntry, LatLng, Camera,
  EdgeNode, RoadHealthSegment, AgentActivityEntry,
  Severity, IncidentStatus,
} from '../types';

// ── Seeded PRNG (deterministic) ────────────────────────────
function seededRand(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  return () => { h ^= h << 13; h ^= h >> 17; h ^= h << 5; return (h >>> 0) / 4294967296; };
}
function sr(seed: string, min: number, max: number): number {
  return seededRand(seed)() * (max - min) + min;
}
// (pick helper removed — unused)

// ── Hyderabad real corridor routes (15 routes) ─────────────
const ROUTES = [
  { number: '5K',   name: 'Secunderabad ↔ Kukatpally',         color: '#3dd5f3' },
  { number: '10H',  name: 'Hitech City ↔ Hayathnagar',         color: '#2ec4a0' },
  { number: '12C',  name: 'Charminar ↔ Chandrayangutta',       color: '#f5b83d' },
  { number: '27D',  name: 'Dilsukhnagar ↔ Patancheru',         color: '#a78bfa' },
  { number: '65X',  name: 'LB Nagar ↔ Ameerpet Express',       color: '#ff5c5c' },
  { number: '218D', name: 'Mehdipatnam ↔ Secunderabad',        color: '#3dd5f3' },
  { number: 'MF-1', name: 'Metro Feeder-1 MGBS↔Falaknuma',    color: '#f5b83d' },
  { number: 'MF-3', name: 'Metro Feeder-3 Miyapur↔KPHB',      color: '#2ec4a0' },
  { number: '88A',  name: 'Airport ↔ Raidurgam',              color: '#f5b83d' },
  { number: '142C', name: 'Jubilee Hills ↔ Old City',          color: '#3dd5f3' },
  { number: '7G',   name: 'Gachibowli ↔ Uppal via ORR',       color: '#5b8cff' },
  { number: '33P',  name: 'Punjagutta ↔ Ameerpet ↔ SR Nagar', color: '#2ec4a0' },
  { number: '49M',  name: 'Miyapur ↔ Madinaguda ↔ Kondapur',  color: '#ff8c42' },
  { number: 'E1',   name: 'Express-1 BHEL ↔ Koti',            color: '#a78bfa' },
  { number: 'N3',   name: 'Night-3 Secunderabad ↔ LB Nagar',  color: '#566a85' },
];

// ── Route polylines (real Hyderabad GPS corridors) ─────────
const ROUTE_POLYLINES: Record<string, LatLng[]> = {
  '5K': [
    {lat:17.4399,lng:78.4983},{lat:17.4455,lng:78.4921},{lat:17.4508,lng:78.4867},
    {lat:17.4562,lng:78.4810},{lat:17.4614,lng:78.4752},{lat:17.4667,lng:78.4698},
    {lat:17.4720,lng:78.4645},{lat:17.4773,lng:78.4590},{lat:17.4832,lng:78.4539},
    {lat:17.4880,lng:78.4476},{lat:17.4920,lng:78.4410},{lat:17.4960,lng:78.4345},
  ],
  '10H': [
    {lat:17.4474,lng:78.3763},{lat:17.4418,lng:78.3841},{lat:17.4365,lng:78.3920},
    {lat:17.4310,lng:78.3998},{lat:17.4258,lng:78.4075},{lat:17.4200,lng:78.4150},
    {lat:17.4147,lng:78.4224},{lat:17.4090,lng:78.4298},{lat:17.4036,lng:78.4373},
    {lat:17.3980,lng:78.4450},{lat:17.3930,lng:78.4520},{lat:17.3880,lng:78.4590},
  ],
  '12C': [
    {lat:17.3604,lng:78.4736},{lat:17.3648,lng:78.4798},{lat:17.3692,lng:78.4858},
    {lat:17.3738,lng:78.4916},{lat:17.3782,lng:78.4975},{lat:17.3827,lng:78.5033},
    {lat:17.3872,lng:78.5091},{lat:17.3918,lng:78.5148},{lat:17.3965,lng:78.5210},
  ],
  '27D': [
    {lat:17.3688,lng:78.5247},{lat:17.3720,lng:78.5165},{lat:17.3752,lng:78.5080},
    {lat:17.3784,lng:78.4995},{lat:17.3816,lng:78.4910},{lat:17.3850,lng:78.4830},
    {lat:17.3884,lng:78.4748},{lat:17.3920,lng:78.4665},{lat:17.3956,lng:78.4578},
    {lat:17.3990,lng:78.4490},{lat:17.4024,lng:78.4405},{lat:17.4060,lng:78.4318},
  ],
  '65X': [
    {lat:17.3494,lng:78.5522},{lat:17.3568,lng:78.5450},{lat:17.3642,lng:78.5376},
    {lat:17.3716,lng:78.5300},{lat:17.3790,lng:78.5222},{lat:17.3868,lng:78.5145},
    {lat:17.3948,lng:78.5065},{lat:17.4030,lng:78.4982},{lat:17.4112,lng:78.4900},
    {lat:17.4198,lng:78.4818},
  ],
  '218D': [
    {lat:17.3955,lng:78.4352},{lat:17.4020,lng:78.4418},{lat:17.4085,lng:78.4485},
    {lat:17.4150,lng:78.4550},{lat:17.4215,lng:78.4615},{lat:17.4280,lng:78.4680},
    {lat:17.4345,lng:78.4746},{lat:17.4410,lng:78.4812},{lat:17.4475,lng:78.4878},
    {lat:17.4540,lng:78.4944},
  ],
  'MF-1': [
    {lat:17.3800,lng:78.4744},{lat:17.3745,lng:78.4690},{lat:17.3690,lng:78.4636},
    {lat:17.3635,lng:78.4582},{lat:17.3580,lng:78.4528},{lat:17.3526,lng:78.4472},
  ],
  'MF-3': [
    {lat:17.4969,lng:78.3647},{lat:17.4900,lng:78.3720},{lat:17.4832,lng:78.3793},
    {lat:17.4765,lng:78.3865},{lat:17.4697,lng:78.3938},{lat:17.4630,lng:78.4010},
  ],
  '88A': [
    {lat:17.2403,lng:78.4294},{lat:17.2550,lng:78.4380},{lat:17.2698,lng:78.4460},
    {lat:17.2846,lng:78.4538},{lat:17.2998,lng:78.4618},{lat:17.3150,lng:78.4700},
    {lat:17.3302,lng:78.4782},{lat:17.3456,lng:78.4864},{lat:17.3610,lng:78.4948},
  ],
  '142C': [
    {lat:17.4276,lng:78.4071},{lat:17.4210,lng:78.4148},{lat:17.4145,lng:78.4224},
    {lat:17.4079,lng:78.4301},{lat:17.4013,lng:78.4378},{lat:17.3948,lng:78.4454},
    {lat:17.3882,lng:78.4531},{lat:17.3816,lng:78.4608},{lat:17.3750,lng:78.4684},
  ],
  '7G': [
    {lat:17.4400,lng:78.3480},{lat:17.4350,lng:78.3600},{lat:17.4280,lng:78.3720},
    {lat:17.4200,lng:78.3840},{lat:17.4130,lng:78.3960},{lat:17.4060,lng:78.4100},
    {lat:17.3990,lng:78.4220},{lat:17.3920,lng:78.4340},{lat:17.3860,lng:78.4480},
    {lat:17.3800,lng:78.4620},{lat:17.3750,lng:78.4760},
  ],
  '33P': [
    {lat:17.4250,lng:78.4500},{lat:17.4280,lng:78.4440},{lat:17.4300,lng:78.4380},
    {lat:17.4280,lng:78.4310},{lat:17.4260,lng:78.4250},{lat:17.4230,lng:78.4180},
    {lat:17.4210,lng:78.4120},
  ],
  '49M': [
    {lat:17.4950,lng:78.3600},{lat:17.4880,lng:78.3700},{lat:17.4810,lng:78.3800},
    {lat:17.4740,lng:78.3900},{lat:17.4670,lng:78.4000},{lat:17.4600,lng:78.4100},
    {lat:17.4530,lng:78.4200},
  ],
  'E1': [
    {lat:17.5060,lng:78.3880},{lat:17.4980,lng:78.3920},{lat:17.4890,lng:78.3970},
    {lat:17.4800,lng:78.4050},{lat:17.4700,lng:78.4130},{lat:17.4600,lng:78.4210},
    {lat:17.4480,lng:78.4310},{lat:17.4350,lng:78.4410},{lat:17.4200,lng:78.4500},
    {lat:17.4050,lng:78.4600},{lat:17.3900,lng:78.4700},
  ],
  'N3': [
    {lat:17.4399,lng:78.4983},{lat:17.4350,lng:78.5050},{lat:17.4290,lng:78.5120},
    {lat:17.4220,lng:78.5180},{lat:17.4150,lng:78.5230},{lat:17.4080,lng:78.5280},
    {lat:17.4000,lng:78.5330},{lat:17.3920,lng:78.5380},{lat:17.3840,lng:78.5430},
    {lat:17.3760,lng:78.5480},{lat:17.3680,lng:78.5520},
  ],
};

// ── Drivers (diverse, realistic names) ────────────────────
const DRIVERS = [
  'Rajesh Kumar','Mohammed Aslam','Venkatesh Rao','Suresh Reddy',
  'Anand Sharma','Praveen Nair','Kishan Das','Bharat Patel',
  'Santosh Yadav','Ramesh Goud','Dinesh Chandra','Ajay Verma',
  'Srinivas Babu','Naresh Mehta','Ganesh Murthy','Harish Teja',
  'Prasad Iyer','Ravi Shankar','Kiran Reddy','Madhu Sudan',
  'Anil Kumar','Bhaskar Rao','Chandra Sekhar','Devendra Singh',
  'Eswara Rao','Faheem Khan','Gopal Krishnan','Hanumantha Rao',
];

function makeCameras(busId: string): Camera[] {
  const labels = ['Front','Rear','Left','Right','Cabin'] as const;
  return labels.map((label, i) => ({
    id: `${busId}-cam-${i}`,
    label,
    status: sr(`${busId}-cam-${i}`, 0, 1) > 0.90
      ? (sr(`${busId}-cam-${i}-s`, 0, 1) > 0.5 ? 'offline' : 'degraded')
      : 'online' as 'online' | 'offline' | 'degraded',
  }));
}

function timeAt(hour: number, min = 0): string {
  const d = new Date();
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

function genPlateNum(seed: string): string {
  const dist = ['TS07', 'TS08', 'TS09', 'TS10', 'TS11', 'TS13'];
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const r = seededRand(seed);
  const d = dist[Math.floor(r() * dist.length)];
  const l1 = letters[Math.floor(r() * letters.length)];
  const l2 = letters[Math.floor(r() * letters.length)];
  const n = String(Math.floor(r() * 9000) + 1000);
  return `${d} ${l1}${l2} ${n}`;
}

// ── Generate 50 buses ──────────────────────────────────────
export function generateBuses(): Bus[] {
  const buses: Bus[] = [];
  let idx = 0;

  // Bus counts per route: total ~50
  const busCountMap: Record<string, number> = {
    '5K':4,'10H':4,'12C':3,'27D':4,'65X':4,
    '218D':4,'MF-1':3,'MF-3':3,'88A':3,'142C':3,
    '7G':4,'33P':3,'49M':3,'E1':4,'N3':3,
  };

  for (const route of ROUTES) {
    const count = busCountMap[route.number] ?? 3;
    const poly  = ROUTE_POLYLINES[route.number] ?? ROUTE_POLYLINES['5K'];

    for (let b = 0; b < count; b++) {
      idx++;
      const id = `BUS-${String(idx).padStart(3,'0')}`;
      const routeIdx = Math.min(
        Math.floor(sr(`${id}-ridx`,0,1) * poly.length), poly.length - 1
      );
      const pos = poly[routeIdx];

      // Special statuses: BUS-048=offline, BUS-049=maintenance, BUS-050=maintenance
      let status: Bus['status'] =
        idx === 48 ? 'offline'      :
        idx === 49 ? 'maintenance'  :
        idx === 50 ? 'maintenance'  :
        sr(`${id}-st`,0,1) > 0.80 ? 'idle' : 'active';

      const speed = status === 'active' ? sr(`${id}-spd`, 18, 62) : 0;
      const startHour = 5 + Math.floor(sr(`${id}-sh`,0,1)*6);

      buses.push({
        id,
        routeNumber: route.number,
        routeName:   route.name,
        driverName:  DRIVERS[idx % DRIVERS.length],
        licensePlate: genPlateNum(`${id}-plate`),
        status,
        speed: Math.round(speed),
        heading: Math.round(sr(`${id}-hdg`, 0, 360)),
        position: { lat: pos.lat + (seededRand(id)()-0.5)*0.002, lng: pos.lng + (seededRand(id)()-0.5)*0.002 },
        lastSeen: status === 'offline'
          ? timeAt(startHour - 3)
          : status === 'idle'
          ? timeAt(new Date().getHours() - Math.floor(sr(`${id}-ls`,0,1)*2))
          : new Date().toISOString(),
        cameras: makeCameras(id),
        defectsReported: Math.floor(sr(`${id}-def`, 0, 9)),
        routePolyline: poly,
        currentRouteIndex: routeIdx,
        startTime: timeAt(startHour),
        endTime: timeAt(startHour + 10),
        edgeNodeId: `EN-${String(idx).padStart(3,'0')}`,
      });
    }
  }
  return buses;
}

// ── 30+ geographically diverse incidents ───────────────────
// 15+ real Hyderabad locations with correct lat/lng
const HYD_LOCATIONS = [
  { label:'Hitech City Signal', pos:{lat:17.4474,lng:78.3763} },
  { label:'Gachibowli Flyover', pos:{lat:17.4400,lng:78.3480} },
  { label:'Ameerpet X-Roads',   pos:{lat:17.4254,lng:78.4490} },
  { label:'Punjagutta Circle',  pos:{lat:17.4239,lng:78.4538} },
  { label:'Begumpet Main Rd',   pos:{lat:17.4438,lng:78.4633} },
  { label:'Secunderabad Stn',   pos:{lat:17.4399,lng:78.4983} },
  { label:'Charminar Junction', pos:{lat:17.3616,lng:78.4747} },
  { label:'LB Nagar Circle',    pos:{lat:17.3494,lng:78.5522} },
  { label:'Dilsukhnagar Main',  pos:{lat:17.3688,lng:78.5247} },
  { label:'Kukatpally Housing', pos:{lat:17.4960,lng:78.4345} },
  { label:'Miyapur Crossroads', pos:{lat:17.4969,lng:78.3647} },
  { label:'KPHB Phase-6',       pos:{lat:17.4880,lng:78.4476} },
  { label:'Kondapur Jn',        pos:{lat:17.4600,lng:78.3700} },
  { label:'Jubilee Hills Rd36', pos:{lat:17.4325,lng:78.4071} },
  { label:'Mehdipatnam X-Rds',  pos:{lat:17.3955,lng:78.4352} },
  { label:'Tolichowki Main',    pos:{lat:17.4011,lng:78.4180} },
  { label:'Madhapur Polce Stn', pos:{lat:17.4456,lng:78.3810} },
  { label:'Banjara Hills Rd12', pos:{lat:17.4108,lng:78.4458} },
  { label:'Nampally Stn Rd',    pos:{lat:17.3854,lng:78.4706} },
  { label:'Falaknuma Palace Rd',pos:{lat:17.3278,lng:78.4826} },
  { label:'Uppal X-Rds',        pos:{lat:17.3985,lng:78.5598} },
  { label:'Kompally Main Rd',   pos:{lat:17.5380,lng:78.4760} },
  { label:'Shamshabad ORR Toll',pos:{lat:17.2750,lng:78.4180} },
  { label:'ECIL X-Roads',       pos:{lat:17.4680,lng:78.5600} },
  { label:'Patancheru Jn',      pos:{lat:17.5280,lng:78.2680} },
  { label:'Nagole X-Roads',     pos:{lat:17.3890,lng:78.5680} },
  { label:'Hayathnagar X-Rds',  pos:{lat:17.3350,lng:78.5600} },
  { label:'Manikonda Jn',       pos:{lat:17.4050,lng:78.3890} },
  { label:'Lakdikapul Bridge',  pos:{lat:17.3930,lng:78.4590} },
  { label:'Tank Bund Rd',       pos:{lat:17.4150,lng:78.4720} },
];

export function pickLocation(seed: string) {
  const idx = Math.floor(seededRand(seed)() * HYD_LOCATIONS.length);
  return HYD_LOCATIONS[idx];
}

export function genPlate(seed: string): string { return genPlateNum(seed); }

export function makeAIPipeline(ts: string, isANPR: boolean) {
  const base = new Date(ts);
  const steps = [
    { label:'Frame captured by edge camera', duration: Math.floor(sr(ts+'-1',2,8)) },
    { label:'Pre-processing & noise reduction', duration: Math.floor(sr(ts+'-2',8,20)) },
    { label:'YOLOv8 object detection inference', duration: Math.floor(sr(ts+'-3',22,65)) },
    { label:'Classification & severity scoring', duration: Math.floor(sr(ts+'-4',10,30)) },
    ...(isANPR ? [
      { label:'License plate region crop', duration: Math.floor(sr(ts+'-5',4,12)) },
      { label:'OCR + plate normalisation', duration: Math.floor(sr(ts+'-6',14,35)) },
      { label:'VAHAN cross-reference lookup', duration: Math.floor(sr(ts+'-7',60,180)) },
    ] : []),
    { label:'Event payload serialised & queued', duration: Math.floor(sr(ts+'-8',2,8)) },
    { label:'Uplink to NAVIK platform', duration: Math.floor(sr(ts+'-9',30,90)) },
  ];
  let offset = 0;
  return steps.map(s => {
    const t = new Date(base.getTime() + offset);
    offset += s.duration;
    return { label: s.label, timestamp: t.toISOString(), duration: s.duration };
  });
}

export function generateIncidents(): Incident[] {
  // 30 seeded incidents — geographically spread, temporally varied 05:30–23:00
  const incidents: Incident[] = [];

  const templates: Array<{
    type: Incident['type']; severity: Severity; withANPR?: boolean;
    desc: string; congestion?: boolean; locIdx: number; hourRange: [number,number];
  }> = [
    { type:'hit_and_run',          severity:'critical', withANPR:true,  desc:'Hit-and-run at signalised junction — vehicle fled at high speed.', locIdx:0, hourRange:[6,9] },
    { type:'hit_and_run',          severity:'critical', withANPR:true,  desc:'Two-wheeler struck and fled the scene near flyover.', locIdx:1, hourRange:[8,11] },
    { type:'rash_driving',         severity:'high',     withANPR:true,  desc:'Vehicle detected exceeding 80 km/h in 30 km/h school zone.', locIdx:2, hourRange:[7,9] },
    { type:'rash_driving',         severity:'high',     withANPR:true,  desc:'Wrong-side driving against traffic flow detected by camera.', locIdx:3, hourRange:[17,19] },
    { type:'school_zone_alert',    severity:'high',     desc:'22 pedestrians including schoolchildren at unmarked crossing.', locIdx:4, hourRange:[7,8] },
    { type:'school_zone_alert',    severity:'high',     desc:'Children crossing without traffic signal compliance.', locIdx:5, hourRange:[15,16] },
    { type:'school_zone_alert',    severity:'medium',   desc:'Autorickshaws blocking school entry causing pedestrian risk.', locIdx:6, hourRange:[8,9] },
    { type:'congestion_alert',     severity:'high',     congestion:true, desc:'Severe congestion — vehicle density at 180% of segment capacity.', locIdx:7, hourRange:[8,10] },
    { type:'congestion_alert',     severity:'high',     congestion:true, desc:'Peak-hour bottleneck at major junction.', locIdx:8, hourRange:[17,19] },
    { type:'congestion_alert',     severity:'medium',   congestion:true, desc:'Slow-moving traffic caused by double-parking.', locIdx:9, hourRange:[12,14] },
    { type:'congestion_alert',     severity:'medium',   congestion:true, desc:'Construction diversion causing spillback.', locIdx:10, hourRange:[10,12] },
    { type:'congestion_alert',     severity:'high',     congestion:true, desc:'Waterlogging reducing capacity to single lane.', locIdx:11, hourRange:[14,16] },
    { type:'waterlogging_critical',severity:'critical', desc:'Severe waterlogging — water depth >300mm, road impassable.', locIdx:12, hourRange:[13,15] },
    { type:'waterlogging_critical',severity:'high',     desc:'Waterlogging from blocked stormwater drain.', locIdx:13, hourRange:[11,13] },
    { type:'pedestrian_hazard',    severity:'high',     desc:'Visually-impaired pedestrian on carriageway without escort.', locIdx:14, hourRange:[9,11] },
    { type:'pedestrian_hazard',    severity:'medium',   desc:'Large group crossing outside designated zebra crossing.', locIdx:15, hourRange:[18,20] },
    { type:'road_defect',          severity:'critical', desc:'Large pothole (est. 45cm dia) causing vehicles to swerve.', locIdx:16, hourRange:[6,8] },
    { type:'road_defect',          severity:'high',     desc:'Damaged road surface with exposed aggregate over 8m stretch.', locIdx:17, hourRange:[7,9] },
    { type:'road_defect',          severity:'high',     desc:'Missing road divider exposing oncoming traffic.', locIdx:18, hourRange:[10,12] },
    { type:'road_defect',          severity:'medium',   desc:'Missing zebra crossing markings at school entry.', locIdx:19, hourRange:[8,10] },
    { type:'road_defect',          severity:'medium',   desc:'Damaged signboard pole — sign lying on footpath.', locIdx:20, hourRange:[9,11] },
    { type:'vehicle_breakdown',    severity:'medium',   desc:'Bus broken down in fast lane causing left-lane spillback.', locIdx:21, hourRange:[16,18] },
    { type:'vehicle_breakdown',    severity:'low',      desc:'Goods vehicle with flat tyre partially blocking road.', locIdx:22, hourRange:[11,13] },
    { type:'hit_and_run',          severity:'critical', withANPR:true,  desc:'Pedestrian struck by unidentified sedan — fled towards ORR.', locIdx:23, hourRange:[22,23] },
    { type:'rash_driving',         severity:'high',     withANPR:true,  desc:'Truck overtaking on blind bend — near-miss with oncoming bus.', locIdx:24, hourRange:[5,7] },
    { type:'school_zone_alert',    severity:'critical', desc:'Speeding vehicle entered school zone at 65 km/h during dismissal.', locIdx:25, hourRange:[15,16] },
    { type:'congestion_alert',     severity:'high',     congestion:true, desc:'Event traffic overload near stadium.', locIdx:26, hourRange:[18,21] },
    { type:'waterlogging_critical',severity:'high',     desc:'Low-lying underpass flooded — diversion required.', locIdx:27, hourRange:[15,17] },
    { type:'pedestrian_hazard',    severity:'high',     desc:'Street vendor blocking footpath forcing pedestrians onto road.', locIdx:28, hourRange:[17,19] },
    { type:'road_defect',          severity:'high',     desc:'Steel manhole cover missing — open hole in carriageway.', locIdx:29, hourRange:[6,8] },
  ];

  templates.forEach((t, i) => {
    const seed = `inc-${i}`;
    const loc = HYD_LOCATIONS[t.locIdx % HYD_LOCATIONS.length];
    const hour = t.hourRange[0] + Math.floor(seededRand(seed)() * (t.hourRange[1] - t.hourRange[0]));
    const min  = Math.floor(seededRand(seed+'m')() * 60);
    const ts   = timeAt(hour, min);
    const busNum = Math.floor(seededRand(seed+'b')() * 50) + 1;
    const busId  = `BUS-${String(busNum).padStart(3,'0')}`;

    const statusSeed = seededRand(seed+'st')();
    const status: IncidentStatus =
      statusSeed < 0.3 ? 'new' :
      statusSeed < 0.55 ? 'under_review' :
      statusSeed < 0.75 ? 'dispatched' : 'resolved';

    const isANPR = !!t.withANPR;

    incidents.push({
      id: `INC-${String(i+1).padStart(4,'0')}`,
      type: t.type,
      status,
      severity: t.severity as Severity,
      position: {
        lat: loc.pos.lat + (seededRand(seed+'lat')()-0.5)*0.008,
        lng: loc.pos.lng + (seededRand(seed+'lng')()-0.5)*0.008,
      },
      detectedBy: busId,
      timestamp: ts,
      description: t.desc,
      locationLabel: loc.label,
      ...(isANPR ? {
        plateNumber: genPlateNum(seed+'plate'),
        plateConfidence: Math.round(80 + seededRand(seed+'conf')() * 17),
      } : {}),
      ...(t.congestion ? {
        congestionScore: Math.round(72 + seededRand(seed+'cng')() * 26),
        vehicleCounts: [
          { type:'car'        as const, count:Math.floor(40+seededRand(seed+'c1')() *80), confidence:0.94 },
          { type:'two_wheeler'as const, count:Math.floor(30+seededRand(seed+'c2')() *60), confidence:0.91 },
          { type:'bus'        as const, count:Math.floor(5 +seededRand(seed+'c3')() *15), confidence:0.97 },
          { type:'auto'       as const, count:Math.floor(8 +seededRand(seed+'c4')() *20), confidence:0.88 },
          { type:'truck'      as const, count:Math.floor(2 +seededRand(seed+'c5')() *10), confidence:0.85 },
        ],
      } : {}),
      aiPipeline: makeAIPipeline(ts, isANPR),
      actions: status !== 'new' ? [
        `Acknowledged by Operator-${Math.floor(seededRand(seed+'op')() *5)+1} at ${timeAt(hour,min+2).slice(11,16)}`,
        ...(status === 'dispatched' || status === 'resolved' ? [`TGSRTC crew dispatched to ${loc.label} at ${timeAt(hour,min+8).slice(11,16)}`] : []),
        ...(status === 'resolved' ? [`Incident resolved and closed at ${timeAt(hour,min+35).slice(11,16)}`] : []),
      ] : [],
      resolvedAt: status === 'resolved' ? timeAt(hour, min+35) : undefined,
    });
  });

  return incidents;
}

// ── Defects (30) ───────────────────────────────────────────
const DEFECT_CATEGORIES: Array<{
  cat: RoadDefect['category']; desc: string; locIdxStart: number;
}> = [
  { cat:'pothole',                desc:'Significant pothole detected by camera edge inference.',            locIdxStart:0 },
  { cat:'pothole',                desc:'Recurring pothole — 4th detection this month.',                    locIdxStart:3 },
  { cat:'pothole',                desc:'Deep pothole near bus stop causing passenger disembarkation risk.', locIdxStart:6 },
  { cat:'waterlogging',           desc:'Stormwater overflow from blocked drain.',                           locIdxStart:9 },
  { cat:'waterlogging',           desc:'Chronic waterlogging point — low-lying road section.',             locIdxStart:12 },
  { cat:'missing_signboard',      desc:'Speed limit sign missing — pole damaged by vehicle collision.',    locIdxStart:15 },
  { cat:'missing_signboard',      desc:'No-entry signboard fallen, not visible to motorists.',             locIdxStart:18 },
  { cat:'missing_signboard',      desc:'School zone warning sign missing near school gate.',               locIdxStart:21 },
  { cat:'missing_divider',        desc:'Road median divider gap >20m — accident risk.',                   locIdxStart:24 },
  { cat:'missing_divider',        desc:'Central divider blocks damaged by heavy vehicle.',                 locIdxStart:1 },
  { cat:'missing_zebra_crossing', desc:'Zebra crossing markings completely faded — invisible.',            locIdxStart:4 },
  { cat:'missing_zebra_crossing', desc:'No zebra crossing at school gate pedestrian point.',               locIdxStart:7 },
  { cat:'damaged_road',           desc:'Road surface buckled and cracked over 15m stretch.',              locIdxStart:10 },
  { cat:'damaged_road',           desc:'Utility cut repair failed — road surface unstable.',              locIdxStart:13 },
  { cat:'pothole',                desc:'Cluster of potholes in 30m stretch — monsoon damage.',            locIdxStart:16 },
  { cat:'waterlogging',           desc:'Water seeping under road causing subsidence risk.',               locIdxStart:19 },
  { cat:'missing_signboard',      desc:'Diversion signboard missing — drivers confused at closure.',     locIdxStart:22 },
  { cat:'missing_divider',        desc:'Divider end exposed — sharp metal edge hazard.',                  locIdxStart:25 },
  { cat:'missing_zebra_crossing', desc:'Crossing markings worn — only 20% visibility remains.',          locIdxStart:2 },
  { cat:'damaged_road',           desc:'Raised manhole causing vehicle bounce and vibration.',            locIdxStart:5 },
  { cat:'pothole',                desc:'Pothole near tram track drainage causing pooling.',               locIdxStart:8 },
  { cat:'waterlogging',           desc:'Waterlogging at underpass due to broken pump.',                   locIdxStart:11 },
  { cat:'missing_signboard',      desc:'Yield sign at T-junction rusted — unreadable.',                  locIdxStart:14 },
  { cat:'missing_divider',        desc:'100m section of divider entirely absent.',                        locIdxStart:17 },
  { cat:'missing_zebra_crossing', desc:'Crossing at hospital entrance missing completely.',              locIdxStart:20 },
  { cat:'damaged_road',           desc:'Deep ruts in road surface from heavy truck traffic.',            locIdxStart:23 },
  { cat:'pothole',                desc:'High-priority pothole near school — safety risk.',               locIdxStart:26 },
  { cat:'waterlogging',           desc:'Flash flood pooling at road depression.',                        locIdxStart:27 },
  { cat:'damaged_road',           desc:'Bituminous layer completely stripped — gravel exposed.',         locIdxStart:28 },
  { cat:'missing_signboard',      desc:'Lane discipline signage absent on 4-lane section.',             locIdxStart:29 },
];

const SEVERITIES: Severity[] = ['low','medium','high','critical'];
const _GHMC_CIRCLES = ['Charminar','Khairatabad','Serilingampally','Secunderabad','LB Nagar','Kukatpally','Abdullapurmet','Rajendranagar'];
const _GHMC_WARDS   = ['Ward 42','Ward 78','Ward 102','Ward 55','Ward 31','Ward 88','Ward 64','Ward 19','Ward 203','Ward 117'];
const _CONTRACTORS  = ['M/s Srinivasa Infra','M/s Balaji Roads','M/s Hyderabad Civil Works','M/s Deccan Contractors','M/s Sri Rama Projects','M/s Kiran Infrastructure'];
void _GHMC_CIRCLES; void _GHMC_WARDS; void _CONTRACTORS;

export function generateDefects(): RoadDefect[] {
  return DEFECT_CATEGORIES.map((t, i) => {
    const seed = `def-${i}`;
    const loc  = HYD_LOCATIONS[t.locIdxStart % HYD_LOCATIONS.length];
    const sevIdx = Math.floor(seededRand(seed+'sv')() * 4);
    const recurrence = Math.floor(seededRand(seed+'rc')() * 7) + 1;
    const statusSeed = seededRand(seed+'st')();
    const status: RoadDefect['status'] =
      statusSeed < 0.35 ? 'pending' :
      statusSeed < 0.6  ? 'under_review' :
      statusSeed < 0.8  ? 'dispatched' : 'resolved';

    return {
      id: `DEF-${String(i+1).padStart(4,'0')}`,
      category: t.cat,
      severity: SEVERITIES[sevIdx],
      status,
      position: {
        lat: loc.pos.lat + (seededRand(seed+'lat')()-0.5)*0.006,
        lng: loc.pos.lng + (seededRand(seed+'lng')()-0.5)*0.006,
      },
      detectedBy: `BUS-${String(Math.floor(seededRand(seed+'b')() *50)+1).padStart(3,'0')}`,
      detectedAt: timeAt(5 + Math.floor(seededRand(seed+'h')() * 17)),
      description: t.desc,
      confidenceScore: Math.round(78 + seededRand(seed+'cf')() * 20),
      recurrenceCount: recurrence,
      locationLabel: loc.label,
      roadSegmentId: `SEG-${String((i % 10)+1).padStart(2,'0')}`,
    };
  });
}

// ── School zones (6) ───────────────────────────────────────
export function generateSchoolZones(): SchoolZone[] {
  return [
    { id:'SZ-01', name:"St. Mary's School, Secunderabad",      position:{lat:17.4438,lng:78.4633}, radius:200, alertTimes:[{start:'07:30',end:'09:00'},{start:'15:30',end:'17:00'}] },
    { id:'SZ-02', name:"Hyderabad Public School, Begumpet",    position:{lat:17.4350,lng:78.4680}, radius:250, alertTimes:[{start:'07:45',end:'09:15'},{start:'15:15',end:'16:45'}] },
    { id:'SZ-03', name:"DAV Public School, Kukatpally",        position:{lat:17.4920,lng:78.4410}, radius:200, alertTimes:[{start:'08:00',end:'09:30'},{start:'15:30',end:'17:00'}] },
    { id:'SZ-04', name:"Delhi Public School, Nacharam",        position:{lat:17.4200,lng:78.5580}, radius:300, alertTimes:[{start:'07:30',end:'09:00'},{start:'15:30',end:'17:00'}] },
    { id:'SZ-05', name:"Chanda Sahib School, Charminar",       position:{lat:17.3600,lng:78.4740}, radius:180, alertTimes:[{start:'08:00',end:'09:30'},{start:'14:30',end:'16:00'}] },
    { id:'SZ-06', name:"Government High School, Dilsukhnagar", position:{lat:17.3700,lng:78.5200}, radius:200, alertTimes:[{start:'08:30',end:'09:30'},{start:'16:00',end:'17:00'}] },
  ];
}

// ── Traffic segments (12) ──────────────────────────────────
export function generateTrafficSegments(): TrafficSegment[] {
  const segs = [
    { id:'SEG-01', name:'Hitech City–Gachibowli',      from:{lat:17.4474,lng:78.3763}, to:{lat:17.4400,lng:78.3480}, cong:88, density:195, speed:14, delay:22 },
    { id:'SEG-02', name:'Ameerpet–Punjagutta',         from:{lat:17.4254,lng:78.4490}, to:{lat:17.4239,lng:78.4538}, cong:74, density:162, speed:22, delay:14 },
    { id:'SEG-03', name:'Secunderabad–Begumpet',       from:{lat:17.4399,lng:78.4983}, to:{lat:17.4438,lng:78.4633}, cong:65, density:144, speed:28, delay:9  },
    { id:'SEG-04', name:'Charminar–Nampally',          from:{lat:17.3616,lng:78.4747}, to:{lat:17.3854,lng:78.4706}, cong:79, density:170, speed:18, delay:17 },
    { id:'SEG-05', name:'LB Nagar–Dilsukhnagar',       from:{lat:17.3494,lng:78.5522}, to:{lat:17.3688,lng:78.5247}, cong:71, density:155, speed:24, delay:12 },
    { id:'SEG-06', name:'Kukatpally–Miyapur',          from:{lat:17.4960,lng:78.4345}, to:{lat:17.4969,lng:78.3647}, cong:56, density:122, speed:35, delay:6  },
    { id:'SEG-07', name:'Mehdipatnam–Tolichowki',      from:{lat:17.3955,lng:78.4352}, to:{lat:17.4011,lng:78.4180}, cong:82, density:178, speed:16, delay:19 },
    { id:'SEG-08', name:'Banjara Hills–Jubilee Hills',  from:{lat:17.4108,lng:78.4458}, to:{lat:17.4325,lng:78.4071}, cong:68, density:148, speed:26, delay:10 },
    { id:'SEG-09', name:'Uppal–ECIL',                  from:{lat:17.3985,lng:78.5598}, to:{lat:17.4680,lng:78.5600}, cong:60, density:132, speed:31, delay:8  },
    { id:'SEG-10', name:'Kondapur–Madhapur',           from:{lat:17.4600,lng:78.3700}, to:{lat:17.4456,lng:78.3810}, cong:92, density:204, speed:11, delay:28 },
    { id:'SEG-11', name:'Tank Bund–Lakdikapul',        from:{lat:17.4150,lng:78.4720}, to:{lat:17.3930,lng:78.4590}, cong:76, density:168, speed:20, delay:15 },
    { id:'SEG-12', name:'KPHB–Miyapur Metro',          from:{lat:17.4880,lng:78.4476}, to:{lat:17.4969,lng:78.3647}, cong:48, density:108, speed:42, delay:4  },
  ];
  return segs.map(s => ({ ...s, congestionScore:s.cong, vehicleDensity:s.density, avgSpeed:s.speed }));
}

// ── Heat points ────────────────────────────────────────────
export function generateHeatPoints(): HeatPoint[] {
  const pts: HeatPoint[] = [];
  generateTrafficSegments().forEach(seg => {
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      pts.push({
        lat: seg.from.lat + (seg.to.lat - seg.from.lat) * t,
        lng: seg.from.lng + (seg.to.lng - seg.from.lng) * t,
        intensity: seg.congestionScore / 100,
      });
    }
  });
  // Extra hotspots
  HYD_LOCATIONS.slice(0,8).forEach((loc,i) => {
    pts.push({ lat:loc.pos.lat, lng:loc.pos.lng, intensity: 0.5 + seededRand(`hp-${i}`)() * 0.5 });
  });
  return pts;
}

// ── O-D Flows (12) ────────────────────────────────────────
export function generateODFlows(): ODFlowEntry[] {
  return [
    { from:'Hitech City',   to:'Ameerpet',       fromPos:{lat:17.4474,lng:78.3763}, toPos:{lat:17.4254,lng:78.4490}, volume:8200 },
    { from:'Secunderabad',  to:'Charminar',      fromPos:{lat:17.4399,lng:78.4983}, toPos:{lat:17.3616,lng:78.4747}, volume:6800 },
    { from:'Kukatpally',    to:'Hitech City',    fromPos:{lat:17.4960,lng:78.4345}, toPos:{lat:17.4474,lng:78.3763}, volume:7400 },
    { from:'LB Nagar',      to:'Ameerpet',       fromPos:{lat:17.3494,lng:78.5522}, toPos:{lat:17.4254,lng:78.4490}, volume:5600 },
    { from:'Dilsukhnagar',  to:'Secunderabad',   fromPos:{lat:17.3688,lng:78.5247}, toPos:{lat:17.4399,lng:78.4983}, volume:4900 },
    { from:'Miyapur',       to:'Gachibowli',     fromPos:{lat:17.4969,lng:78.3647}, toPos:{lat:17.4400,lng:78.3480}, volume:6100 },
    { from:'Mehdipatnam',   to:'Punjagutta',     fromPos:{lat:17.3955,lng:78.4352}, toPos:{lat:17.4239,lng:78.4538}, volume:5300 },
    { from:'Banjara Hills', to:'Nampally',       fromPos:{lat:17.4108,lng:78.4458}, toPos:{lat:17.3854,lng:78.4706}, volume:3800 },
    { from:'Uppal',         to:'Hitech City',    fromPos:{lat:17.3985,lng:78.5598}, toPos:{lat:17.4474,lng:78.3763}, volume:4200 },
    { from:'Kompally',      to:'Secunderabad',   fromPos:{lat:17.5380,lng:78.4760}, toPos:{lat:17.4399,lng:78.4983}, volume:2900 },
    { from:'Airport',       to:'Hitech City',    fromPos:{lat:17.2403,lng:78.4294}, toPos:{lat:17.4474,lng:78.3763}, volume:3500 },
    { from:'Kondapur',      to:'Jubilee Hills',  fromPos:{lat:17.4600,lng:78.3700}, toPos:{lat:17.4325,lng:78.4071}, volume:4600 },
  ];
}

// ── Route delay chart data ─────────────────────────────────
export function generateRouteDelays() {
  const routes = ROUTES.slice(0,6);
  return routes.map(r => ({
    route: r.number,
    routeName: r.name,
    data: Array.from({length:18}, (_,i) => {
      const h = i + 5;
      const base = 28 + seededRand(`rd-${r.number}-${h}`)() * 12;
      const peak = (h >= 8 && h <= 10) || (h >= 17 && h <= 19);
      const actual = base + (peak ? seededRand(`rd-p-${r.number}-${h}`)() * 18 : 0);
      return { hour:`${String(h).padStart(2,'0')}:00`, scheduled:Math.round(base), actual:Math.round(actual), delay:Math.round(actual-base) };
    }),
  }));
}

export function generateDefectBreakdown() {
  return [
    { name:'Pothole',              value:9,  fill:'#ff5c5c' },
    { name:'Waterlogging',         value:5,  fill:'#5b8cff' },
    { name:'Missing Signboard',    value:5,  fill:'#f5b83d' },
    { name:'Missing Divider',      value:4,  fill:'#ff8c42' },
    { name:'Missing Zebra',        value:4,  fill:'#2ec4a0' },
    { name:'Damaged Road',         value:4,  fill:'#a78bfa' },
  ];
}

export function generateDensityTimeline() {
  return Array.from({length:18}, (_,i) => {
    const h = i+5;
    const peak = (h>=8&&h<=10)||(h>=17&&h<=19);
    const base = peak ? 80 : 35;
    const r = seededRand(`dt-${h}`);
    return {
      hour: `${String(h).padStart(2,'0')}:00`,
      cars:        Math.round(base + r()*40),
      twoWheelers: Math.round(base*0.8 + r()*30),
      buses:       Math.round(8 + r()*12),
      trucks:      Math.round(4 + r()*8),
      autos:       Math.round(base*0.4 + r()*20),
    };
  });
}

// ── Edge Nodes (one per bus) ───────────────────────────────
export function generateEdgeNodes(buses: Bus[]): EdgeNode[] {
  return buses.map((bus,_i) => {
    const seed = `en-${bus.id}`;
    const r = seededRand(seed);
    const uploaded = Math.floor(r() * 80) + 20;
    const total    = uploaded + Math.floor(r() * 40);
    const saved    = (total - uploaded) * 0.8 * 3.5; // ~3.5 MB per non-uploaded event
    return {
      id: bus.edgeNodeId,
      busId: bus.id,
      fps: bus.status === 'active' ? Math.round(26 + r()*4) : 0,
      gpuTempC: bus.status === 'active' ? Math.round(52 + r()*28) : 32,
      inferenceLatencyMs: Math.round(28 + r()*45),
      modelVersion: r() > 0.3 ? 'v2.4.0' : 'v2.3.1',
      cameraStatuses: bus.cameras.map(c => ({ label:c.label, status:c.status })),
      uplinkStatus: bus.status === 'offline' ? 'offline' : bus.status === 'idle' ? 'buffering' : 'online',
      queuedEvents: bus.status === 'offline' ? Math.floor(r()*20)+3 : 0,
      totalEventsToday: total,
      uploadedEventsToday: uploaded,
      bandwidthSavedMB: Math.round(saved),
      lastHeartbeat: bus.lastSeen,
      otaProgress: null,
      otaError: null,
    };
  });
}

// ── Road Health Segments ───────────────────────────────────
export function generateRoadHealthSegments(): RoadHealthSegment[] {
  const segs = generateTrafficSegments();
  return segs.map((seg,_i) => {
    const seed = `rhs-${seg.id}`;
    const r = seededRand(seed);
    const defectDensity = r() * 4 + 0.5;
    const recurrence    = r() * 5 + 1;
    const age           = r() * 12 + 1;
    const rain          = r() * 10;
    const load          = seg.congestionScore > 80 ? 'high' : seg.congestionScore > 55 ? 'medium' : 'low';
    // RHI = 100 - weighted penalty
    const rhi = Math.max(5, Math.round(
      100
      - defectDensity * 8
      - recurrence * 4
      - age * 2
      - (load === 'high' ? 12 : load === 'medium' ? 6 : 0)
      - rain * 1.5
      + r() * 5
    ));
    const hoursScan = r() * 10;
    const freshness: RoadHealthSegment['coverageFreshness'] =
      hoursScan < 2 ? 'fresh' : hoursScan < 6 ? 'stale' : 'critical';
    const failProb = Math.min(0.95, Math.max(0.02,
      0.02 + (100-rhi)/100 * 0.8 + rain/10 * 0.15
    ));
    return {
      id: seg.id,
      name: seg.name,
      from: seg.from,
      to: seg.to,
      rhi,
      defectDensity: Math.round(defectDensity*10)/10,
      recurrenceScore: Math.round(recurrence*10)/10,
      ageYears: Math.round(age*10)/10,
      trafficLoad: load as 'high'|'medium'|'low',
      rainExposure: Math.round(rain*10)/10,
      lastScannedAt: new Date(Date.now() - hoursScan*3600*1000).toISOString(),
      hoursSinceLastScan: Math.round(hoursScan*10)/10,
      failureProbability30d: Math.round(failProb*100)/100,
      predictedPotholeCount: Math.round(failProb * defectDensity * 3),
      coverageFreshness: freshness,
      prePositionCrewRecommended: failProb > 0.65,
    };
  });
}

// ── Live incident templates (6 for streaming) ─────────────
export const LIVE_INCIDENT_TEMPLATES: Array<{
  type: Incident['type']; severity: Severity;
  description: string; withANPR: boolean;
}> = [
  { type:'hit_and_run',          severity:'critical', description:'LIVE: Hit-and-run detected — vehicle fled at speed. Plate captured.', withANPR:true  },
  { type:'congestion_alert',     severity:'high',     description:'LIVE: Sudden surge in vehicle density — bottleneck forming.', withANPR:false },
  { type:'school_zone_alert',    severity:'high',     description:'LIVE: Speeding vehicle in active school zone — children present.', withANPR:true  },
  { type:'waterlogging_critical',severity:'high',     description:'LIVE: Waterlogging reported — road capacity reduced to 40%.', withANPR:false },
  { type:'rash_driving',         severity:'high',     description:'LIVE: Rash driving — near-miss with pedestrian captured.', withANPR:true  },
  { type:'pedestrian_hazard',    severity:'medium',   description:'LIVE: Vulnerable pedestrian detected on carriageway.', withANPR:false },
];

// ── Agent activity log seeds ───────────────────────────────
export function generateAgentActivityLog(): AgentActivityEntry[] {
  const now = Date.now();
  return [
    { id:'aal-01', agentId:'civil_engineer', timestamp:new Date(now-120000).toISOString(),  action:'Generated work order for DEF-0001 (pothole, Hitech City)', entityId:'WO-001', entityType:'work_order', reasoning:'Severity critical + recurrence 5 + school zone = priority score 91', outcome:'success' },
    { id:'aal-02', agentId:'pursuit',        timestamp:new Date(now-240000).toISOString(),  action:'Tracking plate TS07 BZ 4821 — 3 sightings confirmed', entityId:'PST-001', entityType:'pursuit', reasoning:'Confidence fusion: 87% + 91% + 94% → fused 96.2%', outcome:'success' },
    { id:'aal-03', agentId:'traffic_advisor',timestamp:new Date(now-360000).toISOString(),  action:'Advisory issued for SEG-10 (Kondapur–Madhapur)', entityId:'ADV-001', entityType:'advisory', reasoning:'Congestion score 92, avg speed 11 km/h → signal re-timing recommended', outcome:'success' },
    { id:'aal-04', agentId:'safety_guardian',timestamp:new Date(now-480000).toISOString(),  action:'School zone alert triggered — SZ-02 Begumpet 08:22', entityId:'SZ-02',   entityType:'school_zone', reasoning:'Active alert window 07:45–09:15, vehicle speed 58 km/h detected', outcome:'success' },
    { id:'aal-05', agentId:'civil_engineer', timestamp:new Date(now-600000).toISOString(),  action:'Work order WO-002 approved for GHMC Serilingampally circle', entityId:'WO-002', entityType:'work_order', reasoning:'Priority score 78, SLA 72h, hot-mix patch recommended', outcome:'success' },
    { id:'aal-06', agentId:'pursuit',        timestamp:new Date(now-720000).toISOString(),  action:'Evidence packet generated — SHA-256 hash computed', entityId:'PST-001', entityType:'pursuit', reasoning:'4 sightings, fused confidence 96.2%, chain-of-custody initiated', outcome:'success' },
    { id:'aal-07', agentId:'traffic_advisor',timestamp:new Date(now-900000).toISOString(),  action:'Simulation: signal re-timing SEG-10 → congestion 92→61', entityId:'ADV-001', entityType:'advisory', reasoning:'Before: 92 score, 11 km/h. After sim: 61 score, 28 km/h, delay 28→9 min', outcome:'success' },
    { id:'aal-08', agentId:'civil_engineer', timestamp:new Date(now-1200000).toISOString(), action:'Closed-loop: DEF-0003 repair verified clean by BUS-012', entityId:'WO-003', entityType:'work_order', reasoning:'Re-scan confidence 0 defects on segment — repair confirmed successful', outcome:'success' },
    { id:'aal-09', agentId:'safety_guardian',timestamp:new Date(now-1500000).toISOString(), action:'Alert cleared — SZ-01 Secunderabad school zone post-09:00', entityId:'SZ-01',   entityType:'school_zone', reasoning:'Alert window ended at 09:00, no further vehicles exceeding limit', outcome:'success' },
    { id:'aal-10', agentId:'civil_engineer', timestamp:new Date(now-1800000).toISOString(), action:'Work order WO-004 crew dispatched to LB Nagar', entityId:'WO-004', entityType:'work_order', reasoning:'Contractor M/s Srinivasa Infra confirmed, crew ETA 45 min', outcome:'pending' },
  ];
}
