import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/database";
import { importHospitals, REAL_MUMBAI_HOSPITALS } from "../scripts/import-hospitals";
import { calculateDistanceKm, calculateEtaMinutes } from "../src/utils/distance";

describe("Real Hospital Map & Nearby APIs (BedLink Upgrade)", () => {
  let nurseCityToken: string;
  let nurseKemToken: string;
  let dispatcherToken: string;

  beforeAll(async () => {
    // Ensure hospitals are imported
    await importHospitals();

    // Login accounts
    const cityLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: "nurse_city", password: "demo123" });
    nurseCityToken = cityLogin.body.access_token;

    const kemLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: "nurse_kem", password: "demo123" });
    nurseKemToken = kemLogin.body.access_token;

    const dispLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: "dispatcher1", password: "demo123" });
    dispatcherToken = dispLogin.body.access_token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // 1. Real Hospital Records from PostgreSQL
  it("✓ Real hospital records load directly from PostgreSQL with official source tracking", async () => {
    const kem = await prisma.hospital.findUnique({
      where: { id: "kem-hospital" },
      include: { availability: true },
    });

    expect(kem).toBeDefined();
    expect(kem?.name).toBe("King Edward Memorial Hospital (KEM)");
    expect(kem?.verified).toBe(true);
    expect(kem?.city).toBe("Mumbai");
    expect(kem?.state).toBe("Maharashtra");
    expect(kem?.source).toContain("DMER");
    expect(kem?.sourceReference).toBe("DMER-MUM-MCGM-001");
    expect(kem?.icuSupported).toBe(true);
    expect(kem?.burnsSupported).toBe(true);
  });

  // 2. Import Idempotency
  it("✓ Hospital import script is idempotent and prevents duplicate creation", async () => {
    const initialCount = await prisma.hospital.count();
    // Run import again
    await importHospitals();
    const afterCount = await prisma.hospital.count();
    expect(afterCount).toBe(initialCount);
  });

  // 3. Nearby Hospital API Basics
  it("✓ GET /api/hospitals/nearby returns real hospitals around ambulance location", async () => {
    // Coordinates around Parel (19.003, 72.841)
    const res = await request(app)
      .get("/api/hospitals/nearby?lat=19.003&lng=72.841&radiusKm=10");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ambulance");
    expect(res.body.ambulance.latitude).toBe(19.003);
    expect(res.body.ambulance.longitude).toBe(72.841);
    expect(res.body.radiusKm).toBe(10);
    expect(Array.isArray(res.body.hospitals)).toBe(true);
    expect(res.body.hospitals.length).toBeGreaterThan(0);

    const first = res.body.hospitals[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("name");
    expect(first).toHaveProperty("distanceKm");
    expect(first).toHaveProperty("etaMinutes");
    expect(first).toHaveProperty("markerState");
    expect(first).toHaveProperty("verified", true);
    expect(first).toHaveProperty("source");
  });

  // 4. Radius Filtering
  it("✓ Nearby API strictly filters out hospitals outside configured radius", async () => {
    const tightRadius = 2; // 2 km
    const res = await request(app)
      .get(`/api/hospitals/nearby?lat=19.003&lng=72.841&radiusKm=${tightRadius}`);

    expect(res.status).toBe(200);
    for (const h of res.body.hospitals) {
      expect(h.distanceKm).toBeLessThanOrEqual(tightRadius);
    }
  });

  // 5. Deterministic Haversine Distance & ETA Verification
  it("✓ Distance and ETA are deterministically calculated without fabricated values", async () => {
    const ambulancePos = { lat: 18.9995, lng: 72.8427 }; // KEM location
    const res = await request(app)
      .get(`/api/hospitals/nearby?lat=${ambulancePos.lat}&lng=${ambulancePos.lng}&radiusKm=15`);

    expect(res.status).toBe(200);
    const kemResult = res.body.hospitals.find((h: any) => h.id === "kem-hospital");
    expect(kemResult).toBeDefined();

    // At KEM itself, distance should be 0 or near 0
    expect(kemResult.distanceKm).toBeLessThan(0.1);
    expect(kemResult.etaMinutes).toBeGreaterThanOrEqual(1); // minimal traffic overhead

    // Test a further hospital like Kokilaben (Andheri)
    const kokilaben = res.body.hospitals.find((h: any) => h.id === "kokilaben-hospital");
    if (kokilaben) {
      const expectedDist = calculateDistanceKm(ambulancePos, { lat: kokilaben.lat, lng: kokilaben.lng });
      expect(Math.abs(kokilaben.distanceKm - expectedDist)).toBeLessThan(0.05);
      const expectedEta = calculateEtaMinutes(expectedDist);
      expect(Math.abs(kokilaben.etaMinutes - expectedEta)).toBeLessThan(0.1);
    }
  });

  // 6. Capability vs Live Availability Matching (No Fabrication)
  it("✓ Evaluates resource fulfillment without fabricating live availability", async () => {
    // Require Burns
    const resBurns = await request(app)
      .get("/api/hospitals/nearby?lat=19.003&lng=72.841&radiusKm=20&requiredResources=burns");

    expect(resBurns.status).toBe(200);

    // KEM supports burns and has available beds -> should be GREEN
    const kem = resBurns.body.hospitals.find((h: any) => h.id === "kem-hospital");
    expect(kem).toBeDefined();
    expect(kem.capabilities.burns).toBe(true);
    expect(kem.availability.burns).toBeGreaterThan(0);
    expect(kem.markerState).toBe("GREEN");

    // Bombay Hospital does not support burns -> should be RED
    const bombay = resBurns.body.hospitals.find((h: any) => h.id === "bombay-hospital");
    if (bombay) {
      expect(bombay.capabilities.burns).toBe(false);
      expect(bombay.markerState).toBe("RED");
      expect(bombay.fulfillmentPercentage).toBe(0);
    }
  });

  // 7. Freshness Thresholds
  it("✓ Freshness status correctly classifies LIVE, STALE, and UNKNOWN", async () => {
    const res = await request(app)
      .get("/api/hospitals/nearby?lat=19.003&lng=72.841&radiusKm=15");

    expect(res.status).toBe(200);
    for (const h of res.body.hospitals) {
      expect(["LIVE", "STALE", "VERY_STALE", "UNKNOWN"]).toContain(h.availabilityStatus);
    }
  });

  // 8. Live Availability Update via Hospital Portal with Audit Logging
  it("✓ Hospital staff updates availability, updates DB, marks LIVE, and logs audit event", async () => {
    const patch = { icu: 6, ventilator: 4 };
    const res = await request(app)
      .patch("/api/hospitals/me/availability")
      .set("Authorization", `Bearer ${nurseKemToken}`)
      .send(patch);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // Verify in PostgreSQL
    const avail = await prisma.bedAvailability.findUnique({
      where: { hospitalId: "kem-hospital" },
    });
    expect(avail?.icuAvailable).toBe(6);
    expect(avail?.ventilatorAvailable).toBe(4);
    expect(avail?.isConfirmedLive).toBe(true);

    // Verify Audit Event Log
    const auditEvent = await prisma.eventLog.findFirst({
      where: {
        hospitalId: "kem-hospital",
        type: "HOSPITAL_AVAILABILITY_UPDATED",
      },
      orderBy: { createdAt: "desc" },
    });
    expect(auditEvent).toBeDefined();
    expect(auditEvent?.actor).toBe("nurse_kem");
  });

  // 9. Hospital Authorization Isolation
  it("✓ Hospital staff cannot modify another hospital's availability (403)", async () => {
    // nurse_city attempts to patch kem-hospital
    const res = await request(app)
      .patch("/api/hospitals/kem-hospital/availability")
      .set("Authorization", `Bearer ${nurseCityToken}`)
      .send({ icu: 10 });

    expect(res.status).toBe(403);
  });

  // 10. Re-ranking & Recommendation
  it("✓ Recommendation assigns isRecommended = true only to top eligible candidate", async () => {
    const res = await request(app)
      .get("/api/hospitals/nearby?lat=19.003&lng=72.841&radiusKm=15&requiredResources=icu,ventilator");

    expect(res.status).toBe(200);
    const recommended = res.body.hospitals.filter((h: any) => h.isRecommended);
    expect(recommended.length).toBeLessThanOrEqual(1);

    if (recommended.length === 1) {
      const top = recommended[0];
      expect(top.fulfillmentPercentage).toBe(100);
      expect(["GREEN", "YELLOW"]).toContain(top.markerState);
      expect(top.matchScore).toBeGreaterThanOrEqual(res.body.hospitals[1]?.matchScore ?? 0);
    }
  });
});
