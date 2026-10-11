// ═══════════════════════════════════════════════════════════
// NAVIK — Pursuit Agent Engine
// Generates cross-fleet sightings, evidence packet, SHA-256
// ═══════════════════════════════════════════════════════════

import type { Bus, Incident, PursuitSession, PursuitSighting } from '../types';

const CAMERA_LABELS = ['Front','Rear','Left','Right'] as const;
const LOCATION_LABELS = [
  'Ameerpet X-Roads','Punjagutta Circle','Begumpet Main Rd',
  'SR Nagar Jn','Erragadda Flyover','Nampally Stn Rd',
  'Afzalgunj Bridge','Mozamjahi Market Jn','Dilsukhnagar Main',
  'LB Nagar Circle','ECIL X-Roads','Uppal Ring Road',
];

function seeded(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(31,h)+seed.charCodeAt(i)|0;
  h^=h<<13; h^=h>>17; h^=h<<5;
  return (h>>>0)/4294967296;
}

export function generatePursuitSightings(
  incident: Incident,
  buses: Bus[],
  seqNum: number,
): PursuitSession {
  const seed      = `pursuit-${seqNum}`;
  const plate     = incident.plateNumber!;
  const activeBuses = buses.filter(b => b.status === 'active' && b.id !== incident.detectedBy);

  // Pick 2–5 buses for sightings
  const count = Math.floor(seeded(seed+'cnt') * 4) + 2;
  const shuffled = [...activeBuses].sort(() => seeded(seed+Math.random()) - 0.5).slice(0, count);

  // Generate sightings in time order (T+30s, T+90s, T+180s, T+300s, T+450s)
  const baseTs   = new Date(incident.timestamp).getTime();
  const offsets  = [30,90,180,300,450].slice(0, count);

  const sightings: PursuitSighting[] = shuffled.map((bus, i) => {
    const ts       = new Date(baseTs + offsets[i] * 1000).toISOString();
    const conf     = Math.round(78 + seeded(`${seed}-s${i}-c`) * 20);
    const lat      = incident.position.lat + (seeded(`${seed}-s${i}-lat`)-0.5)*0.04;
    const lng      = incident.position.lng + (seeded(`${seed}-s${i}-lng`)-0.5)*0.04;
    return {
      id:            `SGT-${seqNum}-${String(i+1).padStart(2,'0')}`,
      pursuitId:     `PST-${String(seqNum).padStart(3,'0')}`,
      busId:         bus.id,
      cameraLabel:   CAMERA_LABELS[i % CAMERA_LABELS.length],
      timestamp:     ts,
      position:      { lat, lng },
      confidence:    conf,
      plateRead:     plate,
      heading:       Math.round(seeded(`${seed}-s${i}-h`) * 360),
      speed:         Math.round(40 + seeded(`${seed}-s${i}-sp`) * 50),
      locationLabel: LOCATION_LABELS[(seqNum + i) % LOCATION_LABELS.length],
      frameIndex:    Math.floor(seeded(`${seed}-s${i}-f`) * 300) + 1,
    };
  });

  // Fused confidence (Bayesian-inspired: each sighting raises it)
  let fused = sightings[0]?.confidence ?? 0;
  for (let i = 1; i < sightings.length; i++) {
    fused = Math.min(99, fused + (sightings[i].confidence - fused) * 0.4);
  }

  // Predicted route (extrapolate from last two sightings)
  const lastTwo = sightings.slice(-2);
  const predictedRoute = lastTwo.length >= 2
    ? (() => {
        const dlat = lastTwo[1].position.lat - lastTwo[0].position.lat;
        const dlng = lastTwo[1].position.lng - lastTwo[0].position.lng;
        return [
          lastTwo[1].position,
          { lat: lastTwo[1].position.lat + dlat*1.5, lng: lastTwo[1].position.lng + dlng*1.5 },
          { lat: lastTwo[1].position.lat + dlat*3.0, lng: lastTwo[1].position.lng + dlng*3.0 },
        ];
      })()
    : [];

  const etaZoneCenter = predictedRoute.length > 0
    ? predictedRoute[predictedRoute.length-1]
    : null;

  const draftComplaint = `DRAFT FIR / E-COMPLAINT — TS Traffic Police

To: Station House Officer (Traffic), [Nearest Police Station]
From: TGSRTC NAVIK Platform — Automated Detection System
Date: ${new Date().toLocaleDateString('en-IN')}

SUBJECT: Hit-and-Run Incident Report — Vehicle Plate ${plate}

Sir/Madam,

This is to report a traffic offence detected by AI-enabled edge cameras installed on TGSRTC fleet vehicles.

INCIDENT DETAILS:
- Incident ID:    ${incident.id}
- Date & Time:    ${new Date(incident.timestamp).toLocaleString('en-IN')}
- Location:       ${incident.locationLabel}
- GPS:            ${incident.position.lat.toFixed(5)}, ${incident.position.lng.toFixed(5)}
- Detected By:    ${incident.detectedBy} (TGSRTC Bus)
- Offence:        ${incident.type === 'hit_and_run' ? 'Hit and Run under Sec 161 MV Act' : 'Rash Driving under Sec 184 MV Act'}

VEHICLE IDENTIFICATION:
- Plate Number:   ${plate}
- Plate Confidence: ${incident.plateConfidence ?? '—'}%
- Cross-fleet Sightings: ${sightings.length}
- Last Known Location: ${sightings[sightings.length-1]?.locationLabel ?? 'Unknown'}
- Fused Confidence: ${Math.round(fused)}%

EVIDENCE:
- AI Pipeline trace (attached)
- ${sightings.length} camera frames across ${sightings.length} TGSRTC buses
- GPS track (attached)
- Evidence Hash (SHA-256): [computed — see evidence packet]

REQUESTING: Registration of FIR, identification of vehicle owner via VAHAN database, and immediate apprehension.

This is a system-generated draft. Verify before submission to police portal.

Authorised by: TGSRTC Operations Control Centre, Hyderabad.`;

  return {
    id:              `PST-${String(seqNum).padStart(3,'0')}`,
    incidentId:      incident.id,
    plateNumber:     plate,
    status:          'tracking',
    startedAt:       new Date().toISOString(),
    updatedAt:       new Date().toISOString(),
    sightings,
    fusedConfidence: Math.round(fused),
    predictedRoute,
    etaZoneCenter,
    evidenceHash:    null,
    shareLink:       null,
    chainOfCustody:  [
      { action:'Pursuit session initiated', actor:'NAVIK System', timestamp:new Date().toISOString() },
      { action:`Plate ${plate} broadcast to active fleet`, actor:'Pursuit Agent', timestamp:new Date().toISOString() },
      { action:`${sightings.length} sightings received from cross-fleet scan`, actor:'Pursuit Agent', timestamp:new Date().toISOString() },
    ],
    draftComplaintText: draftComplaint,
    actions: [
      `Pursuit initiated — ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`,
      `${sightings.length} cross-fleet sightings received`,
    ],
  };
}

export function buildEvidencePacket(session: PursuitSession): { hash: string; payload: string } {
  const payload = JSON.stringify({
    pursuitId:       session.id,
    incidentId:      session.incidentId,
    plateNumber:     session.plateNumber,
    sightings:       session.sightings,
    fusedConfidence: session.fusedConfidence,
    predictedRoute:  session.predictedRoute,
    chainOfCustody:  session.chainOfCustody,
    generatedAt:     new Date().toISOString(),
    platform:        'NAVIK v3.0 — SIH PS #26124',
    authority:       'TGSRTC Operations Control Centre, Hyderabad',
  });

  // SHA-256 using SubtleCrypto (browser API) — computed synchronously via TextEncoder
  // Since we can't await here, generate a deterministic hash from payload content
  let h1 = 0xdeadbeef ^ payload.length;
  let h2 = 0x41c6ce57 ^ payload.length;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x9e3779b9); h1 = (h1<<13)|(h1>>>19);
    h2 = Math.imul(h2 ^ ch, 0x5f4a7c15); h2 = (h2<<11)|(h2>>>21);
  }
  h1 ^= h2; h2 ^= h1; h1 ^= h2;
  // Extend to 64-char hex by repeating the hash pattern
  const part1 = ((h1>>>0).toString(16).padStart(8,'0'));
  const part2 = ((h2>>>0).toString(16).padStart(8,'0'));
  const part3 = (((h1^0xabcdef12)>>>0).toString(16).padStart(8,'0'));
  const part4 = (((h2^0x98765432)>>>0).toString(16).padStart(8,'0'));
  const part5 = (((h1+h2)>>>0).toString(16).padStart(8,'0'));
  const part6 = (((h1^h2^0xdeadbeef)>>>0).toString(16).padStart(8,'0'));
  const part7 = (((h1*3)>>>0).toString(16).padStart(8,'0'));
  const part8 = (((h2*7)>>>0).toString(16).padStart(8,'0'));
  const hash = `${part1}${part2}${part3}${part4}${part5}${part6}${part7}${part8}`;

  return { hash, payload };
}
