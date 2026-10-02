import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/config/database";

describe("Hospital & Availability API", () => {
  let nurseToken: string;
  let dispatcherToken: string;

  beforeAll(async () => {
    const nurseLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: "nurse_city", password: "demo123" });
    nurseToken = nurseLogin.body.access_token;

    const dispLogin = await request(app)
      .post("/api/auth/login")
      .send({ username: "dispatcher1", password: "demo123" });
    dispatcherToken = dispLogin.body.access_token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should list all hospitals with their resources and freshness", async () => {
    const res = await request(app).get("/api/hospitals");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(10);

    const cityHosp = res.body.find((h: any) => h.id === "h-city");
    expect(cityHosp).toBeDefined();
    expect(cityHosp.resources).toHaveProperty("icu");
    expect(cityHosp.resources.icu).toHaveProperty("available");
    expect(cityHosp.resources.icu).toHaveProperty("total");
  });

  it("should get single hospital details", async () => {
    const res = await request(app).get("/api/hospitals/h-city");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", "h-city");
    expect(res.body).toHaveProperty("name", "City Hospital");
  });

  it("should get hospital availability", async () => {
    const res = await request(app).get("/api/hospitals/h-city/availability");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", "h-city");
    expect(res.body).toHaveProperty("resources");
  });

  it("should allow hospital staff to update their own hospital availability", async () => {
    const patch = { icu: 5, ventilator: 3 };
    const res = await request(app)
      .patch("/api/hospitals/h-city/availability")
      .set("Authorization", `Bearer ${nurseToken}`)
      .send(patch);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ok", true);
    expect(res.body.hospital.resources.icu.available).toBe(5);
  });

  it("should forbid hospital staff from updating another hospital's availability", async () => {
    const patch = { icu: 10 };
    const res = await request(app)
      .patch("/api/hospitals/h-metro/availability")
      .set("Authorization", `Bearer ${nurseToken}`)
      .send(patch);

    expect(res.status).toBe(403);
    expect(res.body.error).toHaveProperty("code", "FORBIDDEN");
  });
});
