import type {
  EmergencyRequestInput, EmergencyType, GeoPoint, Hospital, MatchResult, ReasonCode, ResourceKey, ScoreComponents,
} from "./types";
import { TOGGLE_RESOURCES } from "./types";

/** Scoring weights — single source of truth (a FastAPI backend would own this). */
export const SCORE_WEIGHTS: ScoreComponents = {
  resource: 0.35,
  eta: 0.25,
  freshness: 0.15,
  load: 0.15,
  distance: 0.1,
};

export const MATCH_CONFIG = {
  freshSeconds: 60,
  staleSeconds: 300,
  stalePenalty: 0.1,
  avgSpeedKmh: 40,
  dispatchOverheadMin: 1,
  etaHorizonMin: 40,
  distanceHorizonKm: 25,
  depthCap: 3,
};

export const SPECIALTY_FOR: Record<EmergencyType, string> = {
  Trauma: "trauma",
  Cardiac: "cardiology",
  Respiratory: "pulmonology",
  Burns: "burns",
  Other: "general",
};

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Controlled demo ETA: road factor 1.3 over straight-line distance at a fixed speed. */
export function etaMinutes(km: number) {
  return MATCH_CONFIG.dispatchOverheadMin + ((km * 1.3) / MATCH_CONFIG.avgSpeedKmh) * 60;
}

export function freshnessLevel(ageSec: number): "fresh" | "aging" | "stale" {
  if (ageSec < MATCH_CONFIG.freshSeconds) return "fresh";
  if (ageSec <= MATCH_CONFIG.staleSeconds) return "aging";
  return "stale";
}

function freshnessScore(ageSec: number) {
  const { freshSeconds, staleSeconds, stalePenalty } = MATCH_CONFIG;
  if (ageSec < freshSeconds) return 1;
  if (ageSec <= staleSeconds) return 1 - ((ageSec - freshSeconds) / (staleSeconds - freshSeconds)) * 0.6;
  return stalePenalty;
}

export function hasResource(h: Hospital, key: ResourceKey) {
  if (!h || !h.resources) return false;
  const res = h.resources[key];
  if (!res) return false;
  return (res.available ?? 0) > 0;
}

export function rankHospitals(
  input: Pick<EmergencyRequestInput, "type" | "resources" | "location">,
  hospitals: Hospital[],
  now: number,
  exclude: string[] = [],
): MatchResult[] {
  const specialty = SPECIALTY_FOR[input.type];
  const reqList = input.resources.length ? input.resources : (["oxygen"] as ResourceKey[]);

  // Keep active hospitals; do NOT filter out partial resource matches or by specialty!
  const candidates = hospitals.filter(
    (h) => (h.active !== false) && !exclude.includes(h.id),
  );

  const scored = candidates.map((h) => {
    const km = haversineKm(input.location, h);
    const eta = etaMinutes(km);
    const age = (now - (h.updated_at || now)) / 1000;

    // Requirement evaluation
    const requirements: Record<string, { required: boolean; available: boolean; matched: boolean }> = {};
    const missingResources: ResourceKey[] = [];
    let fulfilledCount = 0;

    for (const k of reqList) {
      const has = hasResource(h, k);
      requirements[k] = {
        required: true,
        available: has,
        matched: has,
      };
      if (has) {
        fulfilledCount++;
      } else {
        missingResources.push(k);
      }
    }

    const totalRequired = reqList.length;
    const fulfillmentPercentage = Math.round((fulfilledCount / totalRequired) * 100);

    const depth =
      reqList.reduce((s, k) => {
        if (TOGGLE_RESOURCES.includes(k)) return s + (hasResource(h, k) ? 1 : 0);
        const avail = h.resources?.[k]?.available ?? 0;
        return s + Math.min(avail, MATCH_CONFIG.depthCap) / MATCH_CONFIG.depthCap;
      }, 0) / reqList.length;
    const coverage = fulfilledCount / totalRequired;

    const load = h.load_pct ?? 30;
    const components: ScoreComponents = {
      resource: 0.6 * coverage + 0.4 * depth,
      eta: Math.max(0, 1 - eta / MATCH_CONFIG.etaHorizonMin),
      freshness: freshnessScore(age),
      load: 1 - load / 100,
      distance: Math.max(0, 1 - km / MATCH_CONFIG.distanceHorizonKm),
    };
    const total = (Object.keys(SCORE_WEIGHTS) as (keyof ScoreComponents)[]).reduce(
      (s, k) => s + SCORE_WEIGHTS[k] * components[k],
      0,
    );

    return {
      h,
      km,
      eta,
      age,
      components,
      total,
      fulfilledCount,
      totalRequired,
      fulfillmentPercentage,
      missingResources,
      requirements,
    };
  });

  // Two-stage sorting (Section 8: Resource fulfillment must have priority):
  // STAGE 1: Full matches (fulfillmentPercentage === 100) sorted by score DESC
  // STAGE 2: Partial matches prioritized by fulfilledCount DESC (3/4 > 2/4 > 1/4), then score DESC
  // STAGE 3: Zero matches
  scored.sort((a, b) => {
    const aFull = a.fulfillmentPercentage === 100;
    const bFull = b.fulfillmentPercentage === 100;

    if (aFull && !bFull) return -1;
    if (!aFull && bFull) return 1;

    if (aFull && bFull) {
      return b.total - a.total;
    }

    if (b.fulfilledCount !== a.fulfilledCount) {
      return b.fulfilledCount - a.fulfilledCount;
    }

    return b.total - a.total;
  });

  const minEta = scored.length ? Math.min(...scored.map((s) => s.eta)) : 0;
  const minKm = scored.length ? Math.min(...scored.map((s) => s.km)) : 0;

  return scored.map((s, i) => {
    const reasons: ReasonCode[] = [];
    if (s.fulfillmentPercentage === 100 && input.resources.length) {
      reasons.push("ALL_RESOURCES");
    } else if (s.fulfilledCount > 0) {
      reasons.push("PARTIAL_RESOURCES");
    }
    const hasSpecialty = Array.isArray(s.h.specialties) && s.h.specialties.includes(specialty);
    if (specialty !== "general" && hasSpecialty) reasons.push("SPECIALTY_MATCH");
    if (s.eta === minEta) reasons.push("FASTEST_ETA");
    else if (s.eta < 10) reasons.push("GOOD_ETA");
    if (s.km === minKm && s.eta !== minEta) reasons.push("NEAREST");
    const lvl = freshnessLevel(s.age);
    reasons.push(lvl === "fresh" ? "FRESH_DATA" : lvl === "aging" ? "AGING_DATA" : "STALE_DATA");
    const hLoad = s.h.load_pct ?? 30;
    reasons.push(hLoad < 40 ? "LOW_LOAD" : hLoad < 70 ? "MODERATE_LOAD" : "HIGH_LOAD");

    // Tier derivation
    let matchType: "FULL_MATCH" | "PARTIAL_MATCH" | "UNAVAILABLE" | "STALE" = "UNAVAILABLE";
    if (lvl === "stale") {
      matchType = "STALE";
    } else if (s.fulfillmentPercentage === 100) {
      matchType = "FULL_MATCH";
    } else if (s.fulfilledCount > 0) {
      matchType = "PARTIAL_MATCH";
    } else {
      matchType = "UNAVAILABLE";
    }

    const isRecommended = i === 0 && matchType !== "UNAVAILABLE" && s.fulfilledCount > 0;

    const scoreBreakdown = {
      resourceFulfillment: Math.round(s.components.resource * 100),
      eta: Math.round(s.components.eta * 100),
      freshness: Math.round(s.components.freshness * 100),
      load: Math.round(s.components.load * 100),
      distance: Math.round(s.components.distance * 100),
    };

    return {
      hospital_id: s.h.id,
      hospital_name: s.h.name,
      rank: i + 1,
      total_score: s.total,
      components: s.components,
      eta_min: s.eta,
      distance_km: s.km,
      stale: lvl === "stale",
      reasons,

      // Smart Recommendation fields
      matchType,
      fulfillmentPercentage: s.fulfillmentPercentage,
      requirementsFulfilled: s.fulfilledCount,
      requirementsTotal: s.totalRequired,
      missingResources: s.missingResources,
      requirements: s.requirements,
      scoreBreakdown,
      isRecommended,
    };
  });
}

const REASON_TEXT: Record<ReasonCode, { text: string; tone: "good" | "warn" | "bad" }> = {
  ALL_RESOURCES: { text: "All required resources available", tone: "good" },
  PARTIAL_RESOURCES: { text: "Partially satisfies requested emergency resources", tone: "warn" },
  SPECIALTY_MATCH: { text: "Supports the required specialty", tone: "good" },
  FASTEST_ETA: { text: "Fastest suitable ETA", tone: "good" },
  GOOD_ETA: { text: "Reachable in under 10 minutes", tone: "good" },
  NEAREST: { text: "Nearest suitable facility", tone: "good" },
  FRESH_DATA: { text: "Availability updated in the last minute", tone: "good" },
  AGING_DATA: { text: "Availability is a few minutes old", tone: "warn" },
  STALE_DATA: { text: "Stale data — confirm by phone (score penalized)", tone: "bad" },
  LOW_LOAD: { text: "Low current load", tone: "good" },
  MODERATE_LOAD: { text: "Moderate current load", tone: "good" },
  HIGH_LOAD: { text: "High current load", tone: "warn" },
};

/** Templated explanation from structured reason codes. */
export function explainMatch(m: MatchResult) {
  return m.reasons.map((r) => REASON_TEXT[r]);
}

/**
 * HOOK: explainWithGroq()
 * Future: POST structured facts (reason codes + component scores) to a Groq-backed
 * endpoint to produce a natural-language summary. It must ONLY rephrase the provided
 * facts and must NEVER influence ranking. Currently returns the templated text.
 */
export async function explainWithGroq(m: MatchResult, hospitalName: string): Promise<string> {
  const lines = explainMatch(m).map((r) => r.text.toLowerCase());
  return `${hospitalName} ranks #${m.rank}: ${lines.join(", ")}.`;
}

export function pointLabel(p: GeoPoint) {
  return p.label || `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`;
}
