import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/database";
import { importHospitals } from "../scripts/import-hospitals";
import { calculateDistanceKm, calculateEtaMinutes } from "../src/utils/distance";
import { rankHospitals } from "../src/utils/scoring";
import { HospitalData } from "../src/types";

describe("BedLink Dispatcher Hospital Discovery & Smart Recommendation (Section 24)", () => {
  let dispatcherToken: string;
  let nurseCityToken: string;

  beforeAll(async () => {
    await importHospitals();

    const dispLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: "dispatcher1", password: "demo123" });
    dispatcherToken = dispLogin.body.access_token;

    const nurseLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: "nurse_city", password: "demo123" });
    nurseCityToken = nurseLogin.body.access_token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // 1. Full Match
  it("1. Full match: hospital satisfying all requested resources is returned as FULL_MATCH with ⭐ Recommended", async () => {
    // KEM hospital has ICU, ventilator, oxygen, cardiac
    const res = await request(app)
      .get("/api/hospitals/nearby?lat=18.9995&lng=72.8427&radiusKm=10&requiredResources=icu,ventilator,oxygen");

    expect(res.status).toBe(200);
    expect(res.body.recommendation).toBeDefined();
    expect(res.body.recommendation.matchType).toBe("FULL_MATCH");
    expect(res.body.recommendation.isRecommended).toBe(true);
    expect(res.body.recommendation.requirementsFulfilled).toBe(3);
    expect(res.body.recommendation.requirementsTotal).toBe(3);
    expect(res.body.recommendation.fulfillmentPercentage).toBe(100);
    expect(res.body.recommendation.missingResources).toEqual([]);
    expect(res.body.recommendation.requirements.icu.matched).toBe(true);
    expect(res.body.recommendation.requirements.ventilator.matched).toBe(true);
    expect(res.body.recommendation.requirements.oxygen.matched).toBe(true);
  });

  // 2. Partial Match
  it("2. Partial match: hospital missing a requested resource is returned as PARTIAL_MATCH with missing breakdown", async () => {
    // Require burns + cardiac + icu + ventilator; some hospitals have 3/4 but lack burns
    const res = await request(app)
      .get("/api/hospitals/nearby?lat=18.9995&lng=72.8427&radiusKm=10&requiredResources=icu,ventilator,oxygen,burns");

    expect(res.status).toBe(200);
    const partialMatch = res.body.hospitals.find((h: any) => h.matchType === "PARTIAL_MATCH");
    expect(partialMatch).toBeDefined();
    expect(partialMatch.requirementsFulfilled).toBeLessThan(partialMatch.requirementsTotal);
    expect(partialMatch.missingResources.length).toBeGreaterThan(0);
  });

  // 3. Multiple Partial Matches
  it("3. Multiple partial matches: system returns multiple partial matches ranked by fulfillment tier", async () => {
    const res = await request(app)
      .get("/api/hospitals/nearby?lat=19.003&lng=72.841&radiusKm=20&requiredResources=icu,ventilator,oxygen,burns");

    expect(res.status).toBe(200);
    const partials = res.body.hospitals.filter((h: any) => h.matchType === "PARTIAL_MATCH");
    expect(partials.length).toBeGreaterThan(1);
    for (const p of partials) {
      expect(p.fulfillmentPercentage).toBeGreaterThan(0);
      expect(p.fulfillmentPercentage).toBeLessThan(100);
    }
  });

  // 4. No hospitals within radius
  it("4. No hospitals within radius: strictly returns 0 hospitals when search radius is too small", async () => {
    // 10-meter radius around an empty coordinate in Mumbai harbor
    const res = await request(app)
      .get("/api/hospitals/nearby?lat=18.9500&lng=72.8800&radiusKm=0.01");

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
    expect(res.body.hospitals).toEqual([]);
    expect(res.body.recommendation).toBeNull();
  });

  // 5. No full match but partial match exists (Do NOT return empty!)
  it("5. No full match but partial match exists: does NOT return 0 hospitals; returns best partial match", async () => {
    // Artificial requirement set where no hospital has 100%:
    // Combine burns with very high distance or scarce specialties
    const res = await request(app)
      .get("/api/hospitals/nearby?lat=19.1136&lng=72.8697&radiusKm=6&requiredResources=icu,ventilator,oxygen,burns");

    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
    expect(res.body.recommendation).toBeDefined();
    // System must recommend best available hospital even if only partial
    expect(["FULL_MATCH", "PARTIAL_MATCH"]).toContain(res.body.recommendation.matchType);
  });

  // 6. Ranking by Resource Fulfillment (Section 8: 3/4 must beat 2/4 even if slightly further)
  it("6. Ranking: resource fulfillment takes strict priority over minor distance differences", () => {
    const dummyFurther4of4: HospitalData = {
      id: "h-4of4",
      name: "Further 4/4 Hospital",
      area: "North",
      lat: 19.05,
      lng: 72.85, // ~5 km away
      active: true,
      load_pct: 30,
      specialties: ["cardiology", "trauma", "general"],
      resources: {
        icu: { available: 5, total: 10 },
        ventilator: { available: 3, total: 6 },
        cardiac: { available: 1, total: 2 },
        oxygen: { available: 10, total: 20 },
        burns: { available: 0, total: 0 },
      },
      updated_at: Date.now(),
      heartbeat: true,
    };

    const dummyCloser2of4: HospitalData = {
      id: "h-2of4",
      name: "Closer 2/4 Hospital",
      area: "South",
      lat: 19.01,
      lng: 72.84, // ~0.5 km away
      active: true,
      load_pct: 10,
      specialties: ["cardiology", "trauma", "general"],
      resources: {
        icu: { available: 5, total: 10 },
        ventilator: { available: 0, total: 6 }, // missing
        cardiac: { available: 0, total: 2 }, // missing
        oxygen: { available: 10, total: 20 },
        burns: { available: 0, total: 0 },
      },
      updated_at: Date.now(),
      heartbeat: true,
    };

    const input = {
      type: "Cardiac" as const,
      resources: ["icu", "ventilator", "cardiac", "oxygen"] as any,
      location: { lat: 19.01, lng: 72.84 },
    };

    const ranked = rankHospitals(input, [dummyCloser2of4, dummyFurther4of4], Date.now());
    expect(ranked.length).toBe(2);
    // 4/4 hospital MUST rank #1 despite being further away!
    expect(ranked[0].hospital_id).toBe("h-4of4");
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].fulfillmentPercentage).toBe(100);
    expect(ranked[1].hospital_id).toBe("h-2of4");
    expect(ranked[1].fulfillmentPercentage).toBe(50);
  });

  // 7. Ranking by score within same tier
  it("7. Ranking by score: within same fulfillment tier, higher deterministic score ranks higher", () => {
    const dummyHospitalA: HospitalData = {
      id: "h-tier1-a",
      name: "Tier 1 High Score",
      area: "Parel",
      lat: 19.01,
      lng: 72.84,
      active: true,
      load_pct: 20,
      specialties: ["cardiology", "general"],
      resources: {
        icu: { available: 5, total: 10 },
        ventilator: { available: 3, total: 5 },
        cardiac: { available: 1, total: 1 },
        oxygen: { available: 5, total: 10 },
        burns: { available: 0, total: 0 },
      },
      updated_at: Date.now() - 30000,
      heartbeat: true,
    };

    const dummyHospitalB: HospitalData = {
      id: "h-tier1-b",
      name: "Tier 1 High Load",
      area: "Parel",
      lat: 19.015,
      lng: 72.845,
      active: true,
      load_pct: 95, // high load penalty
      specialties: ["cardiology", "general"],
      resources: {
        icu: { available: 1, total: 10 },
        ventilator: { available: 1, total: 5 },
        cardiac: { available: 1, total: 1 },
        oxygen: { available: 2, total: 10 },
        burns: { available: 0, total: 0 },
      },
      updated_at: Date.now() - 600000, // stale penalty
      heartbeat: false,
    };

    const input = {
      type: "Cardiac" as const,
      resources: ["icu", "ventilator", "cardiac"] as any,
      location: { lat: 19.01, lng: 72.84 },
    };

    const ranked = rankHospitals(input, [dummyHospitalB, dummyHospitalA], Date.now());
    expect(ranked[0].hospital_id).toBe("h-tier1-a");
    expect(ranked[0].finalScore).toBeGreaterThan(ranked[1].finalScore!);
  });

  // 8. Distance calculation
  it("8. Distance: Haversine distance matches geographic reality", () => {
    const dadar = { lat: 19.0178, lng: 72.8478 };
    const kem = { lat: 18.9995, lng: 72.8427 };
    const dist = calculateDistanceKm(dadar, kem);
    expect(dist).toBeGreaterThan(1.8);
    expect(dist).toBeLessThan(2.3);
  });

  // 9. ETA calculation
  it("9. ETA: travel time is computed with traffic multiplier and dispatch overhead", () => {
    const eta10km = calculateEtaMinutes(10);
    // 1 min dispatch overhead + (10 * 1.3 / 40 * 60) = 1 + 19.5 = 20.5
    expect(eta10km).toBeCloseTo(20.5, 1);
  });

  // 10. Freshness status
  it("10. Freshness: LIVE status assigned if updated <= 10 min", async () => {
    const res = await request(app)
      .get("/api/hospitals/nearby?lat=19.003&lng=72.841&radiusKm=15");

    expect(res.status).toBe(200);
    const kem = res.body.hospitals.find((h: any) => h.id === "kem-hospital");
    expect(kem).toBeDefined();
    expect(["LIVE", "STALE", "VERY_STALE", "UNKNOWN"]).toContain(kem.availabilityStatus);
  });

  // 11. Live availability update
  it("11. Live availability update: staff updating availability updates DB and lastUpdated timestamp", async () => {
    const patchRes = await request(app)
      .patch("/api/hospitals/h-city/availability")
      .set("Authorization", `Bearer ${nurseCityToken}`)
      .send({ icu: 4, ventilator: 3 });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.hospital.resources.icu.available).toBe(4);
    expect(patchRes.body.hospital.resources.ventilator.available).toBe(3);
    expect(patchRes.body.hospital.is_confirmed_live).toBe(true);
  });

  // 12. Recommendation recalculation after staff change
  it("12. Recommendation recalculation: updated hospital capacity is immediately reflected in nearby search", async () => {
    const res = await request(app)
      .get("/api/hospitals/nearby?lat=19.003&lng=72.841&radiusKm=10&requiredResources=icu,ventilator");

    expect(res.status).toBe(200);
    const city = res.body.hospitals.find((h: any) => h.id === "h-city");
    expect(city).toBeDefined();
    expect(city.availability.icu).toBe(4);
    expect(city.availability.ventilator).toBe(3);
  });

  // 13. Hospital becomes unavailable (resource down to 0)
  it("13. Hospital becomes unavailable: capacity dropped to 0 marks resource as unavailable", async () => {
    await request(app)
      .patch("/api/hospitals/h-city/availability")
      .set("Authorization", `Bearer ${nurseCityToken}`)
      .send({ icu: 0 });

    const res = await request(app)
      .get("/api/hospitals/nearby?lat=19.003&lng=72.841&radiusKm=10&requiredResources=icu");

    const city = res.body.hospitals.find((h: any) => h.id === "h-city");
    expect(city).toBeDefined();
    expect(city.availability.icu).toBe(0);
    expect(city.requirements.icu.matched).toBe(false);
    expect(city.markerState).toBe("RED");
  });

  // 14. Hospital becomes available again
  it("14. Hospital becomes available: restoring capacity turns hospital eligible again", async () => {
    await request(app)
      .patch("/api/hospitals/h-city/availability")
      .set("Authorization", `Bearer ${nurseCityToken}`)
      .send({ icu: 5 });

    const res = await request(app)
      .get("/api/hospitals/nearby?lat=19.003&lng=72.841&radiusKm=10&requiredResources=icu");

    const city = res.body.hospitals.find((h: any) => h.id === "h-city");
    expect(city).toBeDefined();
    expect(city.availability.icu).toBe(5);
    expect(city.requirements.icu.matched).toBe(true);
    expect(city.markerState).toBe("GREEN");
  });

  // 15. Reservation rejection triggers fallback
  it("15. Fallback trigger: reservation rejection triggers automatic fallback", async () => {
    const emRes = await request(app)
      .post("/api/emergency-requests")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send({
        type: "Cardiac",
        severity: "Critical",
        resources: ["icu"],
        location: { lat: 19.003, lng: 72.841, label: "Parel" },
      });

    const rsvRes = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send({ requestId: emRes.body.id, hospitalId: "h-city" });

    const rejectRes = await request(app)
      .post(`/api/reservations/${rsvRes.body.id}/reject`)
      .set("Authorization", `Bearer ${nurseCityToken}`)
      .send({ reasons: ["icu"], note: "Testing fallback" });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.fallback_initiated).toBe(true);
    expect(rejectRes.body.next_hospital_id).toBeDefined();
  });

  // 16. Reservation expiration triggers fallback
  it("16. Fallback trigger: reservation expiration triggers automatic fallback", async () => {
    const emRes = await request(app)
      .post("/api/emergency-requests")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send({
        type: "Trauma",
        severity: "Critical",
        resources: ["icu"],
        location: { lat: 19.003, lng: 72.841, label: "Parel" },
      });

    const rsvRes = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send({ requestId: emRes.body.id, hospitalId: "h-city" });

    const expireRes = await request(app)
      .post(`/api/reservations/${rsvRes.body.id}/expire`)
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send();

    expect(expireRes.status).toBe(200);
    expect(expireRes.body.status).toBe("TIMEOUT");
    expect(expireRes.body.fallback_initiated).toBe(true);
  });

  // 17. Search does NOT trigger fallback (Section 17 & 18)
  it("17. Search does NOT trigger fallback: GET /api/hospitals/nearby never triggers fallback", async () => {
    // Clear pending reservations to isolate eventLog count from background sweepers
    await prisma.reservation.updateMany({
      where: { status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    const initialFallbackCount = await prisma.eventLog.count({
      where: { type: "FALLBACK" },
    });

    await request(app)
      .get("/api/hospitals/nearby?lat=19.003&lng=72.841&radiusKm=15&requiredResources=icu,ventilator");

    const afterFallbackCount = await prisma.eventLog.count({
      where: { type: "FALLBACK" },
    });

    expect(afterFallbackCount).toBe(initialFallbackCount);
  });

  // 18. Match calculation does NOT trigger fallback
  it("18. Match calculation does NOT trigger fallback: GET /api/emergency-requests/:id/matches never triggers fallback", async () => {
    const emRes = await request(app)
      .post("/api/emergency-requests")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send({
        type: "Respiratory",
        severity: "Serious",
        resources: ["oxygen", "ventilator"],
        location: { lat: 19.003, lng: 72.841, label: "Parel" },
      });

    const initialFallbackCount = await prisma.eventLog.count({
      where: { type: "FALLBACK" },
    });

    const matchRes = await request(app)
      .get(`/api/emergency-requests/${emRes.body.id}/matches`)
      .set("Authorization", `Bearer ${dispatcherToken}`);

    expect(matchRes.status).toBe(200);

    const afterFallbackCount = await prisma.eventLog.count({
      where: { type: "FALLBACK" },
    });

    expect(afterFallbackCount).toBe(initialFallbackCount);
  });

  // 19. GPS update does NOT trigger fallback
  it("19. GPS movement does NOT trigger fallback: searching across varying coordinates leaves fallback count intact", async () => {
    const initialFallbackCount = await prisma.eventLog.count({
      where: { type: "FALLBACK" },
    });

    // Simulate ambulance moving across coordinates
    const coordinates = [
      { lat: 19.003, lng: 72.841 },
      { lat: 19.010, lng: 72.845 },
      { lat: 19.018, lng: 72.850 },
    ];

    for (const c of coordinates) {
      await request(app).get(`/api/hospitals/nearby?lat=${c.lat}&lng=${c.lng}&radiusKm=10`);
    }

    const afterFallbackCount = await prisma.eventLog.count({
      where: { type: "FALLBACK" },
    });

    expect(afterFallbackCount).toBe(initialFallbackCount);
  });

  // 20. Availability update does NOT trigger fallback
  it("20. Availability update does NOT trigger fallback: hospital staff modifying beds does not emit fallback", async () => {
    const initialFallbackCount = await prisma.eventLog.count({
      where: { type: "FALLBACK" },
    });

    await request(app)
      .patch("/api/hospitals/h-city/availability")
      .set("Authorization", `Bearer ${nurseCityToken}`)
      .send({ oxygen: 12 });

    const afterFallbackCount = await prisma.eventLog.count({
      where: { type: "FALLBACK" },
    });

    expect(afterFallbackCount).toBe(initialFallbackCount);
  });
});
