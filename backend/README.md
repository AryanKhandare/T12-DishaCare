# BedLink Backend

BedLink connects ambulances and nurses with hospitals during critical emergencies with real-time capacity broadcast, explainable scoring, 2-minute bed holds, and automatic fallback.

---

## 🛠 Technology Stack
- **Runtime**: Node.js v20+
- **Framework**: Express.js (Modular Monolith)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma ORM
- **Real-Time WebSockets**: Socket.IO
- **Authentication**: JWT + bcrypt
- **Validation**: Zod
- **Testing**: Jest + Supertest

---

## 📋 Prerequisites
- Node.js (v20+ recommended)
- PostgreSQL (v14+ running locally or remotely)
- npm or bun

---

## 🚀 Getting Started

### 1. Environment Configuration
Copy `.env.example` to `.env` inside `backend/`:
```bash
cp .env.example .env
```
Ensure your `DATABASE_URL` is set:
```env
DATABASE_URL="postgresql://postgres:Aryan@123@localhost:5432/bedlink?schema=public"
JWT_SECRET="bedlink_jwt_super_secret_hackathon_2026_key"
PORT=5000
CORS_ORIGINS="http://localhost:3000,http://localhost:5173,http://localhost:8080"
TEST_MODE="true"
RESERVATION_TIMEOUT_SECONDS=20
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Initialize Database Schema
Generate Prisma client and push database schema:
```bash
npx prisma generate
npx prisma db push
```

### 4. Seed Database
Seed demo hospitals, ambulances, bed capacities, and accounts:
```bash
npm run prisma:seed
```

### 5. Run Automated Tests
```bash
npm test
```
Runs 8 test suites (23 test cases) covering authentication, hospital availability, emergency broadcast, matching engine, reservation locks, 2-minute timeouts, automatic fallback, and concurrency conflict protection.

### 6. Start the Backend Server
Development mode with hot reload:
```bash
npm run dev
```
Production mode:
```bash
npm run build
npm start
```

---

## 🔑 Demo User Accounts

| Username | Password | Role | Description |
|---|---|---|---|
| `dispatcher1` | `demo123` | `dispatcher` | Ambulance A12 Dispatcher (Dadar TT Circle) |
| `nurse_city` | `demo123` | `hospital` | City Hospital Nurse (Parel) |
| `nurse_metro` | `demo123` | `hospital` | Metro Hospital Nurse (Mahim) |
| `admin` | `demo123` | `admin` | Command Center Network Administrator |

---

## ⏱ Test Mode vs Production Mode

To facilitate quick hackathon demonstrations without waiting 120 seconds:
- **Test Mode**:
  ```env
  TEST_MODE=true
  RESERVATION_TIMEOUT_SECONDS=20
  ```
- **Production Mode**:
  ```env
  TEST_MODE=false
  RESERVATION_TIMEOUT_SECONDS=120
  ```

---

## 📡 REST API Summary

- `POST /api/auth/login` - User sign-in
- `GET /api/auth/me` - Authenticated user profile
- `GET /api/hospitals` - List hospitals with resources & freshness
- `GET /api/hospitals/:id` - Single hospital details
- `GET /api/hospitals/:id/availability` - Hospital availability
- `PATCH /api/hospitals/:id/availability` - Update availability counters
- `POST /api/emergency-requests` - Create emergency & trigger broadcast
- `GET /api/emergency-requests/:id` - Get emergency request
- `GET /api/emergency-requests/:id/matches` - Get ranked hospital matches
- `POST /api/emergency-requests/:id/responses` - Hospital capacity confirmation
- `POST /api/emergency-requests/:id/cancel` - Cancel emergency
- `POST /api/reservations` - Create bed hold reservation
- `POST /api/reservations/:id/accept` - Hospital accepts & holds bed (atomic)
- `POST /api/reservations/:id/reject` - Hospital declines (triggers fallback)
- `POST /api/reservations/:id/expire` - 2-minute timeout (triggers fallback)
- `POST /api/reservations/:id/arrived` - Mark ambulance arrival
- `POST /api/reservations/:id/release` - Release bed hold
- `GET /api/admin/metrics` - Network KPIs & analytics
- `GET /api/admin/stale` - Hospitals with stale data (> 5 min)
- `GET /api/events/:requestId` - Audit log timeline for emergency
- `POST /api/ai/explain` - Explain match score (Groq decision support)

---

## ⚡ Socket.IO Real-Time Events

- `JOIN_HOSPITAL_ROOM`: Hospital client joins `hospital:<id>`
- `JOIN_AMBULANCE_ROOM`: Dispatcher client joins `ambulance:<id>`
- `NEW_EMERGENCY`: Broadcast to eligible hospital rooms
- `MATCHING_COMPLETED`: Ranked candidates sent to ambulance
- `HOSPITAL_RESPONSE_RECEIVED`: Hospital confirms capacity
- `RESERVATION_REQUEST`: Hospital receives incoming 2-minute hold request
- `RESERVATION_ACCEPTED`: Ambulance receives confirmation; bed held
- `RESERVATION_REJECTED`: Ambulance notified; triggers fallback
- `RESERVATION_EXPIRED`: 2-minute timeout; triggers fallback
- `FALLBACK_TRIGGERED`: Ambulance notified of next candidate hospital
- `AVAILABILITY_UPDATED`: Network-wide bed capacity update
- `BED_HELD` / `BED_RELEASED`: Hold status updates
