import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/database";

describe("Reservation Decline & Automatic Fallback API", () => {
  let dispatcherToken: string;
  let nurseToken: string;

  beforeAll(async () => {
    const dispLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: "dispatcher1", password: "demo123" });
    dispatcherToken = dispLogin.body.access_token;

    const nurseLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: "nurse_city", password: "demo123" });
    nurseToken = nurseLogin.body.access_token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should reject reservation and automatically initiate fallback to next hospital", async () => {
    // 1. Create emergency
    const emRes = await request(app)
      .post("/api/emergency-requests")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send({
        type: "Cardiac",
        severity: "Critical",
        resources: ["icu", "ventilator", "cardiac"],
        location: { lat: 19.0178, lng: 72.8478, label: "Dadar" },
      });
    const emergencyId = emRes.body.id;

    // 2. Select Hospital A (h-city)
    const rsvRes = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send({ requestId: emergencyId, hospitalId: "h-city" });
    const reservationId = rsvRes.body.id;

    // 3. Hospital A rejects
    const rejectRes = await request(app)
      .post(`/api/reservations/${reservationId}/reject`)
      .set("Authorization", `Bearer ${nurseToken}`)
      .send({
        reasons: ["icu", "diversion"],
        note: "Surge in walk-in critical patients",
      });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.status).toBe("REJECTED");
    expect(rejectRes.body.fallback_initiated).toBe(true);
    expect(rejectRes.body.next_hospital_id).toBeDefined();
    expect(rejectRes.body.next_hospital_id).not.toBe("h-city");

    // 4. Verify new reservation exists for next hospital
    const allRsvs = await prisma.reservation.findMany({
      where: { requestId: emergencyId },
      orderBy: { attempt: "desc" },
    });
    expect(allRsvs.length).toBe(2);
    expect(allRsvs[0].status).toBe("RESERVATION_REQUESTED");
    expect(allRsvs[0].attempt).toBe(2);
  });

  it("should trigger fallback when reservation expires", async () => {
    // 1. Create emergency
    const emRes = await request(app)
      .post("/api/emergency-requests")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send({
        type: "Trauma",
        severity: "Serious",
        resources: ["icu"],
        location: { lat: 19.0178, lng: 72.8478, label: "Dadar" },
      });
    const emergencyId = emRes.body.id;

    // 2. Create reservation
    const rsvRes = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send({ requestId: emergencyId, hospitalId: "h-city" });
    const reservationId = rsvRes.body.id;

    // 3. Trigger manual expiration
    const expireRes = await request(app)
      .post(`/api/reservations/${reservationId}/expire`)
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send();

    expect(expireRes.status).toBe(200);
    expect(expireRes.body.status).toBe("TIMEOUT");
    expect(expireRes.body.fallback_initiated).toBe(true);
  });
});
