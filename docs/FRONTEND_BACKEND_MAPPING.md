# BedLink: Frontend to Backend Mapping Specification

This document maps all existing frontend screens, components, user actions, API calls, and real-time Socket.IO events to the Express.js backend.

---

## 1. Authentication (`/login`)
- **Screen**: `src/routes/login.tsx`
- **User Actions**:
  - Select Role (`dispatcher`, `hospital`, `admin`)
  - Enter username / email and password
  - Click "Sign in"
- **API Endpoint**: `POST /api/auth/login`
- **Authentication**: Public (no token required)
- **Request Body**:
  ```json
  {
    "username": "dispatcher1", // or email
    "password": "demo123"
  }
  ```
- **Response Body (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "user": {
      "id": "u-1",
      "name": "Rohan Mehta",
      "username": "dispatcher1",
      "email": "dispatcher1@bedlink.org",
      "role": "dispatcher",
      "hospital_id": null,
      "ambulance_id": "A12"
    }
  }
  ```
- **Socket.IO Event**:
  - Client connects to Socket.IO server passing `auth.token`.
  - Joins personal and role-based rooms (e.g. `ambulance:A12`, `dispatcher:u-1`).

---

## 2. Dispatcher / Ambulance Console (`/dispatch`)

### 2.1 Hospital Discovery & Network View
- **Screen**: `src/routes/dispatch.tsx`, `src/components/bedlink/LazyMap.tsx`
- **Trigger**: Initial page load / periodic refresh
- **API Endpoint**: `GET /api/hospitals`
- **Authentication**: Bearer JWT (role: `dispatcher`, `hospital`, or `admin`)
- **Response Body**:
  ```json
  [
    {
      "id": "h-city",
      "name": "City Hospital",
      "area": "Parel",
      "lat": 19.003,
      "lng": 72.841,
      "active": true,
      "load_pct": 17,
      "specialties": ["cardiology", "trauma", "general", "pulmonology"],
      "resources": {
        "icu": { "available": 3, "total": 12 },
        "ventilator": { "available": 3, "total": 8 },
        "cardiac": { "available": 1, "total": 1 },
        "oxygen": { "available": 10, "total": 20 },
        "burns": { "available": 0, "total": 1 }
      },
      "updated_at": 1775199200000,
      "heartbeat": true
    }
  ]
  ```

### 2.2 Create Emergency & Trigger Broadcast
- **Screen**: `src/routes/dispatch.tsx` -> `src/components/bedlink/RequestForm.tsx`
- **User Actions**:
  - Fill Patient details (Emergency Type, Severity, Age, Gender)
  - Select required resources (`icu`, `ventilator`, `cardiac`, `oxygen`, `burns`)
  - Set Ambulance GPS location (`lat`, `lng`, `label`)
  - Click "Broadcast Emergency Request"
- **API Endpoint**: `POST /api/emergency-requests`
- **Authentication**: Bearer JWT (`dispatcher` / `nurse`)
- **Request Body**:
  ```json
  {
    "type": "Cardiac",
    "severity": "Critical",
    "age": 58,
    "gender": "Male",
    "resources": ["icu", "ventilator", "cardiac"],
    "location": {
      "lat": 19.0178,
      "lng": 72.8478,
      "label": "Dadar TT Circle, Mumbai"
    }
  }
  ```
- **Response Body (201 Created)**:
  ```json
  {
    "id": "REQ-1001",
    "ambulance_id": "A12",
    "type": "Cardiac",
    "severity": "Critical",
    "age": 58,
    "gender": "Male",
    "resources": ["icu", "ventilator", "cardiac"],
    "location": {
      "lat": 19.0178,
      "lng": 72.8478,
      "label": "Dadar TT Circle, Mumbai"
    },
    "created_at": 1775199300000,
    "status": "matching",
    "reservation_ids": [],
    "matches": [
      {
        "hospital_id": "h-city",
        "rank": 1,
        "total_score": 0.94,
        "components": {
          "resource": 1.0,
          "eta": 0.95,
          "freshness": 1.0,
          "load": 0.83,
          "distance": 0.92
        },
        "eta_min": 6.2,
        "distance_km": 2.1,
        "stale": false,
        "reasons": ["ALL_RESOURCES", "SPECIALTY_MATCH", "FASTEST_ETA", "FRESH_DATA", "LOW_LOAD"]
      }
    ]
  }
  ```
- **Socket.IO Event Emitted by Server**:
  - `NEW_EMERGENCY` broadcast to eligible hospital rooms: `hospital:h-city`, `hospital:h-metro`, etc.
  - `MATCHING_COMPLETED` sent to `ambulance:A12` with ranked candidates.

### 2.3 Hospital Response Received (Real-time Broadcast Response)
- **API Endpoint**: `POST /api/emergency-requests/:id/responses` (submitted by hospital staff)
- **Socket.IO Event Received by Dispatcher**:
  - Event: `HOSPITAL_RESPONSE_RECEIVED`
  ```json
  {
    "emergencyId": "REQ-1001",
    "hospitalId": "h-city",
    "hospitalName": "City Hospital",
    "requirementsFulfilled": 3,
    "requirementsTotal": 3,
    "fulfillmentPercentage": 100,
    "matchScore": 0.94
  }
  ```

### 2.4 Bed Reservation Request
- **Screen**: `src/routes/dispatch.tsx` -> `src/components/bedlink/HospitalCard.tsx`
- **User Action**: Click "Hold Bed (2:00)" on a ranked hospital card
- **API Endpoint**: `POST /api/reservations`
- **Authentication**: Bearer JWT (`dispatcher`)
- **Request Body**:
  ```json
  {
    "requestId": "REQ-1001",
    "hospitalId": "h-city"
  }
  ```
- **Response Body (201 Created)**:
  ```json
  {
    "id": "RSV-501",
    "request_id": "REQ-1001",
    "hospital_id": "h-city",
    "status": "RESERVATION_REQUESTED",
    "created_at": 1775199320000,
    "starts_at": 1775199320000,
    "expires_at": 1775199440000,
    "score": 0.94,
    "attempt": 1,
    "held": {}
  }
  ```
- **Socket.IO Event Emitted by Server**:
  - `RESERVATION_REQUEST` emitted to `hospital:h-city`.
  - `RESERVATION_PENDING` emitted to `ambulance:A12`.

### 2.5 Dispatcher Emergency Cancellation
- **Screen**: `src/routes/dispatch.tsx`
- **User Action**: Click "Cancel Request"
- **API Endpoint**: `POST /api/emergency-requests/:id/cancel`
- **Response Body**:
  ```json
  { "ok": true, "status": "cancelled" }
  ```
- **Socket.IO Event**:
  - `RESERVATION_CANCELLED` emitted to `hospital:h-city`.

---

## 3. Hospital Console (`/hospital`)

### 3.1 Fetch and Patch Resource Availability
- **Screen**: `src/routes/hospital.tsx`
- **User Action**: Adjust counters for ICU, Ventilator, Oxygen, or toggles for Cardiac, Burns.
- **API Endpoints**:
  - `GET /api/hospitals/:id/availability`
  - `PATCH /api/hospitals/:id/availability`
- **Request Body (PATCH)**:
  ```json
  {
    "icu": 4,
    "ventilator": 2,
    "cardiac": 1,
    "oxygen": 8,
    "burns": 0
  }
  ```
- **Response Body (PATCH)**:
  ```json
  {
    "ok": true,
    "updated_at": 1775199350000,
    "hospital": { "id": "h-city", "resources": { ... } }
  }
  ```
- **Socket.IO Event Emitted**:
  - `AVAILABILITY_UPDATED` broadcast to all connected clients / admin dashboard.

### 3.2 Respond to Broadcast Emergency (Pre-reservation)
- **Screen**: `src/routes/hospital.tsx`
- **User Action**: Hospital nurse checks available capacities and clicks "Confirm Availability"
- **API Endpoint**: `POST /api/emergency-requests/:id/responses`
- **Request Body**:
  ```json
  {
    "icu": true,
    "ventilator": true,
    "cardiac": true,
    "oxygen": true,
    "burns": false
  }
  ```
- **Response Body**:
  ```json
  {
    "emergencyId": "REQ-1001",
    "hospitalId": "h-city",
    "fulfillmentPercentage": 100,
    "status": "ACCEPTED"
  }
  ```

### 3.3 Accept Reservation Request
- **Screen**: `src/routes/hospital.tsx` -> Incoming Reservation Banner
- **User Action**: Click "Accept & Hold Bed" within 2-minute window
- **API Endpoint**: `POST /api/reservations/:id/accept`
- **Authentication**: Bearer JWT (`hospital` staff)
- **Response Body**:
  ```json
  {
    "id": "RSV-501",
    "status": "HELD",
    "resolved_at": 1775199360000,
    "held": { "icu": 1, "ventilator": 1, "oxygen": 1 },
    "responded_at": 1775199360000,
    "responded_by": "nurse_city"
  }
  ```
- **Socket.IO Event Emitted**:
  - `RESERVATION_ACCEPTED` to `ambulance:A12`.
  - `BED_HELD` to hospital and admin rooms.

### 3.4 Reject Reservation Request (Triggering Fallback)
- **Screen**: `src/routes/hospital.tsx` -> Decline Sheet Modal
- **User Action**: Select reason (`no_beds`, `icu`, `diversion`, etc.), optional note, click "Confirm Decline"
- **API Endpoint**: `POST /api/reservations/:id/reject`
- **Authentication**: Bearer JWT (`hospital` staff)
- **Request Body**:
  ```json
  {
    "reasons": ["icu"],
    "note": "All ICU beds occupied by code blue"
  }
  ```
- **Response Body**:
  ```json
  {
    "id": "RSV-501",
    "status": "REJECTED",
    "fallback_initiated": true,
    "next_hospital_id": "h-metro"
  }
  ```
- **Socket.IO Event Emitted**:
  - `RESERVATION_REJECTED` to `ambulance:A12`.
  - `FALLBACK_TRIGGERED` to `ambulance:A12`.
  - `RESERVATION_REQUEST` to `hospital:h-metro`.

### 3.5 Reservation Timeout (2 Minutes)
- **Trigger**: Backend scheduler checks `expires_at <= now`
- **Internal Action**: Marks reservation as `TIMEOUT`, triggers automatic fallback to next ranked hospital.
- **Socket.IO Event Emitted**:
  - `RESERVATION_EXPIRED` to `ambulance:A12` and previous hospital.
  - `FALLBACK_TRIGGERED` to `ambulance:A12`.
  - `RESERVATION_REQUEST` to next candidate hospital (`hospital:h-metro`).

### 3.6 Ambulance Arrival / Release Bed
- **Screen**: `src/routes/hospital.tsx` -> Active Holds Table
- **User Actions**:
  - "Mark Arrived": Converts temporary hold to admitted patient.
    - `POST /api/reservations/:id/arrived`
  - "Release Hold": Cancels hold, restores bed count back to available.
    - `POST /api/reservations/:id/release` `{ "reason": "Patient diverted" }`

---

## 4. Admin Command Center (`/admin/*`)

### 4.1 Live Network Metrics
- **Screen**: `src/routes/admin.index.tsx`
- **API Endpoint**: `GET /api/admin/metrics`
- **Authentication**: Bearer JWT (`admin`)
- **Response Body**:
  ```json
  {
    "active_emergencies": 1,
    "available_icu": 38,
    "pending_reservations": 1,
    "stale_listings": 2,
    "requests_today": 5,
    "successful_reservations": 4,
    "fallbacks": 1,
    "avg_response_sec": 34,
    "avg_decision_sec": 28,
    "resolved": 4,
    "decline_reasons": {
      "icu": 2,
      "diversion": 1
    }
  }
  ```

### 4.2 Stale Hospitals Alert
- **Screen**: `src/routes/admin.hospitals.tsx`
- **API Endpoint**: `GET /api/admin/stale`
- **Response Body**: Array of hospitals with `updated_at` older than 5 minutes.

### 4.3 Request Event Timeline
- **Screen**: `src/components/bedlink/TimelineDrawer.tsx`
- **API Endpoint**: `GET /api/events/:requestId`
- **Response Body**:
  ```json
  [
    {
      "id": "ev-1",
      "ts": 1775199300000,
      "request_id": "REQ-1001",
      "actor": "dispatcher1",
      "type": "REQUEST_CREATED",
      "message": "Cardiac request created (Critical)",
      "meta": { "ambulance": "A12" }
    },
    {
      "id": "ev-2",
      "ts": 1775199302000,
      "request_id": "REQ-1001",
      "actor": "matching-engine",
      "type": "MATCHES_RANKED",
      "message": "12 eligible hospitals ranked",
      "meta": { "top": "City Hospital" }
    }
  ]
  ```

---

## Summary Table

| Frontend Component / Action | HTTP Method | Endpoint | Socket.IO Event |
|---|---|---|---|
| User Login | `POST` | `/api/auth/login` | - |
| Fetch Hospitals | `GET` | `/api/hospitals` | - |
| Update Availability | `PATCH` | `/api/hospitals/:id/availability` | `AVAILABILITY_UPDATED` |
| Create Emergency | `POST` | `/api/emergency-requests` | `NEW_EMERGENCY`, `MATCHING_COMPLETED` |
| Hospital Response | `POST` | `/api/emergency-requests/:id/responses` | `HOSPITAL_RESPONSE_RECEIVED` |
| Request Bed Hold | `POST` | `/api/reservations` | `RESERVATION_REQUEST`, `RESERVATION_PENDING` |
| Accept Bed Hold | `POST` | `/api/reservations/:id/accept` | `RESERVATION_ACCEPTED`, `BED_HELD` |
| Decline Bed Hold | `POST` | `/api/reservations/:id/reject` | `RESERVATION_REJECTED`, `FALLBACK_TRIGGERED` |
| Auto Fallback on 2m Timeout | *Backend timer* | `/api/reservations/:id/expire` | `RESERVATION_EXPIRED`, `FALLBACK_TRIGGERED` |
| Mark Arrived | `POST` | `/api/reservations/:id/arrived` | `ARRIVED` |
| Release Bed Hold | `POST` | `/api/reservations/:id/release` | `RELEASED` |
| Cancel Emergency | `POST` | `/api/emergency-requests/:id/cancel` | `CANCELLED` |
| Network Metrics | `GET` | `/api/admin/metrics` | - |
| Event Timeline Feed | `GET` | `/api/events/:requestId` | - |
