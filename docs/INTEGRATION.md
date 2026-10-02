# BedLink: Frontend - Backend Integration Specification

This document details how the existing frontend connects to the Express.js backend and real-time Socket.IO engine.

---

## 1. Architectural Overview

```
+-----------------------------------------------------------+
|               BedLink Frontend (React/TanStack)          |
|  - Dispatcher Console (/dispatch)                         |
|  - Hospital Nurse Console (/hospital)                     |
|  - Command Center Dashboard (/admin)                      |
|  - UI State Synchronization (Zustand: useSim, useAuth)    |
+-----------------------------------------------------------+
                     |                          ▲
            REST API |                          | Socket.IO
        HTTP Requests|                          | Real-Time Events
                     ▼                          |
+-----------------------------------------------------------+
|               BedLink Backend (Express.js)               |
|  - JWT Authentication Middleware                          |
|  - Hospital Master Data & Availability Engine             |
|  - Emergency Broadcast Service                            |
|  - Haversine + Scoring Matching Engine                    |
|  - Reservation Hold & 2-Minute Expiration Service         |
|  - Automatic Fallback State Machine                       |
|  - Audit Event Logger                                     |
+-----------------------------------------------------------+
                     |                          ▲
             Prisma  |                          | SQL
                     ▼                          |
+-----------------------------------------------------------+
|               PostgreSQL Database (bedlink)               |
+-----------------------------------------------------------+
```

---

## 2. API Communication Layer (`src/lib/api.ts`)

The frontend's API layer communicates directly with the Express backend using standard `fetch()` calls directed to `API_BASE` (defaulting to `http://localhost:5000` or `VITE_API_URL`):
- All authenticated endpoints attach the `Authorization: Bearer <token>` header obtained from `useAuth`.
- If an API returns `401 Unauthorized`, the frontend automatically clears the session and redirects to `/login`.
- Responses from the backend update the shared state in `useSim` so all existing components render live data immediately without requiring redesign or UI changes.

---

## 3. Real-Time Socket.IO Synchronization (`src/lib/socket.ts`)

The frontend initializes a persistent Socket.IO connection upon user sign-in:
1. **Connection Handshake**:
   - Sends the JWT token in `auth: { token }`.
   - The backend attaches the user's role and room memberships.
2. **Hospital Nurse Experience**:
   - Hospital client joins `hospital:<hospitalId>`.
   - When an ambulance broadcasts an emergency within range, the hospital receives `NEW_EMERGENCY`.
   - When an ambulance reserves a bed at this hospital, the hospital receives `RESERVATION_REQUEST` with a 2-minute countdown.
   - When the nurse clicks "Accept & Hold Bed", `POST /api/reservations/:id/accept` confirms the hold and broadcasts `BED_HELD` and `AVAILABILITY_UPDATED`.
3. **Ambulance / Dispatcher Experience**:
   - Dispatcher client joins `ambulance:<ambulanceId>`.
   - When hospital responses arrive, receives `HOSPITAL_RESPONSE_RECEIVED`.
   - When matching finishes, receives `MATCHING_COMPLETED`.
   - If a hospital declines or fails to respond within 2 minutes, the backend automatically transitions to `TIMEOUT`, selects the next ranked hospital, and emits `FALLBACK_TRIGGERED` to the ambulance.
4. **Command Center Experience**:
   - Command center joins `admin`.
   - Receives all network availability updates (`AVAILABILITY_UPDATED`), emergency requests, holds, and fallbacks in real-time.

---

## 4. Automatic Fallback Lifecycle Walkthrough

1. **Emergency Request**:
   - Ambulance creates emergency with GPS and needed resources (`icu`, `ventilator`, `cardiac`).
   - Backend scores hospitals:
     - Hospital A: 94% match
     - Hospital B: 87% match
     - Hospital C: 75% match
2. **First Reservation Request**:
   - Dispatcher selects Hospital A.
   - Hospital A receives `RESERVATION_REQUEST`.
   - 2-minute backend countdown starts (`expiresAt = now + 120s`).
3. **Decline or Expiration**:
   - *Scenario A (Explicit Decline)*: Hospital A declines with reason `ICU not free`.
   - *Scenario B (Timeout)*: Hospital A does not respond within 2 minutes (`expiresAt <= now`).
4. **Backend State Machine**:
   - Hospital A reservation is marked `REJECTED` or `TIMEOUT`.
   - Backend queries remaining hospitals excluding Hospital A.
   - Next best candidate is Hospital B (87%).
   - Backend automatically creates a new reservation for Hospital B.
   - Emits `FALLBACK_TRIGGERED` to ambulance.
   - Emits `RESERVATION_REQUEST` to Hospital B.
5. **Confirmation**:
   - Hospital B accepts.
   - Resources atomically held.
   - Ambulance receives `RESERVATION_ACCEPTED`.
