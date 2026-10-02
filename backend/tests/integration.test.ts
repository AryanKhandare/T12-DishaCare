import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/database";

describe("BedLink Full End-to-End Emergency & Fallback Integration Test", () => {
  let dispatcherToken: string;
  let nurseCityToken: string;
  let nurseMetroToken: string;

  beforeAll(async () => {
    // 1. Authenticate users
    const dLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: "dispatcher1", password: "demo123" });
    dispatcherToken = dLogin.body.access_token;

    const ncLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: "nurse_city", password: "demo123" });
    nurseCityToken = ncLogin.body.access_token;

    const nmLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: "nurse_metro", password: "demo123" });
    nurseMetroToken = nmLogin.body.access_token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("executes the full emergency workflow from creation through broadcast, rejection, fallback, and acceptance", async () => {
    // STEP 1: Ambulance / Dispatcher creates emergency
    const createRes = await request(app)
      .post("/api/emergency-requests")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send({
        type: "Cardiac",
        severity: "Critical",
        age: 62,
        gender: "Female",
        resources: ["icu", "ventilator", "cardiac"],
        location: {
          lat: 19.003,
          lng: 72.841,
          label: "Parel, Mumbai",
        },
      });

    expect(createRes.status).toBe(201);
    const emergencyId = createRes.body.id;
    expect(emergencyId).toBeDefined();
    expect(createRes.body.matches.length).toBeGreaterThan(0);

    const topHospital = createRes.body.matches[0];
    expect(topHospital.hospital_id).toBe("h-city");

    // STEP 2: Hospital submits broadcast capacity confirmation
    const capRes = await request(app)
      .post(`/api/emergency-requests/${emergencyId}/responses`)
      .set("Authorization", `Bearer ${nurseCityToken}`)
      .send({
        icu: true,
        ventilator: true,
        cardiac: true,
        oxygen: true,
        burns: false,
      });

    expect(capRes.status).toBe(200);
    expect(capRes.body.fulfillmentPercentage).toBe(100);

    // STEP 3: Ambulance selects Hospital A (City Hospital) for bed hold
    const rsvRes = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send({
        requestId: emergencyId,
        hospitalId: "h-city",
      });

    expect(rsvRes.status).toBe(201);
    const firstRsvId = rsvRes.body.id;
    expect(rsvRes.body.status).toBe("RESERVATION_REQUESTED");
    expect(rsvRes.body.attempt).toBe(1);

    // STEP 4: City Hospital declines due to sudden emergency diversion
    const rejectRes = await request(app)
      .post(`/api/reservations/${firstRsvId}/reject`)
      .set("Authorization", `Bearer ${nurseCityToken}`)
      .send({
        reasons: ["diversion"],
        note: "ED over capacity",
      });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.status).toBe("REJECTED");
    expect(rejectRes.body.fallback_initiated).toBe(true);

    const fallbackHospitalId = rejectRes.body.next_hospital_id;
    expect(fallbackHospitalId).toBeDefined();
    expect(fallbackHospitalId).not.toBe("h-city");

    // STEP 5: Verify Fallback reservation exists for Hospital B
    const rsvList = await prisma.reservation.findMany({
      where: { requestId: emergencyId },
      orderBy: { attempt: "desc" },
    });

    expect(rsvList.length).toBe(2);
    const secondRsv = rsvList[0];
    expect(secondRsv.attempt).toBe(2);
    expect(secondRsv.status).toBe("RESERVATION_REQUESTED");
    expect(secondRsv.hospitalId).toBe(fallbackHospitalId);

    // STEP 6: Hospital B accepts the bed hold request
    const acceptRes = await request(app)
      .post(`/api/reservations/${secondRsv.id}/accept`)
      .set("Authorization", `Bearer ${nurseMetroToken}`)
      .send();

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.status).toBe("HELD");
    expect(acceptRes.body.held).toHaveProperty("icu", 1);
    expect(acceptRes.body.held).toHaveProperty("ventilator", 1);

    // STEP 7: Ambulance arrives at Hospital B
    const arriveRes = await request(app)
      .post(`/api/reservations/${secondRsv.id}/arrived`)
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send();

    expect(arriveRes.status).toBe(200);
    expect(arriveRes.body.arrived_at).toBeDefined();

    // STEP 8: Inspect Complete Audit Event Log Timeline
    const eventsRes = await request(app)
      .get(`/api/events/${emergencyId}`)
      .set("Authorization", `Bearer ${dispatcherToken}`);

    expect(eventsRes.status).toBe(200);
    const eventTypes = eventsRes.body.map((e: any) => e.type);

    expect(eventTypes).toContain("REQUEST_CREATED");
    expect(eventTypes).toContain("MATCHES_RANKED");
    expect(eventTypes).toContain("EMERGENCY_BROADCAST");
    expect(eventTypes).toContain("HOSPITAL_RESPONSE_RECEIVED");
    expect(eventTypes).toContain("RESERVATION_REQUESTED");
    expect(eventTypes).toContain("REJECTED");
    expect(eventTypes).toContain("FALLBACK");
    expect(eventTypes).toContain("ACCEPTED");
    expect(eventTypes).toContain("HELD");
    expect(eventTypes).toContain("ARRIVED");
  });
});
