import { prisma } from "../config/database";
import { HospitalData, NearbyHospitalItem, ResourceKey, ResourceSlot, Severity } from "../types";
import { AppError } from "../middleware/errorHandler";
import { EventService } from "./event.service";
import { safeGetIO } from "../sockets/socket";
import { calculateDistanceKm, calculateEtaMinutes } from "../utils/distance";
import {
  calculateDistanceScore,
  calculateEtaScore,
  calculateFinalScore,
  calculateFreshnessScoreMinutes,
  calculateLoadScore,
} from "../utils/scoring";
import { env } from "../config/env";

export class HospitalService {
  public static formatHospital(h: any): HospitalData {
    const avail = h.availability || {
      icuAvailable: 0,
      icuTotal: 0,
      ventilatorAvailable: 0,
      ventilatorTotal: 0,
      cardiacAvailable: 0,
      cardiacTotal: 1,
      oxygenAvailable: 0,
      oxygenTotal: 0,
      burnsAvailable: 0,
      burnsTotal: 1,
      isConfirmedLive: false,
    };

    const now = Date.now();
    const lastUpdated = avail.lastUpdated ? new Date(avail.lastUpdated).getTime() : new Date(h.updatedAt).getTime();
    const ageMinutes = Math.max(0, Math.round((now - lastUpdated) / 60000));

    let availabilityStatus: "LIVE" | "STALE" | "VERY_STALE" | "UNKNOWN" = "UNKNOWN";
    if (!avail.isConfirmedLive) {
      availabilityStatus = "UNKNOWN";
    } else if (ageMinutes <= 10) {
      availabilityStatus = "LIVE";
    } else if (ageMinutes <= 30) {
      availabilityStatus = "STALE";
    } else {
      availabilityStatus = "VERY_STALE";
    }

    return {
      id: h.id,
      name: h.name,
      area: h.area,
      address: h.address ?? undefined,
      city: h.city ?? "Mumbai",
      state: h.state ?? "Maharashtra",
      pincode: h.pincode ?? undefined,
      phone: h.phone ?? undefined,
      hospital_type: h.hospitalType ?? "Multispeciality",
      lat: h.lat,
      lng: h.lng,
      active: h.active,
      is_active: h.active,
      verified: h.verified ?? true,
      source: h.source ?? undefined,
      source_reference: h.sourceReference ?? undefined,
      source_verified_at: h.sourceVerifiedAt ? new Date(h.sourceVerifiedAt).toISOString() : undefined,
      load_pct: h.loadPct,
      specialties: h.specialties || [],
      capabilities: {
        icu: h.icuSupported ?? true,
        ventilator: h.ventilatorSupported ?? true,
        oxygen: h.oxygenSupported ?? true,
        cardiac: h.cardiacSupported ?? true,
        burns: h.burnsSupported ?? false,
        trauma: h.traumaSupported ?? true,
        emergencyDepartment: h.emergencyDepartment ?? true,
      },
      resources: {
        icu: { available: avail.icuAvailable, total: avail.icuTotal },
        ventilator: { available: avail.ventilatorAvailable, total: avail.ventilatorTotal },
        cardiac: { available: avail.cardiacAvailable, total: avail.cardiacTotal },
        oxygen: { available: avail.oxygenAvailable, total: avail.oxygenTotal },
        burns: { available: avail.burnsAvailable, total: avail.burnsTotal },
      },
      is_confirmed_live: Boolean(avail.isConfirmedLive),
      availability_status: availabilityStatus,
      updated_at: lastUpdated,
      heartbeat: h.heartbeat,
    };
  }

  static async listHospitals(): Promise<HospitalData[]> {
    const hospitals = await prisma.hospital.findMany({
      include: { availability: true },
      orderBy: { name: "asc" },
    });

    return hospitals.map((h) => this.formatHospital(h));
  }

  static async getHospitalById(id: string): Promise<HospitalData> {
    const hospital = await prisma.hospital.findUnique({
      where: { id },
      include: { availability: true },
    });

    if (!hospital) {
      throw new AppError(`Hospital with id '${id}' not found`, 404, "HOSPITAL_NOT_FOUND");
    }

    return this.formatHospital(hospital);
  }

  static async getAvailability(id: string) {
    const hospital = await this.getHospitalById(id);
    return {
      id: hospital.id,
      resources: hospital.resources,
      updated_at: hospital.updated_at,
    };
  }

  /**
   * GET /api/hospitals/nearby implementation:
   * Queries real PostgreSQL hospitals, filters by radius, calculates deterministic distance & ETA,
   * evaluates resource fulfillment and freshness, derives markerState, and ranks candidates.
   */
  static async getNearbyHospitals(params: {
    lat: number;
    lng: number;
    radiusKm?: number;
    requiredResources?: ResourceKey[];
    severity?: Severity;
  }): Promise<{
    ambulance: { latitude: number; longitude: number };
    radiusKm: number;
    count: number;
    recommendation?: NearbyHospitalItem | null;
    alternatives?: NearbyHospitalItem[];
    hospitals: NearbyHospitalItem[];
  }> {
    const { lat, lng } = params;
    if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) {
      throw new AppError("Valid latitude and longitude coordinates are required.", 400, "INVALID_COORDINATES");
    }

    const radiusKm = params.radiusKm && params.radiusKm > 0 ? params.radiusKm : env.SEARCH_RADIUS_KM || 15;
    const requiredResources = params.requiredResources || [];

    // Query active & verified hospitals from PostgreSQL
    const hospitals = await prisma.hospital.findMany({
      where: { active: true },
      include: { availability: true },
    });

    const now = Date.now();
    const items: NearbyHospitalItem[] = [];

    for (const h of hospitals) {
      // 1. Straight-line Haversine distance
      const distanceKm = Number(
        calculateDistanceKm({ lat, lng }, { lat: h.lat, lng: h.lng }).toFixed(2)
      );

      // Only include hospitals within configured search radius
      if (distanceKm > radiusKm) {
        continue;
      }

      // 2. Deterministic ETA (with traffic overhead)
      const etaMinutes = calculateEtaMinutes(distanceKm);

      // 3. Availability and Freshness
      const avail = h.availability;
      const lastUpdatedDate = avail?.lastUpdated ? new Date(avail.lastUpdated) : new Date(h.updatedAt);
      const ageMinutes = Math.max(0, Math.round((now - lastUpdatedDate.getTime()) / 60000));
      const isConfirmedLive = Boolean(avail?.isConfirmedLive);

      let availabilityStatus: "LIVE" | "STALE" | "VERY_STALE" | "UNKNOWN" = "UNKNOWN";
      if (!isConfirmedLive) {
        availabilityStatus = "UNKNOWN";
      } else if (ageMinutes <= 10) {
        availabilityStatus = "LIVE";
      } else if (ageMinutes <= 30) {
        availabilityStatus = "STALE";
      } else {
        availabilityStatus = "VERY_STALE";
      }

      // 4. Resource counts & capabilities
      const capabilities = {
        icu: h.icuSupported ?? true,
        ventilator: h.ventilatorSupported ?? true,
        oxygen: h.oxygenSupported ?? true,
        cardiac: h.cardiacSupported ?? true,
        burns: h.burnsSupported ?? false,
        trauma: h.traumaSupported ?? true,
        emergencyDepartment: h.emergencyDepartment ?? true,
      };

      const availabilityCounts: Record<ResourceKey, number> = {
        icu: avail?.icuAvailable ?? 0,
        ventilator: avail?.ventilatorAvailable ?? 0,
        cardiac: avail?.cardiacAvailable ?? 0,
        oxygen: avail?.oxygenAvailable ?? 0,
        burns: avail?.burnsAvailable ?? 0,
      };

      const resourceSlots: Record<ResourceKey, ResourceSlot> = {
        icu: { available: avail?.icuAvailable ?? 0, total: avail?.icuTotal ?? 0 },
        ventilator: { available: avail?.ventilatorAvailable ?? 0, total: avail?.ventilatorTotal ?? 0 },
        cardiac: { available: avail?.cardiacAvailable ?? 0, total: avail?.cardiacTotal ?? 1 },
        oxygen: { available: avail?.oxygenAvailable ?? 0, total: avail?.oxygenTotal ?? 0 },
        burns: { available: avail?.burnsAvailable ?? 0, total: avail?.burnsTotal ?? 1 },
      };

      // 5. Requirements fulfillment & detailed eligibility
      const requirements: Record<string, { required: boolean; available: boolean; matched: boolean }> = {};
      const missingResources: string[] = [];
      let fulfilledCount = 0;

      if (requiredResources.length > 0) {
        for (const req of requiredResources) {
          const capSupported = (capabilities as any)[req] ?? false;
          const countAvail = availabilityCounts[req] ?? 0;
          const isMatched = capSupported && countAvail > 0;
          requirements[req] = {
            required: true,
            available: countAvail > 0,
            matched: isMatched,
          };
          if (isMatched) {
            fulfilledCount++;
          } else {
            missingResources.push(req);
          }
        }
      } else {
        fulfilledCount = 1;
      }

      const totalRequired = requiredResources.length > 0 ? requiredResources.length : 1;
      const fulfillmentPercentage = Math.round((fulfilledCount / totalRequired) * 100);
      const isFullyEligible = fulfillmentPercentage === 100 && h.active;

      // 6. Multi-Factor Scoring
      const resourceScore = fulfillmentPercentage;
      const etaScore = calculateEtaScore(etaMinutes);
      const freshnessScore =
        availabilityStatus === "LIVE"
          ? calculateFreshnessScoreMinutes(ageMinutes)
          : availabilityStatus === "STALE"
          ? 40
          : 10;
      const loadScore = calculateLoadScore(h.loadPct);
      const distanceScore = calculateDistanceScore(distanceKm, radiusKm);

      const finalScore = calculateFinalScore(
        resourceScore,
        etaScore,
        freshnessScore,
        loadScore,
        distanceScore
      );

      // Recommendation Tier (Section 9)
      let matchType: "FULL_MATCH" | "PARTIAL_MATCH" | "UNAVAILABLE" | "STALE" = "UNAVAILABLE";
      if (!h.active) {
        matchType = "UNAVAILABLE";
      } else if (fulfillmentPercentage === 100) {
        matchType = "FULL_MATCH";
      } else if (fulfilledCount > 0) {
        matchType = "PARTIAL_MATCH";
      } else if (availabilityStatus === "STALE" || availabilityStatus === "VERY_STALE") {
        matchType = "STALE";
      } else {
        matchType = "UNAVAILABLE";
      }

      // 7. Marker State Derivation (Section 12 & 13)
      let markerState: "GREEN" | "YELLOW" | "RED" | "GREY" = "GREEN";
      if (!h.active) {
        markerState = "GREY";
      } else if (fulfillmentPercentage === 100) {
        markerState = "GREEN"; // Full match
      } else if (fulfillmentPercentage > 0) {
        markerState = "YELLOW"; // Partial match
      } else {
        markerState = "RED"; // Unavailable (0% match)
      }

      items.push({
        id: h.id,
        name: h.name,
        area: h.area,
        address: h.address ?? undefined,
        city: h.city ?? "Mumbai",
        state: h.state ?? "Maharashtra",
        pincode: h.pincode ?? undefined,
        phone: h.phone ?? undefined,
        hospitalType: h.hospitalType ?? "Multispeciality",
        latitude: h.lat,
        longitude: h.lng,
        lat: h.lat,
        lng: h.lng,
        active: h.active,
        distanceKm,
        etaMinutes,
        etaSource: "deterministic",
        verified: h.verified ?? true,
        source: h.source ?? undefined,
        sourceReference: h.sourceReference ?? undefined,
        sourceVerifiedAt: h.sourceVerifiedAt ? new Date(h.sourceVerifiedAt).toISOString() : undefined,
        capabilities,
        availability: availabilityCounts,
        resources: resourceSlots,
        availabilityStatus,
        isConfirmedLive,
        lastUpdatedAt: lastUpdatedDate.toISOString(),
        currentLoad: h.loadPct,
        matchScore: finalScore,
        scoreBreakdown: {
          resource: resourceScore,
          eta: etaScore,
          freshness: freshnessScore,
          load: loadScore,
          distance: distanceScore,
        },
        markerState,
        isRecommended: false, // will be assigned to top candidate
        fulfillmentPercentage,
        matchType,
        requirementsFulfilled: fulfilledCount,
        requirementsTotal: totalRequired,
        missingResources,
        requirements,
        specialties: h.specialties || [],
      });
    }

    // Two-stage sorting (Section 8: Resource fulfillment must have priority):
    // STAGE 1: Full matches (fulfillmentPercentage === 100) sorted by matchScore DESC
    // STAGE 2: Partial matches (fulfillmentPercentage < 100 && fulfillmentPercentage > 0)
    //          prioritized by requirementsFulfilled DESC (3/4 > 2/4 > 1/4), then matchScore DESC
    // STAGE 3: Zero matches or inactive
    items.sort((a, b) => {
      const aFull = a.fulfillmentPercentage === 100;
      const bFull = b.fulfillmentPercentage === 100;

      if (aFull && !bFull) return -1;
      if (!aFull && bFull) return 1;

      if (aFull && bFull) {
        return b.matchScore - a.matchScore;
      }

      if (b.requirementsFulfilled !== a.requirementsFulfilled) {
        return b.requirementsFulfilled - a.requirementsFulfilled;
      }

      return b.matchScore - a.matchScore;
    });

    // Smart Recommendation assignment:
    // If full match exists: top full match is recommended.
    // If no full match exists, top partial match (if any) is recommended as BEST AVAILABLE MATCH!
    const topEligible = items.find((h) => h.active && h.matchType !== "UNAVAILABLE" && h.requirementsFulfilled > 0);
    if (topEligible) {
      topEligible.isRecommended = true;
    }

    const recommendation = topEligible || null;
    const alternatives = topEligible ? items.filter((h) => h.id !== topEligible.id) : items;

    return {
      ambulance: { latitude: lat, longitude: lng },
      radiusKm,
      count: items.length,
      recommendation,
      alternatives,
      hospitals: items,
    };
  }

  static async updateAvailability(
    id: string,
    patch: Partial<Record<ResourceKey, number>>,
    actor: string
  ) {
    const hospital = await prisma.hospital.findUnique({
      where: { id },
      include: { availability: true },
    });

    if (!hospital) {
      throw new AppError(`Hospital with id '${id}' not found`, 404, "HOSPITAL_NOT_FOUND");
    }

    const currentAvail = hospital.availability;
    const now = new Date();

    const oldAvailability = currentAvail
      ? {
          icu: currentAvail.icuAvailable,
          ventilator: currentAvail.ventilatorAvailable,
          oxygen: currentAvail.oxygenAvailable,
          cardiac: currentAvail.cardiacAvailable,
          burns: currentAvail.burnsAvailable,
        }
      : null;

    const updatedAvail = await prisma.bedAvailability.upsert({
      where: { hospitalId: id },
      create: {
        hospitalId: id,
        icuAvailable: patch.icu ?? 0,
        icuTotal: Math.max(patch.icu ?? 0, 10),
        ventilatorAvailable: patch.ventilator ?? 0,
        ventilatorTotal: Math.max(patch.ventilator ?? 0, 6),
        cardiacAvailable: patch.cardiac ?? 0,
        cardiacTotal: 1,
        oxygenAvailable: patch.oxygen ?? 0,
        oxygenTotal: Math.max(patch.oxygen ?? 0, 15),
        burnsAvailable: patch.burns ?? 0,
        burnsTotal: 1,
        isConfirmedLive: true,
        lastUpdated: now,
        updatedBy: actor,
      },
      update: {
        ...(patch.icu !== undefined
          ? {
              icuAvailable: Math.max(0, patch.icu),
              icuTotal: Math.max(currentAvail?.icuTotal ?? 0, patch.icu),
            }
          : {}),
        ...(patch.ventilator !== undefined
          ? {
              ventilatorAvailable: Math.max(0, patch.ventilator),
              ventilatorTotal: Math.max(currentAvail?.ventilatorTotal ?? 0, patch.ventilator),
            }
          : {}),
        ...(patch.cardiac !== undefined ? { cardiacAvailable: patch.cardiac ? 1 : 0 } : {}),
        ...(patch.oxygen !== undefined
          ? {
              oxygenAvailable: Math.max(0, patch.oxygen),
              oxygenTotal: Math.max(currentAvail?.oxygenTotal ?? 0, patch.oxygen),
            }
          : {}),
        ...(patch.burns !== undefined ? { burnsAvailable: patch.burns ? 1 : 0 } : {}),
        isConfirmedLive: true,
        lastUpdated: now,
        updatedBy: actor,
      },
    });

    // Update hospital's timestamp
    await prisma.hospital.update({
      where: { id },
      data: { updatedAt: now },
    });

    const newAvailability = {
      icu: updatedAvail.icuAvailable,
      ventilator: updatedAvail.ventilatorAvailable,
      oxygen: updatedAvail.oxygenAvailable,
      cardiac: updatedAvail.cardiacAvailable,
      burns: updatedAvail.burnsAvailable,
    };

    // Log the audit event in event_logs
    await EventService.logEvent({
      hospitalId: id,
      actor,
      type: "HOSPITAL_AVAILABILITY_UPDATED",
      message: `${hospital.name} updated live availability`,
      metadata: {
        oldAvailability,
        newAvailability,
        patch,
        source: "HOSPITAL_PORTAL",
      },
    });

    const formatted = this.formatHospital({ ...hospital, availability: updatedAvail, updatedAt: now });

    // Emit real-time availability update via Socket.IO
    const io = safeGetIO();
    if (io) {
      // Emit HOSPITAL_AVAILABILITY_UPDATED event as required by spec
      io.emit("HOSPITAL_AVAILABILITY_UPDATED", {
        event: "HOSPITAL_AVAILABILITY_UPDATED",
        hospitalId: id,
        hospitalName: hospital.name,
        availability: newAvailability,
        resources: formatted.resources,
        lastUpdatedAt: now.toISOString(),
        availabilityStatus: "LIVE",
      });

      // Also emit AVAILABILITY_UPDATED for backwards compatibility
      io.emit("AVAILABILITY_UPDATED", {
        event: "AVAILABILITY_UPDATED",
        hospitalId: id,
        hospitalName: hospital.name,
        patch,
        resources: formatted.resources,
        updatedAt: now.getTime(),
      });
    }

    return {
      ok: true,
      updated_at: now.getTime(),
      hospital: formatted,
    };
  }
}
