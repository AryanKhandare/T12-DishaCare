import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/database";

describe("Emergency Request Lifecycle API", () => {
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

  it("should create an emergency request and return ranked hospital candidates", async () => {
    const payload = {
      type: "Cardiac",
      severity: "Critical",
      age: 58,
      gender: "Male",
      resources: ["icu", "ventilator", "cardiac"],
      location: {
        lat: 19.0178,
        lng: 72.8478,
        label: "Dadar TT Circle, Mumbai",
      },
    };

    const res = await request(app)
      .post("/api/emergency-requests")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("matches");
    expect(Array.isArray(res.body.matches)).toBe(true);
    expect(res.body.matches.length).toBeGreaterThan(0);
    expect(res.body.status).toBe("matching");
  });

  it("should reject emergency request with invalid coordinates", async () => {
    const payload = {
      type: "Cardiac",
      severity: "Critical",
      resources: ["icu"],
      location: {
        lat: 199.0, // invalid lat
        lng: 72.8478,
        label: "Invalid",
      },
    };

    const res = await request(app)
      .post("/api/emergency-requests")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty("code", "VALIDATION_ERROR");
  });

  it("should record hospital broadcast capacity response", async () => {
    // Create emergency first
    const createRes = await request(app)
      .post("/api/emergency-requests")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send({
        type: "Cardiac",
        severity: "Critical",
        resources: ["icu", "ventilator"],
        location: { lat: 19.0178, lng: 72.8478, label: "Dadar" },
      });

    const emergencyId = createRes.body.id;

    const resp = await request(app)
      .post(`/api/emergency-requests/${emergencyId}/responses`)
      .set("Authorization", `Bearer ${nurseToken}`)
      .send({
        icu: true,
        ventilator: true,
      });

    expect(resp.status).toBe(200);
    expect(resp.body).toHaveProperty("fulfillmentPercentage", 100);
    expect(resp.body).toHaveProperty("status", "RECORDED");
  });
});
