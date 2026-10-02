import { env } from "../config/env";
import { MatchResult, ResourceKey } from "../types";
import { HospitalService } from "./hospital.service";
import { rankHospitals } from "../utils/scoring";
import { logger } from "../utils/logger";

export interface EmergencyMatchInput {
  type: string;
  resources: ResourceKey[];
  location: {
    lat: number;
    lng: number;
  };
}

export class MatchingService {
  static async getMatches(input: EmergencyMatchInput, excludeHospitalIds: string[] = []): Promise<MatchResult[]> {
    const allHospitals = await HospitalService.listHospitals();
    return rankHospitals(
      {
        type: input.type as any,
        resources: input.resources,
        location: input.location,
      },
      allHospitals,
      Date.now(),
      excludeHospitalIds
    );
  }

  /**
   * Explains why a hospital received a particular match score.
   * Delegates to GroqService with deterministic fallback.
   * NOTE: Groq NEVER determines ranking, calculates scores, or overrides state.
   */
  static async explainMatch(match: MatchResult, hospitalName: string): Promise<string> {
    const { GroqService } = await import("./groq.service");
    return GroqService.explainMatch({
      hospital: hospitalName,
      resourceMatch: match.fulfillmentPercentage ?? Math.round(match.components.resource * 100),
      etaMinutes: match.eta_min,
      distanceKm: match.distance_km,
      freshnessMinutes: match.dataAgeMinutes ?? 2,
      load: match.currentLoad ?? 25,
      finalScore: match.finalScore ?? Math.round(match.total_score * 100),
    });
  }
}
