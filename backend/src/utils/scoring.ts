import { env } from "../config/env";
import {
  EmergencyType,
  HospitalData,
  MatchResult,
  ReasonCode,
  ResourceKey,
  ScoreComponents,
  TOGGLE_RESOURCES,
} from "../types";
import { calculateDistanceKm, calculateEtaMinutes, Coordinates } from "./distance";

export const SCORE_WEIGHTS = {
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

export function freshnessLevel(ageSec: number): "fresh" | "aging" | "stale" {
  if (ageSec < MATCH_CONFIG.freshSeconds) return "fresh";
  if (ageSec <= MATCH_CONFIG.staleSeconds) return "aging";
  return "stale";
}

/**
 * Calculates continuous freshness score (0-1.0 or 0-100).
 * Kept for backwards compatibility with existing test suites.
 */
export function calculateFreshnessScore(ageSec: number): number {
  const { freshSeconds, staleSeconds, stalePenalty } = MATCH_CONFIG;
  if (ageSec < freshSeconds) return 1.0;
  if (ageSec <= staleSeconds) {
    return 1.0 - ((ageSec - freshSeconds) / (staleSeconds - freshSeconds)) * 0.6;
  }
  return stalePenalty;
}

/**
 * Standard Dev 2 continuous freshness score (0 - 100).
 * Formula: max(0, 100 - ageMinutes * 5)
 */
export function calculateFreshnessScoreMinutes(dataAgeMinutes: number): number {
  return Math.max(0, Math.min(100, Math.round(100 - dataAgeMinutes * 5)));
}

/**
 * Standard Dev 2 load score (0 - 100).
 * Formula: max(0, 100 - currentLoad)
 */
export function calculateLoadScore(currentLoad: number): number {
  return Math.max(0, Math.min(100, Math.round(100 - (currentLoad ?? 0))));
}

/**
 * Standard Dev 2 ETA score (0 - 100).
 * Formula: max(0, 100 - etaMinutes * 5)
 */
export function calculateEtaScore(etaMinutes: number): number {
  return Math.max(0, Math.min(100, Math.round(100 - etaMinutes * 5)));
}

/**
 * Standard Dev 2 distance score (0 - 100).
 * Formula: max(0, 100 - (distanceKm / radiusKm * 100))
 */
export function calculateDistanceScore(
  distanceKm: number,
  radiusKm: number = env.MATCHING_RADIUS_KM
): number {
  const safeRadius = radiusKm > 0 ? radiusKm : 15;
  return Math.max(0, Math.min(100, Math.round(100 - (distanceKm / safeRadius) * 100)));
}

/**
 * Standard Dev 2 weighted final score (0 - 100).
 */
export function calculateFinalScore(
  resourceScore: number,
  etaScore: number,
  freshnessScore: number,
  loadScore: number,
  distanceScore: number
): number {
  return Number(
    (
      resourceScore * SCORE_WEIGHTS.resource +
      etaScore * SCORE_WEIGHTS.eta +
      freshnessScore * SCORE_WEIGHTS.freshness +
      loadScore * SCORE_WEIGHTS.load +
      distanceScore * SCORE_WEIGHTS.distance
    ).toFixed(2)
  );
}

export function hasHospitalResource(h: HospitalData, key: ResourceKey): boolean {
  return (h.resources?.[key]?.available ?? 0) > 0;
}

/**
 * Calculates resource fulfillment percentage, detailed per-resource match, and eligibility
 */
export function calculateResourceFulfillment(
  required: ResourceKey[],
  hospital: HospitalData
): {
  fulfilledCount: number;
  totalRequired: number;
  fulfillmentPercentage: number;
  isFullyEligible: boolean;
  missingResources: ResourceKey[];
  requirements: Record<string, { required: boolean; available: boolean; matched: boolean }>;
} {
  if (!required.length) {
    return {
      fulfilledCount: 1,
      totalRequired: 1,
      fulfillmentPercentage: 100,
      isFullyEligible: true,
      missingResources: [],
      requirements: {},
    };
  }

  const requirements: Record<string, { required: boolean; available: boolean; matched: boolean }> = {};
  const missingResources: ResourceKey[] = [];
  let fulfilledCount = 0;

  for (const k of required) {
    const hasRes = hasHospitalResource(hospital, k);
    requirements[k] = {
      required: true,
      available: hasRes,
      matched: hasRes,
    };
    if (hasRes) {
      fulfilledCount++;
    } else {
      missingResources.push(k);
    }
  }

  const totalRequired = required.length;
  const fulfillmentPercentage = Math.round((fulfilledCount / totalRequired) * 100);
  const isFullyEligible = fulfilledCount === totalRequired;

  return {
    fulfilledCount,
    totalRequired,
    fulfillmentPercentage,
    isFullyEligible,
    missingResources,
    requirements,
  };
}

export interface RankInput {
  type: EmergencyType;
  resources: ResourceKey[];
  location: Coordinates;
  radiusKm?: number;
  onlyFullyEligible?: boolean;
}

/**
 * Deterministic hospital ranking engine implementing the BedLink two-stage recommendation pipeline.
 * STAGE 1: Full matches (100% fulfillment) ranked by matchScore DESC
 * STAGE 2: Partial matches ranked by fulfilled count DESC (3/4 > 2/4 > 1/4), then matchScore DESC
 */
export function rankHospitals(
  input: RankInput,
  hospitals: HospitalData[],
  nowMs: number = Date.now(),
  excludeIds: string[] = []
): MatchResult[] {
  const specialty = SPECIALTY_FOR[input.type] || "general";
  const requiredResources = input.resources.length ? input.resources : (["oxygen"] as ResourceKey[]);
  const radiusKm = input.radiusKm || env.MATCHING_RADIUS_KM || 15;

  // Filter hospitals: active, not excluded
  const candidates = hospitals.filter((h) => {
    if (!h.active || excludeIds.includes(h.id)) return false;

    // Radius filter (keep within configured radius, or fallback if none within radius)
    const km = calculateDistanceKm(input.location, { lat: h.lat, lng: h.lng });
    if (km > radiusKm * 1.5) return false; // hard cutoff beyond search horizon

    if (input.onlyFullyEligible) {
      const { isFullyEligible } = calculateResourceFulfillment(requiredResources, h);
      if (!isFullyEligible) return false;
    }

    return true;
  });

  const scored = candidates.map((h) => {
    const km = calculateDistanceKm(input.location, { lat: h.lat, lng: h.lng });
    const eta = calculateEtaMinutes(km);
    const ageSec = Math.max(0, (nowMs - h.updated_at) / 1000);
    const dataAgeMinutes = Math.max(0, Number((ageSec / 60).toFixed(1)));

    // 1. Resource Score & Fulfillment
    const {
      fulfilledCount,
      totalRequired,
      fulfillmentPercentage,
      isFullyEligible,
      missingResources,
      requirements,
    } = calculateResourceFulfillment(requiredResources, h);

    // Depth bonus for capacity depth
    const depth =
      requiredResources.reduce((acc, k) => {
        if (TOGGLE_RESOURCES.includes(k)) {
          return acc + (hasHospitalResource(h, k) ? 1 : 0);
        }
        const avail = h.resources?.[k]?.available ?? 0;
        return acc + Math.min(avail, MATCH_CONFIG.depthCap) / MATCH_CONFIG.depthCap;
      }, 0) / requiredResources.length;

    // Resource score 0-100: 80% coverage + 20% depth bonus
    const resourceScore = Math.min(100, Math.round(fulfillmentPercentage * 0.8 + depth * 20));

    // 2. ETA Score (0 - 100)
    const etaScore = calculateEtaScore(eta);

    // 3. Freshness Score (0 - 100)
    const freshnessScore = calculateFreshnessScoreMinutes(dataAgeMinutes);

    // 4. Load Score (0 - 100)
    const currentLoad = h.load_pct ?? 0;
    const loadScore = calculateLoadScore(currentLoad);

    // 5. Distance Score (0 - 100)
    const distanceScore = calculateDistanceScore(km, radiusKm);

    // Final Weighted Match Score (0 - 100)
    const finalScore = calculateFinalScore(
      resourceScore,
      etaScore,
      freshnessScore,
      loadScore,
      distanceScore
    );

    const components: ScoreComponents = {
      resource: Number((resourceScore / 100).toFixed(3)),
      eta: Number((etaScore / 100).toFixed(3)),
      freshness: Number((freshnessScore / 100).toFixed(3)),
      load: Number((loadScore / 100).toFixed(3)),
      distance: Number((distanceScore / 100).toFixed(3)),
    };

    return {
      h,
      km,
      eta,
      dataAgeMinutes,
      ageSec,
      fulfilledCount,
      totalRequired,
      fulfillmentPercentage,
      isFullyEligible,
      missingResources,
      requirements,
      resourceScore,
      etaScore,
      freshnessScore,
      loadScore,
      distanceScore,
      finalScore,
      components,
      total_score: Number((finalScore / 100).toFixed(4)),
    };
  });

  // Two-stage sorting (Section 8: Resource fulfillment must have priority):
  // STAGE 1: Full matches (fulfillmentPercentage === 100) sorted by finalScore DESC
  // STAGE 2: Partial matches (fulfillmentPercentage < 100 && fulfillmentPercentage > 0)
  //          prioritized by fulfilledCount DESC (3/4 > 2/4 > 1/4), then finalScore DESC
  // STAGE 3: Zero matches (fulfillmentPercentage === 0) sorted by finalScore DESC
  scored.sort((a, b) => {
    const aFull = a.fulfillmentPercentage === 100;
    const bFull = b.fulfillmentPercentage === 100;

    // Stage 1: full match always tops partial match
    if (aFull && !bFull) return -1;
    if (!aFull && bFull) return 1;

    // Both are full matches: sort by finalScore descending
    if (aFull && bFull) {
      return b.finalScore - a.finalScore;
    }

    // Stage 2: partial matches: prioritize fulfilledCount (e.g. 3/4 > 2/4 > 1/4)
    if (b.fulfilledCount !== a.fulfilledCount) {
      return b.fulfilledCount - a.fulfilledCount;
    }

    // Within same fulfilled count, sort by finalScore descending
    return b.finalScore - a.finalScore;
  });

  const minEta = scored.length ? Math.min(...scored.map((s) => s.eta)) : 0;
  const minKm = scored.length ? Math.min(...scored.map((s) => s.km)) : 0;

  return scored.map((s, index) => {
    const reasons: ReasonCode[] = [];
    if (s.isFullyEligible) reasons.push("ALL_RESOURCES");
    else if (s.fulfilledCount > 0) reasons.push("PARTIAL_RESOURCES");
    if (s.h.specialties?.includes(specialty) || specialty === "general") reasons.push("SPECIALTY_MATCH");
    if (s.eta === minEta) reasons.push("FASTEST_ETA");
    else if (s.eta < 10) reasons.push("GOOD_ETA");
    if (s.km === minKm && s.eta !== minEta) reasons.push("NEAREST");

    const lvl = freshnessLevel(s.ageSec);
    reasons.push(lvl === "fresh" ? "FRESH_DATA" : lvl === "aging" ? "AGING_DATA" : "STALE_DATA");
    const hLoad = s.h.load_pct ?? 0;
    reasons.push(hLoad < 40 ? "LOW_LOAD" : hLoad < 70 ? "MODERATE_LOAD" : "HIGH_LOAD");

    // Derive recommendation tier
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

    const isRecommended = index === 0 && matchType !== "UNAVAILABLE";

    const scoreBreakdown = {
      resourceFulfillment: s.resourceScore,
      eta: s.etaScore,
      freshness: s.freshnessScore,
      load: s.loadScore,
      distance: s.distanceScore,
    };

    return {
      // Legacy snake_case properties
      hospital_id: s.h.id,
      hospital_name: s.h.name,
      rank: index + 1,
      total_score: s.total_score,
      components: s.components,
      eta_min: s.eta,
      distance_km: s.km,
      stale: lvl === "stale",
      reasons,

      // Dev 2 Standardized contract properties
      hospitalId: s.h.id,
      hospitalName: s.h.name,
      distanceKm: s.km,
      etaMinutes: s.eta,
      fulfillmentPercentage: s.fulfillmentPercentage,
      isFullyEligible: s.isFullyEligible,
      resourceScore: s.resourceScore,
      etaScore: s.etaScore,
      freshnessScore: s.freshnessScore,
      loadScore: s.loadScore,
      distanceScore: s.distanceScore,
      finalScore: s.finalScore,
      dataAgeMinutes: s.dataAgeMinutes,
      currentLoad: s.h.load_pct ?? 0,
      lastUpdated: new Date(s.h.updated_at || Date.now()).toISOString(),

      // Smart Recommendation & Discovery properties
      matchType,
      requirementsFulfilled: s.fulfilledCount,
      requirementsTotal: s.totalRequired,
      missingResources: s.missingResources,
      requirements: s.requirements,
      scoreBreakdown,
      isRecommended,
    };
  });
}
