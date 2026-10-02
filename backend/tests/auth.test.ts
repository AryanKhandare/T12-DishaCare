import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { app } from "../src/app";
import { prisma } from "../src/config/database";
import { env } from "../src/config/env";
import { OtpService } from "../src/services/otp.service";

describe("Authentication & Authorization API", () => {
  const timestamp = Date.now();
  const inactiveHospitalId = `h-inactive-${timestamp}`;
  const inactiveUserId = `u-inactive-${timestamp}`;

  let dispatcherToken: string;
  let nurseToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // 1. Create an inactive hospital for inactive hospital validation tests
    await prisma.hospital.create({
      data: {
        id: inactiveHospitalId,
        name: "Inactive Test Hospital",
        area: "Test Area",
        lat: 19.076,
        lng: 72.8777,
        active: false,
        loadPct: 0,
        specialties: ["General"],
        heartbeat: false,
      },
    });

    // 2. Create an inactive user for inactive login test
    const dummyHash = await bcrypt.hash("Password123", 10);
    await prisma.user.create({
      data: {
        id: inactiveUserId,
        name: "Inactive Account",
        username: `inactive_${timestamp}`,
        email: `inactive_${timestamp}@example.com`,
        phone: `+9199999${String(timestamp).slice(-5)}`,
        passwordHash: dummyHash,
        role: "dispatcher",
        isActive: false,
      },
    });

    // 3. Obtain tokens for role tests
    const dispRes = await request(app)
      .post("/api/auth/login")
      .send({ username: "dispatcher1", password: "demo123" });
    dispatcherToken = dispRes.body.access_token;

    const nurseRes = await request(app)
      .post("/api/auth/login")
      .send({ username: "nurse_city", password: "demo123" });
    nurseToken = nurseRes.body.access_token;

    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD });
    adminToken = adminRes.body.access_token;
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: String(timestamp),
        },
      },
    });

    await prisma.otpVerification.deleteMany({
      where: {
        phone: {
          contains: String(timestamp).slice(-6),
        },
      },
    });

    await prisma.hospital.deleteMany({
      where: { id: inactiveHospitalId },
    });

    await prisma.$disconnect();
  });

  // ==========================================
  // SMS OTP TESTS
  // ==========================================
  describe("SMS OTP System", () => {
    const otpTestPhone = `+9191000${String(timestamp).slice(-5)}`;
    let latestDevOtp: string;

    it("✓ OTP generation and safe response", async () => {
      const res = await request(app)
        .post("/api/auth/send-otp")
        .send({ phone: otpTestPhone });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("success", true);
      expect(res.body.message).toMatch(/verification code sent/i);
      expect(res.body).toHaveProperty("expiresAt");
      // Must not expose raw OTP unless in dev mode
      if (res.body.devOtp) {
        latestDevOtp = res.body.devOtp;
        expect(latestDevOtp).toMatch(/^\d{6}$/);
      }
    });

    it("✓ OTP hashing in PostgreSQL", async () => {
      const record = await prisma.otpVerification.findFirst({
        where: { phone: otpTestPhone },
        orderBy: { createdAt: "desc" },
      });

      expect(record).toBeDefined();
      expect(record!.otpHash).toBeDefined();
      // Verify bcrypt hash format ($2a$ or $2b$)
      expect(record!.otpHash).toMatch(/^\$2[ab]\$\d+\$/);
      if (latestDevOtp) {
        expect(record!.otpHash).not.toBe(latestDevOtp);
      }
    });

    it("✓ Resend restriction / cooldown (429)", async () => {
      const res = await request(app)
        .post("/api/auth/send-otp")
        .send({ phone: otpTestPhone });

      expect(res.status).toBe(429);
      expect(res.body.message).toMatch(/wait \d+s/i);
    });

    it("✓ Invalid OTP rejected", async () => {
      const res = await request(app)
        .post("/api/auth/verify-otp")
        .send({ phone: otpTestPhone, otp: "000000" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid verification code/i);
    });

    it("✓ Valid OTP verification", async () => {
      // Find the raw OTP by checking devOtp or verifying against hash
      let testOtp = latestDevOtp;
      if (!testOtp) {
        // If devOtp was not in response, test with known OTP
        const freshPhone = `+9192000${String(timestamp).slice(-5)}`;
        const otpRaw = "654321";
        const otpHash = await bcrypt.hash(otpRaw, 10);
        await prisma.otpVerification.create({
          data: {
            phone: freshPhone,
            otpHash,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            attempts: 0,
            verified: false,
          },
        });

        const res = await request(app)
          .post("/api/auth/verify-otp")
          .send({ phone: freshPhone, otp: otpRaw });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        return;
      }

      const res = await request(app)
        .post("/api/auth/verify-otp")
        .send({ phone: otpTestPhone, otp: testOtp });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/verified successfully/i);
    });

    it("✓ OTP reuse prevention", async () => {
      // Trying to verify the same already-verified OTP should fail
      const res = await request(app)
        .post("/api/auth/verify-otp")
        .send({ phone: otpTestPhone, otp: latestDevOtp || "654321" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/no active verification code/i);
    });

    it("✓ Expired OTP rejected", async () => {
      const expiredPhone = `+9193000${String(timestamp).slice(-5)}`;
      const hash = await bcrypt.hash("112233", 10);
      await prisma.otpVerification.create({
        data: {
          phone: expiredPhone,
          otpHash: hash,
          expiresAt: new Date(Date.now() - 10000), // expired 10s ago
          attempts: 0,
          verified: false,
        },
      });

      const res = await request(app)
        .post("/api/auth/verify-otp")
        .send({ phone: expiredPhone, otp: "112233" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/expired/i);
    });

    it("✓ Max attempts exceeded (limit enforcement)", async () => {
      const attemptsPhone = `+9194000${String(timestamp).slice(-5)}`;
      const hash = await bcrypt.hash("998877", 10);
      await prisma.otpVerification.create({
        data: {
          phone: attemptsPhone,
          otpHash: hash,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: env.OTP_MAX_ATTEMPTS, // already at max attempts
          verified: false,
        },
      });

      const res = await request(app)
        .post("/api/auth/verify-otp")
        .send({ phone: attemptsPhone, otp: "998877" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/maximum.*attempts exceeded/i);
    });
  });

  // ==========================================
  // SIGNUP TESTS
  // ==========================================
  describe("Signup", () => {
    const dispPhone = `+9195000${String(timestamp).slice(-5)}`;
    const nursePhone = `+9196000${String(timestamp).slice(-5)}`;

    beforeAll(async () => {
      // Pre-verify phones for signup tests
      const hash = await bcrypt.hash("123456", 10);
      await prisma.otpVerification.createMany({
        data: [
          {
            phone: dispPhone,
            otpHash: hash,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            attempts: 0,
            verified: true,
            verifiedAt: new Date(),
          },
          {
            phone: nursePhone,
            otpHash: hash,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            attempts: 0,
            verified: true,
            verifiedAt: new Date(),
          },
        ],
      });
    });

    it("✓ Dispatcher signup", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          name: "Rahul Sharma",
          email: `disp_${timestamp}@example.com`,
          phone: dispPhone,
          password: "SecurePass123",
          confirmPassword: "SecurePass123",
          role: "DISPATCHER",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("access_token");
      expect(res.body.user).toHaveProperty("name", "Rahul Sharma");
      expect(res.body.user).toHaveProperty("email", `disp_${timestamp}@example.com`);
      expect(res.body.user).toHaveProperty("phone", dispPhone);
      expect(res.body.user).toHaveProperty("role", "dispatcher");
      expect(res.body.user.hospital_id).toBeNull();
      // Verify no password_hash exposed
      expect(res.body.user).not.toHaveProperty("password_hash");
      expect(res.body.user).not.toHaveProperty("passwordHash");
      expect(res.body.user).not.toHaveProperty("password");

      // Verify cookie is set
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/token=/);
    });

    it("✓ Hospital nurse signup", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          name: "Priya Shah",
          email: `nurse_${timestamp}@example.com`,
          phone: nursePhone,
          password: "SecurePass123",
          confirmPassword: "SecurePass123",
          role: "HOSPITAL_NURSE",
          hospital_id: "h-city",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("access_token");
      expect(res.body.user).toHaveProperty("name", "Priya Shah");
      expect(res.body.user).toHaveProperty("email", `nurse_${timestamp}@example.com`);
      expect(res.body.user).toHaveProperty("role", "hospital");
      expect(res.body.user.hospital_id).toBe("h-city");
      expect(res.body.user).not.toHaveProperty("password_hash");
      expect(res.body.user).not.toHaveProperty("passwordHash");
    });

    it("✓ Duplicate email rejected", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          name: "Duplicate User",
          email: `disp_${timestamp}@example.com`,
          password: "SecurePass123",
          confirmPassword: "SecurePass123",
          role: "DISPATCHER",
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it("✓ Duplicate phone rejected", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          name: "Duplicate Phone User",
          email: `different_${timestamp}@example.com`,
          phone: dispPhone,
          password: "SecurePass123",
          confirmPassword: "SecurePass123",
          role: "DISPATCHER",
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/phone number already exists/i);
    });

    it("✓ Invalid email rejected", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          name: "Invalid Email User",
          email: "not-an-email",
          password: "SecurePass123",
          role: "DISPATCHER",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/valid email|invalid email/i);
    });

    it("✓ Invalid phone rejected", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          name: "Bad Phone User",
          email: `badphone_${timestamp}@example.com`,
          phone: "123",
          password: "SecurePass123",
          role: "DISPATCHER",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/valid phone/i);
    });

    it("✓ Weak password rejected", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          name: "Weak Pass User",
          email: `weak_${timestamp}@example.com`,
          password: "weak",
          role: "DISPATCHER",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/at least 8 characters/i);
    });

    it("✓ Password mismatch rejected", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          name: "Mismatch User",
          email: `mismatch_${timestamp}@example.com`,
          password: "SecurePass123",
          confirmPassword: "DifferentPass456",
          role: "DISPATCHER",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/do not match/i);
    });

    it("✓ Nurse without hospital rejected", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          name: "No Hosp Nurse",
          email: `nohosp_${timestamp}@example.com`,
          password: "SecurePass123",
          role: "HOSPITAL_NURSE",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/valid active hospital is required/i);
    });

    it("✓ Invalid hospital rejected", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          name: "Invalid Hosp Nurse",
          email: `invhosp_${timestamp}@example.com`,
          password: "SecurePass123",
          role: "HOSPITAL_NURSE",
          hospital_id: "non-existent-hospital-xyz",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/valid active hospital is required/i);
    });

    it("✓ Inactive hospital rejected", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          name: "Inactive Hosp Nurse",
          email: `inacthosp_${timestamp}@example.com`,
          password: "SecurePass123",
          role: "HOSPITAL_NURSE",
          hospital_id: inactiveHospitalId,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/valid active hospital is required/i);
    });

    it("✓ Public ADMIN signup rejected", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({
          name: "Fake Admin",
          email: `fakeadmin_${timestamp}@example.com`,
          password: "SecurePass123",
          role: "ADMIN",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/ADMIN role is not permitted/i);
    });
  });

  // ==========================================
  // DATABASE PERSISTENCE TESTS
  // ==========================================
  describe("Database Persistence Verification", () => {
    it("✓ User record correctly created in PostgreSQL with hospitalId and phone", async () => {
      const user = await prisma.user.findFirst({
        where: { email: `nurse_${timestamp}@example.com` },
      });

      expect(user).toBeDefined();
      expect(user!.name).toBe("Priya Shah");
      expect(user!.hospitalId).toBe("h-city");
      expect(user!.role).toBe("hospital");
      expect(user!.phone).toBeDefined();
      expect(user!.phoneVerified).toBe(true);
      expect(user!.passwordHash).toMatch(/^\$2[ab]\$\d+\$/);
      expect(user!.passwordHash).not.toBe("SecurePass123");
    });
  });

  // ==========================================
  // LOGIN TESTS
  // ==========================================
  describe("Login", () => {
    it("✓ Correct credentials with email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: `disp_${timestamp}@example.com`,
          password: "SecurePass123",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("access_token");
      expect(res.body.user).toHaveProperty("email", `disp_${timestamp}@example.com`);
      expect(res.body.user).not.toHaveProperty("password_hash");
      expect(res.body.user).not.toHaveProperty("passwordHash");
    });

    it("✓ Correct credentials with phone", async () => {
      const nursePhone = `+9196000${String(timestamp).slice(-5)}`;
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          phone: nursePhone,
          password: "SecurePass123",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("access_token");
      expect(res.body.user).toHaveProperty("hospital_id", "h-city");
    });

    it("✓ Wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: `disp_${timestamp}@example.com`,
          password: "WrongPassword999",
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty("code", "INVALID_CREDENTIALS");
    });

    it("✓ Unknown email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "unknown_user_9999@example.com",
          password: "SecurePass123",
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty("code", "INVALID_CREDENTIALS");
    });

    it("✓ Inactive user rejected", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: `inactive_${timestamp}@example.com`,
          password: "Password123",
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/account is inactive/i);
    });
  });

  // ==========================================
  // JWT TESTS
  // ==========================================
  describe("JWT Verification & Protection", () => {
    it("✓ Valid token returns user profile", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${dispatcherToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("username", "dispatcher1");
      expect(res.body.role).toBe("dispatcher");
      expect(res.body).not.toHaveProperty("password_hash");
      expect(res.body).not.toHaveProperty("passwordHash");
    });

    it("✓ Missing token rejected (401)", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty("code", "UNAUTHORIZED");
    });

    it("✓ Invalid token rejected (401)", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer this.is.an.invalid.token");

      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty("code", "INVALID_TOKEN");
    });

    it("✓ Expired token rejected (401)", async () => {
      const expiredToken = jwt.sign(
        { userId: "u-1", username: "dispatcher1", role: "dispatcher" },
        env.JWT_SECRET,
        { expiresIn: -10 } // Expired 10 seconds ago
      );

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toHaveProperty("code", "TOKEN_EXPIRED");
    });
  });

  // ==========================================
  // AUTHORIZATION TESTS
  // ==========================================
  describe("Role-Based Authorization", () => {
    it("✓ Dispatcher access to emergency endpoints", async () => {
      const res = await request(app)
        .get("/api/emergencies")
        .set("Authorization", `Bearer ${dispatcherToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("✓ Hospital nurse access to own hospital availability", async () => {
      const res = await request(app)
        .patch("/api/hospitals/h-city/availability")
        .set("Authorization", `Bearer ${nurseToken}`)
        .send({ icu: 4 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("ok", true);
    });

    it("✓ Admin access to protected admin metrics", async () => {
      const res = await request(app)
        .get("/api/admin/metrics")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it("✓ Nurse cannot modify another hospital (403)", async () => {
      // Nurse for h-city attempts to modify h-metro
      const res = await request(app)
        .patch("/api/hospitals/h-metro/availability")
        .set("Authorization", `Bearer ${nurseToken}`)
        .send({ icu: 10 });

      expect(res.status).toBe(403);
      expect(res.body.error).toHaveProperty("code", "FORBIDDEN");
    });

    it("✓ Dispatcher cannot access admin APIs (403)", async () => {
      const res = await request(app)
        .get("/api/admin/metrics")
        .set("Authorization", `Bearer ${dispatcherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toHaveProperty("code", "FORBIDDEN");
    });

    it("✓ Nurse cannot access admin APIs (403)", async () => {
      const res = await request(app)
        .get("/api/admin/metrics")
        .set("Authorization", `Bearer ${nurseToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toHaveProperty("code", "FORBIDDEN");
    });
  });

  // ==========================================
  // LOGOUT TEST
  // ==========================================
  describe("Logout", () => {
    it("✓ Clears authentication cookie on logout", async () => {
      const res = await request(app).post("/api/auth/logout");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("ok", true);
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/token=;/);
    });
  });
});
