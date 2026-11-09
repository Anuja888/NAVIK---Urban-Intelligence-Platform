// ═══════════════════════════════════════════════════════════
// NAVIK — Real AI Agent Engines (powered by local Ollama)
// Each agent calls llama3.2:3b or qwen2.5-coder:3b
// ═══════════════════════════════════════════════════════════

import { generate, generateJSON, embed, cosineSimilarity, MODELS } from './ollamaClient';
import type { RoadDefect, TrafficSegment } from '../types';

// ── Civil Engineer Agent ──────────────────────────────────
export interface CivilAgentAnalysis {
  priorityScore: number;
  reasoning: string;
  repairRecommendation: string;
  estimatedCostINR: number;
  urgency: 'immediate' | 'within_week' | 'within_month';
  irc82Reference: string;
}

export async function runCivilAgentAnalysis(defect: RoadDefect): Promise<CivilAgentAnalysis> {
  const prompt = `You are a civil engineering AI for GHMC Hyderabad road maintenance.
Analyse this road defect and provide a maintenance recommendation.

DEFECT DATA:
- Category: ${defect.category}
- Severity: ${defect.severity}
- Location: ${defect.locationLabel}
- Recurrence count: ${defect.recurrenceCount}
- AI detection confidence: ${defect.confidenceScore}%
- Description: ${defect.description}

Return a JSON object with these exact fields:
{
  "priorityScore": <0-100 integer>,
  "reasoning": "<2-3 sentence engineering rationale>",
  "repairRecommendation": "<specific repair method>",
  "estimatedCostINR": <integer in rupees>,
  "urgency": "<immediate|within_week|within_month>",
  "irc82Reference": "<relevant IRC standard clause>"
}`;

  try {
    const result = await generateJSON<CivilAgentAnalysis>(prompt, {
      model: MODELS.structured,
      temperature: 0.1,
      maxTokens: 400,
      timeoutMs: 45000,
    });
    return result;
  } catch (err) {
    // Fallback to deterministic if LLM fails
    const sevScore = { critical: 85, high: 65, medium: 45, low: 25 }[defect.severity] ?? 40;
    return {
      priorityScore: Math.min(100, sevScore + defect.recurrenceCount * 3),
      reasoning: `${defect.category} at ${defect.locationLabel} with severity ${defect.severity}. Recurrence count ${defect.recurrenceCount} indicates chronic issue requiring structural intervention. AI confidence ${defect.confidenceScore}%.`,
      repairRecommendation: defect.category === 'pothole' ? 'Hot-mix patching with bituminous concrete per IRC:82' : 'Emergency repair based on field assessment',
      estimatedCostINR: { critical: 85000, high: 45000, medium: 18000, low: 8000 }[defect.severity] ?? 15000,
      urgency: defect.severity === 'critical' ? 'immediate' : defect.severity === 'high' ? 'within_week' : 'within_month',
      irc82Reference: 'IRC:82-2015 Cl.4 (Surface Treatment)',
    };
  }
}

// ── Traffic Advisor Agent ─────────────────────────────────
export interface TrafficAdvisoryAnalysis {
  topAction: string;
  rationale: string;
  expectedImpact: string;
  alternateRoute?: string;
  affectedBuses: string[];
  estimatedDelayReductionMin: number;
}

export async function runTrafficAdvisor(segment: TrafficSegment): Promise<TrafficAdvisoryAnalysis> {
  const prompt = `You are an urban traffic management AI for Hyderabad, India.
Analyse this congestion situation and recommend an intervention.

SEGMENT: ${segment.name}
Congestion score: ${segment.congestionScore}/100
Average speed: ${segment.avgSpeed} km/h
Vehicle density: ${segment.vehicleDensity} vehicles/km
Current delay: +${segment.delay} minutes

Return JSON with these exact fields:
{
  "topAction": "<specific action: signal re-timing / diversion / marshal deployment>",
  "rationale": "<2-sentence engineering rationale for Hyderabad traffic context>",
  "expectedImpact": "<quantified expected improvement>",
  "alternateRoute": "<named alternate road if diversion recommended, else null>",
  "affectedBuses": ["<route numbers that benefit>"],
  "estimatedDelayReductionMin": <integer minutes saved>
}`;

  try {
    return await generateJSON<TrafficAdvisoryAnalysis>(prompt, {
      model: MODELS.structured,
      temperature: 0.2,
      maxTokens: 350,
      timeoutMs: 40000,
    });
  } catch {
    return {
      topAction: 'Adaptive signal re-timing at major junction',
      rationale: `Congestion score of ${segment.congestionScore} on ${segment.name} indicates oversaturation. Signal cycle adjustment can improve throughput by 25-35%.`,
      expectedImpact: `Expected speed improvement from ${segment.avgSpeed} to ${Math.min(45, segment.avgSpeed + 18)} km/h`,
      alternateRoute: undefined,
      affectedBuses: ['5K', '10H', '218D'],
      estimatedDelayReductionMin: Math.round(segment.delay * 0.4),
    };
  }
}

// ── Pursuit Agent — Suspect Analysis ─────────────────────
export interface PursuitAnalysis {
  predictedDirection: string;
  likelyEscapeRoute: string;
  recommendedCheckpoints: string[];
  urgencyLevel: 'high' | 'medium' | 'low';
  evidenceSummary: string;
  draftFIRText: string;
}

export async function runPursuitAnalysis(
  plateNumber: string,
  incidentLocation: string,
  sightingLocations: string[],
  fusedConfidence: number
): Promise<PursuitAnalysis> {
  const sightingsText = sightingLocations.length > 0
    ? sightingLocations.join(' → ')
    : 'No additional sightings yet';

  const prompt = `You are a vehicle pursuit AI assistant for TS Traffic Police, Hyderabad.
A hit-and-run suspect vehicle has been detected.

VEHICLE: ${plateNumber}
INCIDENT LOCATION: ${incidentLocation}
SIGHTING TRAIL: ${sightingsText}
AI CONFIDENCE: ${fusedConfidence}%

Analyse the escape pattern and recommend police action.
Return JSON with these exact fields:
{
  "predictedDirection": "<compass direction + area name>",
  "likelyEscapeRoute": "<named Hyderabad road/highway>",
  "recommendedCheckpoints": ["<location 1>", "<location 2>", "<location 3>"],
  "urgencyLevel": "<high|medium|low>",
  "evidenceSummary": "<2-sentence summary of evidence strength>",
  "draftFIRText": "<one paragraph FIR complaint text under Section 161 MV Act>"
}`;

  try {
    return await generateJSON<PursuitAnalysis>(prompt, {
      model: MODELS.reasoning,
      temperature: 0.2,
      maxTokens: 500,
      timeoutMs: 45000,
    });
  } catch {
    return {
      predictedDirection: 'Likely moving towards ORR or NH-65',
      likelyEscapeRoute: 'Outer Ring Road via nearest interchange',
      recommendedCheckpoints: ['ORR Toll Plaza', 'Nearest TSRTC Bus Depot', 'ECIL X-Roads'],
      urgencyLevel: fusedConfidence > 85 ? 'high' : 'medium',
      evidenceSummary: `Vehicle ${plateNumber} detected with ${fusedConfidence}% fused confidence across ${sightingLocations.length + 1} camera feeds. ANPR evidence is court-admissible.`,
      draftFIRText: `This is to report that vehicle bearing registration number ${plateNumber} was involved in a hit-and-run incident at ${incidentLocation}. The vehicle was detected and tracked by AI-enabled cameras on TGSRTC fleet buses with a fused confidence of ${fusedConfidence}%. I request immediate registration of FIR under Section 161 of the Motor Vehicles Act and tracing of the vehicle via VAHAN database.`,
    };
  }
}

// ── Safety Guardian — School Zone Analysis ────────────────
export interface SchoolZoneAlert {
  riskLevel: 'critical' | 'high' | 'moderate' | 'low';
  assessment: string;
  immediateAction: string;
  preventiveMeasure: string;
}

export async function runSafetyGuardianAnalysis(
  zoneName: string,
  detectedSpeed: number,
  speedLimit: number,
  pedestrianCount: number
): Promise<SchoolZoneAlert> {
  const overspeedPct = Math.round(((detectedSpeed - speedLimit) / speedLimit) * 100);

  const prompt = `You are a school safety AI for Hyderabad Traffic Police.
A speeding vehicle was detected near a school.

SCHOOL ZONE: ${zoneName}
DETECTED SPEED: ${detectedSpeed} km/h (limit: ${speedLimit} km/h, overspeed: +${overspeedPct}%)
PEDESTRIANS VISIBLE: ${pedestrianCount}

Return JSON with these exact fields:
{
  "riskLevel": "<critical|high|moderate|low>",
  "assessment": "<2-sentence risk assessment>",
  "immediateAction": "<what to do right now>",
  "preventiveMeasure": "<long-term infrastructure recommendation>"
}`;

  try {
    return await generateJSON<SchoolZoneAlert>(prompt, {
      model: MODELS.reasoning,
      temperature: 0.1,
      maxTokens: 300,
      timeoutMs: 35000,
    });
  } catch {
    return {
      riskLevel: overspeedPct > 50 ? 'critical' : overspeedPct > 30 ? 'high' : 'moderate',
      assessment: `Vehicle detected at ${detectedSpeed} km/h in ${speedLimit} km/h zone near ${zoneName}. ${pedestrianCount} pedestrians visible — immediate risk to school children.`,
      immediateAction: 'Alert nearest traffic police unit. Issue e-challan. Broadcast on TGSRTC radio.',
      preventiveMeasure: 'Install speed humps and flashing amber signs at 50m approach. Deploy marshal during school hours.',
    };
  }
}

// ── Incident Description Enrichment ──────────────────────
export async function enrichIncidentDescription(
  type: string,
  location: string,
  rawData: Record<string, unknown>
): Promise<string> {
  const prompt = `You are an urban incident reporter for TGSRTC Hyderabad.
Write a clear, professional 2-sentence incident description for an operations officer.

INCIDENT TYPE: ${type}
LOCATION: ${location}
DATA: ${JSON.stringify(rawData, null, 2).slice(0, 300)}

Write exactly 2 sentences. Be specific, factual, and professional. No markdown.`;

  try {
    return await generate(prompt, {
      model: MODELS.reasoning,
      temperature: 0.4,
      maxTokens: 120,
      timeoutMs: 25000,
    });
  } catch {
    return `${type} detected at ${location}. Automated AI detection system has flagged this for immediate operator review.`;
  }
}

// ── Semantic Incident Search ──────────────────────────────
// Uses bge-m3 embeddings for real semantic similarity
let embeddingCache: Map<string, number[]> = new Map();

export async function semanticSearch(
  query: string,
  candidates: Array<{ id: string; text: string }>,
  topK = 5
): Promise<Array<{ id: string; score: number }>> {
  const queryEmbedding = await embed(query);
  const scored: Array<{ id: string; score: number }> = [];

  for (const c of candidates) {
    let emb = embeddingCache.get(c.id);
    if (!emb) {
      emb = await embed(c.text);
      embeddingCache.set(c.id, emb);
    }
    scored.push({ id: c.id, score: cosineSimilarity(queryEmbedding, emb) });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}

export function clearEmbeddingCache() {
  embeddingCache = new Map();
}
