import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/database";

describe("Reservation, Hold & Expiration API", () => {
  let dispatcherToken: string;
  let nurseToken: string;
  let emergencyId: string;

  beforeAll(async () => {
    const dispLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: "dispatcher1", password: "demo123" });
    dispatcherToken = dispLogin.body.access_token;

    const nurseLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: "nurse_city", password: "demo123" });
    nurseToken = nurseLogin.body.access_token;

    // Create an emergency request for reservations
    const emRes = await request(app)
      .post("/api/emergency-requests")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send({
        type: "Cardiac",
        severity: "Critical",
        resources: ["icu", "ventilator"],
        location: { lat: 19.0178, lng: 72.8478, label: "Dadar" },
      });
    emergencyId = emRes.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should create a reservation for a selected hospital", async () => {
    const res = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send({
        requestId: emergencyId,
        hospitalId: "h-city",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.status).toBe("RESERVATION_REQUESTED");
    expect(res.body.hospital_id).toBe("h-city");
    expect(res.body.expires_at).toBeGreaterThan(Date.now());
  });

  it("should accept reservation and atomically hold bed capacity", async () => {
    // Get live reservation
    const rsvRes = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send({
        requestId: emergencyId,
        hospitalId: "h-city",
      });
    const rsvId = rsvRes.body.id;

    // Check availability before accept
    const availBefore = await request(app).get("/api/hospitals/h-city/availability");
    const icuBefore = availBefore.body.resources.icu.available;

    // Accept
    const acceptRes = await request(app)
      .post(`/api/reservations/${rsvId}/accept`)
      .set("Authorization", `Bearer ${nurseToken}`)
      .send();

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.status).toBe("HELD");
    expect(acceptRes.body.held).toHaveProperty("icu", 1);

    // Verify bed capacity was decremented
    const availAfter = await request(app).get("/api/hospitals/h-city/availability");
    expect(availAfter.body.resources.icu.available).toBe(icuBefore - 1);
  });
});
