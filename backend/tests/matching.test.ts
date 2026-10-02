import { calculateDistanceKm, calculateEtaMinutes } from "../src/utils/distance";
import { rankHospitals, calculateFreshnessScore } from "../src/utils/scoring";
import { HospitalData } from "../src/types";

describe("Matching & Scoring Engine Unit Tests", () => {
  const dummyHospitalA: HospitalData = {
    id: "h-a",
    name: "Hospital Alpha",
    area: "Central",
    lat: 19.01,
    lng: 72.84,
    active: true,
    load_pct: 20,
    specialties: ["cardiology", "trauma", "general"],
    resources: {
      icu: { available: 5, total: 10 },
      ventilator: { available: 3, total: 6 },
      cardiac: { available: 1, total: 1 },
      oxygen: { available: 8, total: 15 },
      burns: { available: 0, total: 1 },
    },
    updated_at: Date.now() - 30 * 1000, // 30 sec old (fresh)
    heartbeat: true,
  };

  const dummyHospitalB: HospitalData = {
    id: "h-b",
    name: "Hospital Beta",
    area: "North",
    lat: 19.08,
    lng: 72.88,
    active: true,
    load_pct: 85,
    specialties: ["cardiology", "general"],
    resources: {
      icu: { available: 1, total: 8 },
      ventilator: { available: 1, total: 5 },
      cardiac: { available: 1, total: 1 },
      oxygen: { available: 4, total: 12 },
      burns: { available: 0, total: 1 },
    },
    updated_at: Date.now() - 400 * 1000, // 400 sec old (stale)
    heartbeat: false,
  };

  it("calculates accurate Haversine distance in kilometers", () => {
    const dadar = { lat: 19.0178, lng: 72.8478 };
    const parel = { lat: 19.003, lng: 72.841 };
    const distance = calculateDistanceKm(dadar, parel);
    expect(distance).toBeGreaterThan(1.5);
    expect(distance).toBeLessThan(2.5);
  });

  it("calculates deterministic ETA with dispatch overhead", () => {
    const eta = calculateEtaMinutes(10);
    // 1 + (10 * 1.3 / 40) * 60 = 1 + 19.5 = 20.5
    expect(eta).toBeCloseTo(20.5, 1);
  });

  it("calculates freshness penalties properly", () => {
    expect(calculateFreshnessScore(20)).toBe(1.0); // fresh < 60s
    expect(calculateFreshnessScore(500)).toBe(0.1); // stale > 300s
  });

  it("ranks Alpha above Beta due to closer distance, fresher data, and lower load", () => {
    const input = {
      type: "Cardiac" as const,
      resources: ["icu", "ventilator", "cardiac"] as any,
      location: { lat: 19.0178, lng: 72.8478 },
    };

    const ranked = rankHospitals(input, [dummyHospitalA, dummyHospitalB], Date.now());
    expect(ranked.length).toBe(2);
    expect(ranked[0].hospital_id).toBe("h-a");
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].total_score).toBeGreaterThan(ranked[1].total_score);
    expect(ranked[0].reasons).toContain("FRESH_DATA");
    expect(ranked[1].reasons).toContain("STALE_DATA");
  });
});
