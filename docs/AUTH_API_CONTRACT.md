# BedLink Authentication, SMS OTP & Authorization API Contract

This document provides the formal contract for the BedLink Authentication, SMS OTP Verification, and Role-Based Authorization system across the Express.js API, PostgreSQL database (Prisma ORM), and Next.js / TanStack frontend client.

---

## 1. Overview & Architecture

BedLink enforces centralized authentication, multi-factor phone verification via SMS OTP, and role-based access control (RBAC):

- **SMS OTP Verification:** Users provide a mobile phone number during signup. A cryptographically secure 6-digit OTP is generated, hashed with bcrypt, and stored in PostgreSQL (`OtpVerification` model). The raw OTP is dispatched via the configured `SmsService` provider abstraction and is never stored in plaintext.
- **JWT Tokens:** Generated upon successful signup or login using `jsonwebtoken`. Signed with `JWT_SECRET` and configurable expiry (`JWT_EXPIRES_IN`, default `24h`). Payload includes `sub` (user ID), `role`, `hospitalId`, and `ambulanceId`.
- **Storage:** Stored in secure `httpOnly` cookies (`token`) with `sameSite: "lax"`, and also returned in the response body (`access_token`) for authorization headers (`Authorization: Bearer <token>`).
- **Password Security:** Passwords hashed with `bcryptjs` (salt rounds: 10). Plaintext passwords and `password_hash` are never returned by the API or stored in client-side state.
- **Roles:**
  - `DISPATCHER` (Ambulance dispatch & routing)
  - `HOSPITAL_NURSE` (Ward nurse / hospital availability management)
  - `ADMIN` (Command center oversight & metrics)
- **Role Isolation:**
  - Public registration only permits `DISPATCHER` and `HOSPITAL_NURSE`.
  - `ADMIN` public registration is strictly forbidden and rejected with `400 Bad Request`.
  - Hospital nurses must select a verified active hospital (`is_active: true`) at registration.
  - Hospital nurses may only update availability for their assigned hospital (`req.user.hospitalId === hospitalId`), returning `403 Forbidden` if attempting to modify another hospital.

---

## 2. Hospital Nurse Create Account Flow

```text
HOSPITAL NURSE
      │
      ▼
Select Hospital (loaded from GET /api/hospitals, active only)
      │
      ▼
Enter Name, Email, Phone (+91...), Password
      │
      ▼
POST /api/auth/send-otp
      │
      ▼
Receive 6-digit SMS OTP
      │
      ▼
POST /api/auth/verify-otp (or inline with signup)
      │
      ▼
POST /api/auth/signup
      │
      ▼
Verify OTP + Validate Active Hospital + Bcrypt Password Hash
      │
      ▼
User created in PostgreSQL (User.hospitalId = selected hospital ID, phoneVerified = true)
      │
      ▼
Issue JWT (includes sub, role="hospital", hospitalId="h-xxx")
      │
      ▼
Set HTTP-only secure cookie + return access_token
      │
      ▼
GET /api/auth/me confirms authenticated nurse session
      │
      ▼
Nurse dashboard active (only permitted to manage assigned hospital availability)
```

---

## 3. API Endpoints

### 3.1 POST /api/auth/send-otp

Generates a secure 6-digit OTP, hashes it with bcrypt, persists it in PostgreSQL, and dispatches it via the SMS provider.

- **Method:** `POST`
- **URL:** `/api/auth/send-otp`
- **Authentication:** Public
- **Rate Limit:** 1 request per 60 seconds per phone number (cooldown).

#### Request Body
```json
{
  "phone": "+919876543210"
}
```

#### Successful Response (`200 OK`)
```json
{
  "success": true,
  "message": "Verification code sent to +91******3210",
  "phone": "+919876543210",
  "expiresAt": "2026-10-02T08:35:00.000Z"
}
```
*(In development mode with `OTP_DEV_MODE=true` and non-production `NODE_ENV`, response includes `"devOtp": "123456"` for local automated testing).*

#### Possible Errors
- **`400 Bad Request`** — Phone number missing or invalid format.
- **`429 Too Many Requests`** — Cooldown in effect (requested within 60 seconds).
- **`500 Internal Server Error`** — SMS delivery gateway failure.

---

### 3.2 POST /api/auth/verify-otp

Validates a submitted 6-digit OTP against the stored bcrypt hash in PostgreSQL. Checks expiry, limits failed attempts, and prevents replay attacks.

- **Method:** `POST`
- **URL:** `/api/auth/verify-otp`
- **Authentication:** Public

#### Request Body
```json
{
  "phone": "+919876543210",
  "otp": "503604"
}
```

#### Successful Response (`200 OK`)
```json
{
  "success": true,
  "message": "Phone number verified successfully",
  "phone": "+919876543210"
}
```

#### Possible Errors
- **`400 Bad Request`**
  - No active OTP found for this phone number.
  - OTP has expired (exceeded `OTP_EXPIRY_MINUTES`).
  - Maximum verification attempts exceeded (`OTP_MAX_ATTEMPTS`).
  - Invalid OTP code (returns remaining attempts).

---

### 3.3 POST /api/auth/signup

Registers a new user account as either a Dispatcher or Hospital Nurse. Verifies that the phone number was verified via OTP, checks active hospital status, hashes password, saves record to PostgreSQL, and issues JWT.

- **Method:** `POST`
- **URL:** `/api/auth/signup`
- **Authentication:** Public

#### Request Body Schema

##### For Hospital Nurse:
```json
{
  "name": "Sister Mary Fernandes",
  "email": "mary@hospital.org",
  "phone": "+919876543210",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123",
  "role": "HOSPITAL_NURSE",
  "hospitalId": "h-city",
  "otp": "503604"
}
```

##### For Dispatcher:
```json
{
  "name": "Rahul Sharma",
  "email": "rahul@bedlink.org",
  "phone": "+919800000012",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123",
  "role": "DISPATCHER"
}
```

#### Successful Response (`201 Created`)
Sets `Set-Cookie: token=<jwt>; HttpOnly; SameSite=Lax; Path=/`

```json
{
  "message": "Account created successfully",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "cmuqpczub002kuwa46aoiydqt",
    "name": "Sister Mary Fernandes",
    "username": "mary",
    "email": "mary@hospital.org",
    "phone": "+919876543210",
    "phone_verified": true,
    "role": "hospital",
    "hospital_id": "h-city",
    "hospitalId": "h-city",
    "ambulance_id": null
  }
}
```

#### Possible Errors
- **`400 Bad Request`**
  - Missing required fields.
  - Weak password (min 8 chars, 1 uppercase, 1 lowercase, 1 number).
  - Password mismatch.
  - Phone number not verified with OTP.
  - Nurse account missing hospital or hospital is inactive.
  - Public registration attempted with `role: "ADMIN"`.
- **`409 Conflict`**
  - An account with this email already exists.
  - An account with this phone number already exists.

---

### 3.4 POST /api/auth/login

Authenticates an existing user via email, phone, or username along with password.

- **Method:** `POST`
- **URL:** `/api/auth/login`
- **Authentication:** Public

#### Request Body Schema
```json
{
  "phone": "+919876543210",
  "password": "SecurePass123"
}
```
*(Also supports `"email": "mary@hospital.org"` or `"username": "nurse_city"`)*

#### Successful Response (`200 OK`)
Sets `Set-Cookie: token=<jwt>; HttpOnly; SameSite=Lax; Path=/`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "u-2",
    "name": "Priya Nair",
    "username": "nurse_city",
    "email": "nurse.city@bedlink.org",
    "phone": "+919800000002",
    "role": "hospital",
    "hospital_id": "h-city",
    "ambulance_id": null
  }
}
```

---

### 3.5 POST /api/auth/logout

Clears the authentication HTTP-only cookie.

- **Method:** `POST`
- **URL:** `/api/auth/logout`

#### Successful Response (`200 OK`)
Sets `Set-Cookie: token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`

```json
{
  "ok": true,
  "message": "Logged out successfully"
}
```

---

### 3.6 GET /api/auth/me

Retrieves the authenticated user's profile from the database based on the active JWT.

- **Method:** `GET`
- **URL:** `/api/auth/me`
- **Authentication:** Bearer token or HTTP-only cookie

#### Successful Response (`200 OK`)
```json
{
  "id": "u-2",
  "name": "Priya Nair",
  "username": "nurse_city",
  "email": "nurse.city@bedlink.org",
  "phone": "+919800000002",
  "phone_verified": true,
  "role": "hospital",
  "hospital_id": "h-city",
  "ambulance_id": null
}
```

---

## 4. Role Authorization Matrix

| Endpoint | Dispatcher | Hospital Nurse | Admin | Notes |
|---|---|---|---|---|
| `POST /api/auth/send-otp` | Allowed | Allowed | Allowed | SMS OTP request with rate limiting |
| `POST /api/auth/verify-otp` | Allowed | Allowed | Allowed | Verifies 6-digit OTP |
| `POST /api/auth/signup` | Allowed | Allowed | Blocked | Admin cannot register publicly |
| `POST /api/auth/login` | Allowed | Allowed | Allowed | Authenticates email, phone, or username |
| `POST /api/auth/logout` | Allowed | Allowed | Allowed | Clears session cookie |
| `GET /api/auth/me` | Allowed | Allowed | Allowed | Requires valid JWT |
| `GET /api/hospitals` | Allowed | Allowed | Allowed | Lists active hospitals for registration and dispatch |
| `PATCH /api/hospitals/:id/availability` | Blocked (403) | Own Hospital Only | Allowed | Nurse cannot update other hospital |
| `GET /api/admin/*` | Blocked (403) | Blocked (403) | Allowed | Protected command center metrics |

---

## 5. Required Environment Variables

```env
DATABASE_URL="postgresql://postgres:Aryan@123@localhost:5432/bedlink?schema=public"
JWT_SECRET="bedlink_jwt_super_secret_hackathon_2026_key"
JWT_EXPIRES_IN="24h"
PORT=5000
CORS_ORIGINS="http://localhost:3000,http://localhost:5173,http://localhost:8080,http://localhost:8081"
TEST_MODE="true"
RESERVATION_TIMEOUT_SECONDS=20
ADMIN_EMAIL="admin@bedlink.com"
ADMIN_PASSWORD="change-this-password"
SMS_PROVIDER="console"
SMS_API_KEY=""
SMS_SENDER_ID="BEDLNK"
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=5
OTP_DEV_MODE="true"
```
