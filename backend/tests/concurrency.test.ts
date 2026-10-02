import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/database";

describe("Reservation Concurrency & Resource Contention", () => {
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

  it("prevents double-booking: when last bed is consumed, concurrent accept receives 409 Conflict", async () => {
    // Set hospital h-kurla to have exactly 1 ICU bed available
    await prisma.bedAvailability.update({
      where: { hospitalId: "h-kurla" },
      data: { icuAvailable: 1 },
    });

    // Create Emergency 1
    const em1 = await request(app)
      .post("/api/emergency-requests")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send({
        type: "Trauma",
        severity: "Critical",
        resources: ["icu"],
        location: { lat: 19.071, lng: 72.879, label: "Kurla" },
      });

    // Create Emergency 2
    const em2 = await request(app)
      .post("/api/emergency-requests")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send({
        type: "Trauma",
        severity: "Critical",
        resources: ["icu"],
        location: { lat: 19.071, lng: 72.879, label: "Kurla" },
      });

    // Create Reservation for Emergency 1 at h-kurla
    const rsv1 = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send({ requestId: em1.body.id, hospitalId: "h-kurla" });

    // Create Reservation for Emergency 2 at h-kurla
    const rsv2 = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send({ requestId: em2.body.id, hospitalId: "h-kurla" });

    // Fire both accept calls simultaneously
    const [res1, res2] = await Promise.all([
      request(app)
        .post(`/api/reservations/${rsv1.body.id}/accept`)
        .set("Authorization", `Bearer ${nurseToken}`)
        .send(),
      request(app)
        .post(`/api/reservations/${rsv2.body.id}/accept`)
        .set("Authorization", `Bearer ${nurseToken}`)
        .send(),
    ]);

    const statuses = [res1.status, res2.status].sort();
    // One must succeed (200), and the second must receive 409 Conflict
    expect(statuses).toEqual([200, 409]);

    const conflictRes = res1.status === 409 ? res1 : res2;
    expect(conflictRes.body.error).toHaveProperty("code", "RESOURCE_NO_LONGER_AVAILABLE");
  });
});
