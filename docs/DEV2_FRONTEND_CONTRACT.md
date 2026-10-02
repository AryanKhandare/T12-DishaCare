# BEDLINK — FRONTEND TO BACKEND DEV 2 CONTRACT
**Real-Time Matching, Reservation, Fallback & Orchestration Engine**

---

## 1. Overview & Architecture

BedLink coordinates emergency dispatches between ambulances and hospitals. Backend Developer 2 handles:
1. Deterministic Multi-Factor Ranking & Matching
2. Haversine Distance & Configurable ETA
3. Hospital Capacity Confirmation
4. 2-Minute Server-Authoritative Reservation Windows
5. Atomic Bed & Resource Holds with Concurrency Guards
6. Automated Fallback Cascades upon Rejection or Timeout
7. Real-Time WebSockets (`ws` and Socket.IO compatible) & Sync Reconnection
8. Groq AI Natural Language Match Explanations (with deterministic fallback)

---

## 2. Authentication & Authorization

All API endpoints expect JWT in the `Authorization` header:
```http
Authorization: Bearer <jwt_access_token>
```

| User Role | Permitted Actions |
|---|---|
| `DISPATCHER` | Create emergency, rank matches, select hospital for reservation, arrive at hospital |
| `HOSPITAL` / `HOSPITAL_NURSE` | Update availability, submit broadcast response, accept/reject reservation (strictly scoped to `req.user.hospitalId`) |
| `ADMIN` | Read all events, override emergency states, system diagnostics |

---

## 3. REST API Specifications

### 3.1 Matching & Ranking

#### `POST /api/emergency-requests/:id/rank`
Forces re-computation and returns ranked hospitals within `MATCHING_RADIUS_KM` (default: 15 km).

- **Method**: `POST`
- **Auth**: Required (`DISPATCHER` or `ADMIN`)
- **Response `200 OK`**:
```json
{
  "emergencyId": "REQ-1024",
  "matches": [
    {
      "hospitalId": "h-city",
      "hospitalName": "City Care Hospital",
      "distanceKm": 4.8,
      "etaMinutes": 7.2,
      "fulfillmentPercentage": 100,
      "isFullyEligible": true,
      "resourceScore": 100,
      "etaScore": 82,
      "freshnessScore": 91,
      "loadScore": 76,
      "distanceScore": 68,
      "finalScore": 87.65,
      "dataAgeMinutes": 2.4,
      "currentLoad": 24,
      "breakdown": {
        "distance": 68,
        "eta": 82,
        "resource": 100,
        "freshness": 91,
        "load": 76
      }
    }
  ]
}
```

#### `GET /api/emergency-requests/:id/matches`
Retrieves currently computed matches for an emergency.

- **Method**: `GET`
- **Response `200 OK`**: Same structure as `POST .../rank`.

---

### 3.2 Hospital Capacity Response

#### `POST /api/emergency-requests/:id/responses`
Submitted by hospital nurse when `NEW_EMERGENCY` broadcast arrives.

- **Method**: `POST`
- **Auth**: Required (`HOSPITAL` role)
- **Body**:
```json
{
  "icuAvailable": true,
  "ventilatorAvailable": true,
  "cardiacAvailable": true,
  "oxygenAvailable": true,
  "burnsAvailable": false,
  "notes": "ICU bed prepped in Ward B"
}
```
- **Response `200 OK`**:
```json
{
  "hospitalId": "h-city",
  "fulfillmentPercentage": 100,
  "isFullyEligible": true,
  "fulfilledCount": 4,
  "totalRequired": 4
}
```

#### `GET /api/emergency-requests/:id/responses`
Retrieves all hospital responses submitted for an emergency request.

---

### 3.3 Reservations & Bed Holds

#### `POST /api/reservations`
Initiates a reservation hold request for the selected hospital.

- **Method**: `POST`
- **Auth**: Required (`DISPATCHER`)
- **Body**:
```json
{
  "requestId": "REQ-1024",
  "hospitalId": "h-city"
}
```
- **Response `201 Created`**:
```json
{
  "id": "RSV-5001",
  "emergencyId": "REQ-1024",
  "hospitalId": "h-city",
  "status": "PENDING",
  "requestedAt": "2026-10-02T10:45:00.000Z",
  "expiresAt": "2026-10-02T10:47:00.000Z",
  "timeoutSeconds": 120,
  "attempt": 1
}
```

#### `GET /api/reservations/:id`
Retrieves current reservation details, status, timestamps, and held resources.

#### `POST /api/reservations/:id/accept`
Hospital nurse confirms and holds the bed atomically.

- **Method**: `POST`
- **Auth**: Required (`HOSPITAL` nurse matching `resv.hospitalId`)
- **Response `200 OK`**:
```json
{
  "id": "RSV-5001",
  "status": "ACCEPTED",
  "confirmedAt": "2026-10-02T10:45:30.000Z",
  "heldResources": {
    "icu": 1,
    "ventilator": 1,
    "cardiac": 1
  }
}
```
- **Error `409 Conflict`**:
```json
{
  "message": "ICU bed is no longer available at this hospital.",
  "error": { "code": "RESOURCE_NO_LONGER_AVAILABLE" }
}
```

#### `POST /api/reservations/:id/reject`
Hospital nurse declines the reservation, immediately triggering automatic fallback.

- **Method**: `POST`
- **Auth**: Required (`HOSPITAL` nurse matching `resv.hospitalId`)
- **Body**:
```json
{
  "reasons": ["ED over capacity", "Staffing diversion"],
  "note": "Surge in walk-ins"
}
```
- **Response `200 OK`**:
```json
{
  "id": "RSV-5001",
  "status": "REJECTED",
  "fallbackTriggered": true,
  "nextHospitalId": "h-metro",
  "nextReservationId": "RSV-5002"
}
```

#### `POST /api/reservations/:id/expire`
Called by periodic background worker or manual trigger when `now() >= expiresAt`.

#### `POST /api/reservations/:id/release`
Releases held beds back into general hospital availability upon cancellation or transfer.

---

### 3.4 AI Natural Language Match Explanation

#### `GET /api/emergency-requests/:id/explanation/:hospitalId`
Returns concise human-readable operational reasoning explaining why this hospital was ranked with its score.

- **Method**: `GET`
- **Response `200 OK`**:
```json
{
  "hospitalId": "h-city",
  "hospitalName": "City Care Hospital",
  "finalScore": 87.65,
  "explanation": "City Care Hospital satisfies 100% of requested critical resources (ICU, Ventilator, Cardiac) with an estimated 7.2-minute transit time (4.8 km). Freshness is optimal (reported 2.4 minutes ago) and current bed occupancy load is moderate at 24%.",
  "engine": "groq-llama-3.3-70b-versatile"
}
```
*(Note: If `GROQ_API_KEY` is not provided or fails, this returns a deterministic rule-based operational explanation seamlessly).*

---

### 3.5 Hospital Portal (`/me` Scoped Endpoints)

All hospital operations derive hospital identity strictly from `req.user.hospitalId` (extracted securely from the authenticated JWT token). Hospital nurses never need to provide or guess their hospital ID in request parameters.

#### `GET /api/hospitals/me`
Retrieves hospital metadata, contact information, and current live resource counts for the authenticated nurse's hospital.
- **Method**: `GET`
- **Auth**: Required (`HOSPITAL` or `HOSPITAL_NURSE`)
- **Response `200 OK`**:
```json
{
  "id": "h-city",
  "name": "City Hospital",
  "area": "Parel",
  "address": "Dr E Borges Rd, Parel, Mumbai",
  "phone": "+91 22 2410 7000",
  "hospital_type": "Multispeciality",
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
  "updated_at": 1727870400000,
  "heartbeat": true
}
```

#### `PATCH /api/hospitals/me/availability`
Updates availability for the authenticated nurse's hospital. Updates are persisted immediately in PostgreSQL `bed_availability` table and broadcast in real-time over Socket.IO to all connected dispatchers and dashboards.
- **Method**: `PATCH`
- **Auth**: Required (`HOSPITAL` or `HOSPITAL_NURSE`)
- **Body**:
```json
{
  "icu": 5,
  "ventilator": 4,
  "cardiac": 1,
  "oxygen": 12,
  "burns": 0
}
```
- **Response `200 OK`**:
```json
{
  "ok": true,
  "updated_at": 1727870425000,
  "hospital": { ... }
}
```

#### `GET /api/hospitals/me/emergencies`
Retrieves emergency requests that were broadcast to or reserved at this hospital.
- **Method**: `GET`
- **Auth**: Required (`HOSPITAL` or `HOSPITAL_NURSE`)
- **Response `200 OK`**: Array of emergency objects with broadcast capacity responses.

#### `GET /api/hospitals/me/reservations`
Returns reservations linked to this hospital, filterable by query parameter `?status=pending` or `?status=held`.
- **Method**: `GET`
- **Auth**: Required (`HOSPITAL` or `HOSPITAL_NURSE`)

#### `GET /api/hospitals/me/events`
Returns recent activity and audit logs for this hospital.
- **Method**: `GET`
- **Auth**: Required (`HOSPITAL` or `HOSPITAL_NURSE`)

---

### 3.6 Admin Management Endpoints

Accessible strictly by users with `ADMIN` role (`req.user.role === 'admin'`).

| Endpoint | Method | Description |
|---|---|---|
| `GET /api/admin/users` | `GET` | Lists all registered accounts from PostgreSQL |
| `POST /api/admin/users` | `POST` | Onboards new dispatcher, hospital nurse, or admin user |
| `PATCH /api/admin/users/:userId/active` | `PATCH` | Activates or deactivates a user account |
| `POST /api/admin/hospitals` | `POST` | Registers a new hospital and initializes bed availability |
| `PATCH /api/admin/hospitals/:hospitalId` | `PATCH` | Updates hospital metadata or coordinates |
| `PATCH /api/admin/hospitals/:hospitalId/activate` | `PATCH` | Toggles hospital active/maintenance status |
| `GET /api/admin/metrics` | `GET` | Returns aggregated system telemetry and operational stats |

---

## 4. Real-Time WebSocket Events & Contracts

Clients connect via `/ws/hospital/:hospitalId` or `/ws/ambulance/:ambulanceId` (or via standard Socket.IO).

### Inbound Events (Client -> Server)
- `SYNC_REQUEST`:
```json
{ "type": "SYNC_REQUEST", "emergencyId": "REQ-1024" }
```

### Outbound Events (Server -> Client)

| Event Name | Recipient | Payload Highlights |
|---|---|---|
| `NEW_EMERGENCY` | Hospital Staff | `emergencyId`, `severity`, `resources`, `distanceKm` |
| `MATCHING_UPDATE` | Dispatcher | `emergencyId`, `matches: [...]` |
| `RESERVATION_REQUEST` | Hospital Nurse | `reservationId`, `emergencyId`, `expiresAt`, `requirements` |
| `RESERVATION_ACCEPTED` | Dispatcher & Hospital | `reservationId`, `status: "ACCEPTED"`, `heldResources` |
| `RESERVATION_REJECTED` | Dispatcher | `reservationId`, `hospitalId`, `reason` |
| `RESERVATION_EXPIRED` | Dispatcher & Hospital | `reservationId`, `hospitalId`, `reason: "TIMEOUT"` |
| `FALLBACK_TRIGGERED` | Dispatcher | `emergencyId`, `previousHospitalId`, `nextHospitalId`, `reason` |
| `NEXT_HOSPITAL_SELECTED` | Dispatcher | `emergencyId`, `nextHospitalId`, `reservationId` |
| `BED_HELD` | Dispatcher | `emergencyId`, `hospitalId`, `held` |
| `NO_HOSPITAL_AVAILABLE` | Dispatcher | `emergencyId`, `message: "No eligible hospital is currently available."` |
| `SYNC_RESPONSE` | Reconnecting Client | Current state, active reservation, countdown remaining |

---

## 5. UI Screen Mapping

1. **Ambulance / Emergency Creation**: Triggers `POST /api/emergency-requests`, receives ranked list.
2. **Matching View**: Renders live `MatchCard` with `finalScore`, `fulfillmentPercentage`, `etaMinutes`, `distanceKm`, and `dataAgeMinutes`. Listens for `MATCHING_UPDATE`.
3. **Hospital Nurse Dashboard**: Displays incoming banner on `NEW_EMERGENCY` and modal on `RESERVATION_REQUEST`.
4. **Reservation & Countdown Modal**: Visual timer counts down against `expiresAt`. If hospital accepts, changes to Confirmed (`BED_HELD`). If timeout or reject, automatically switches to next hospital via `FALLBACK_TRIGGERED`.
5. **No Hospital Screen**: Renders fallback guidance if `NO_HOSPITAL_AVAILABLE` event fires.
