# BedLink: REST API Contract Specification

This document details the complete REST API contract between the BedLink Express.js backend and client applications.

---

## Standard Error Response Format

All error responses strictly follow this unified envelope:
```json
{
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Human readable error description",
    "details": {}
  }
}
```

### Common HTTP Status Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Validation failure or malformed payload (`VALIDATION_ERROR`).
- `401 Unauthorized`: Missing or invalid Bearer JWT (`UNAUTHORIZED`).
- `403 Forbidden`: Role not authorized for this resource (`FORBIDDEN`).
- `404 Not Found`: Resource not found (`NOT_FOUND`).
- `409 Conflict`: Concurrency conflict or resource already taken (`RESOURCE_NO_LONGER_AVAILABLE`).
- `422 Unprocessable Entity`: Business logic constraint violation (`UNPROCESSABLE_ENTITY`).
- `500 Internal Server Error`: Unhandled server error (`INTERNAL_SERVER_ERROR`).

---

## 1. Authentication APIs

### 1.1 User Login
- **Method**: `POST`
- **Path**: `/api/auth/login`
- **Auth**: None (Public)
- **Request Body**:
  ```json
  {
    "username": "dispatcher1", // accepts username or email
    "password": "demo123"
  }
  ```
- **Response `200 OK`**:
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
- **Error `401 Unauthorized`**:
  ```json
  {
    "error": {
      "code": "INVALID_CREDENTIALS",
      "message": "Invalid username or password"
    }
  }
  ```

### 1.2 Get Current User Profile
- **Method**: `GET`
- **Path**: `/api/auth/me`
- **Auth**: Bearer JWT
- **Response `200 OK`**:
  ```json
  {
    "id": "u-1",
    "name": "Rohan Mehta",
    "username": "dispatcher1",
    "role": "dispatcher",
    "hospital_id": null,
    "ambulance_id": "A12"
  }
  ```

---

## 2. Hospital Master Data & Availability APIs

### 2.1 List All Hospitals
- **Method**: `GET`
- **Path**: `/api/hospitals`
- **Auth**: Bearer JWT (Optional in demo mode)
- **Response `200 OK`**:
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

### 2.2 Get Single Hospital
- **Method**: `GET`
- **Path**: `/api/hospitals/:id`
- **Auth**: Bearer JWT
- **Response `200 OK`**:
  ```json
  {
    "id": "h-city",
    "name": "City Hospital",
    "area": "Parel",
    "lat": 19.003,
    "lng": 72.841,
    "active": true,
    "load_pct": 17,
    "specialties": ["cardiology", "trauma", "general", "pulmonology"],
    "resources": { ... },
    "updated_at": 1775199200000,
    "heartbeat": true
  }
  ```

### 2.3 Get Hospital Availability
- **Method**: `GET`
- **Path**: `/api/hospitals/:id/availability`
- **Auth**: Bearer JWT
- **Response `200 OK`**:
  ```json
  {
    "id": "h-city",
    "resources": {
      "icu": { "available": 3, "total": 12 },
      "ventilator": { "available": 3, "total": 8 },
      "cardiac": { "available": 1, "total": 1 },
      "oxygen": { "available": 10, "total": 20 },
      "burns": { "available": 0, "total": 1 }
    },
    "updated_at": 1775199200000
  }
  ```

### 2.4 Update Hospital Availability (Patch)
- **Method**: `PATCH`
- **Path**: `/api/hospitals/:id/availability`
- **Auth**: Bearer JWT (`hospital` staff belonging to hospital `:id`, or `admin`)
- **Request Body**:
  ```json
  {
    "icu": 4,
    "ventilator": 2,
    "cardiac": 1,
    "oxygen": 8,
    "burns": 0
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "ok": true,
    "updated_at": 1775199350000,
    "hospital": {
      "id": "h-city",
      "resources": { ... }
    }
  }
  ```
- **Error `403 Forbidden`**:
  ```json
  {
    "error": {
      "code": "FORBIDDEN",
      "message": "Staff members can only update their own hospital availability"
    }
  }
  ```

---

## 3. Emergency Requests APIs

### 3.1 Create Emergency Request & Broadcast
- **Method**: `POST`
- **Path**: `/api/emergency-requests`
- **Auth**: Bearer JWT (`dispatcher` / `nurse`)
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
- **Response `201 Created`**:
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

### 3.2 Get Ranked Matches for Emergency
- **Method**: `GET`
- **Path**: `/api/emergency-requests/:id/matches`
- **Auth**: Bearer JWT
- **Response `200 OK`**: Array of `MatchResult` objects ordered by rank.

### 3.3 Hospital Broadcast Response (Capacity Confirmation)
- **Method**: `POST`
- **Path**: `/api/emergency-requests/:id/responses`
- **Auth**: Bearer JWT (`hospital` staff)
- **Request Body**:
  ```json
  {
    "icu": true,
    "ventilator": true,
    "oxygen": true,
    "cardiac": false
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "emergencyId": "REQ-1001",
    "hospitalId": "h-city",
    "requirementsFulfilled": 3,
    "requirementsTotal": 4,
    "fulfillmentPercentage": 75,
    "status": "RECORDED"
  }
  ```

### 3.4 Cancel Emergency Request
- **Method**: `POST`
- **Path**: `/api/emergency-requests/:id/cancel`
- **Auth**: Bearer JWT (`dispatcher` / `admin`)
- **Response `200 OK`**:
  ```json
  {
    "ok": true,
    "status": "cancelled"
  }
  ```

---

## 4. Reservation APIs

### 4.1 Create Reservation (Hold Request)
- **Method**: `POST`
- **Path**: `/api/reservations`
- **Auth**: Bearer JWT (`dispatcher`)
- **Request Body**:
  ```json
  {
    "requestId": "REQ-1001",
    "hospitalId": "h-city"
  }
  ```
- **Response `201 Created`**:
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

### 4.2 Accept Reservation
- **Method**: `POST`
- **Path**: `/api/reservations/:id/accept`
- **Auth**: Bearer JWT (`hospital` staff or `admin`)
- **Response `200 OK`**:
  ```json
  {
    "id": "RSV-501",
    "status": "HELD",
    "resolved_at": 1775199350000,
    "held": {
      "icu": 1,
      "ventilator": 1
    },
    "responded_at": 1775199350000,
    "responded_by": "nurse_city"
  }
  ```
- **Error `409 Conflict`**:
  ```json
  {
    "error": {
      "code": "RESOURCE_NO_LONGER_AVAILABLE",
      "message": "The requested hospital resource is no longer available."
    }
  }
  ```

### 4.3 Reject Reservation (Initiates Fallback)
- **Method**: `POST`
- **Path**: `/api/reservations/:id/reject`
- **Auth**: Bearer JWT (`hospital` staff)
- **Request Body**:
  ```json
  {
    "reasons": ["icu"],
    "note": "Surge of walk-ins"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "id": "RSV-501",
    "status": "REJECTED",
    "fallback_initiated": true,
    "next_hospital_id": "h-metro"
  }
  ```

### 4.4 Mark Arrived (Bed Conversion)
- **Method**: `POST`
- **Path**: `/api/reservations/:id/arrived`
- **Auth**: Bearer JWT
- **Response `200 OK`**:
  ```json
  {
    "id": "RSV-501",
    "status": "HELD",
    "arrived_at": 1775199700000
  }
  ```

### 4.5 Release Bed Hold
- **Method**: `POST`
- **Path**: `/api/reservations/:id/release`
- **Auth**: Bearer JWT
- **Request Body**:
  ```json
  {
    "reason": "Ambulance rerouted"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "id": "RSV-501",
    "status": "RELEASED",
    "release_reason": "Ambulance rerouted"
  }
  ```

### 4.6 Manual or Test Expire
- **Method**: `POST`
- **Path**: `/api/reservations/:id/expire`
- **Auth**: Bearer JWT
- **Response `200 OK`**:
  ```json
  {
    "id": "RSV-501",
    "status": "TIMEOUT",
    "fallback_initiated": true
  }
  ```

---

## 5. Event Timeline & Admin APIs

### 5.1 Get Events for Emergency Request
- **Method**: `GET`
- **Path**: `/api/events/:requestId`
- **Auth**: Bearer JWT
- **Response `200 OK`**: Array of `AppEvent` objects sorted ascending by timestamp `ts`.

### 5.2 Admin Network Metrics
- **Method**: `GET`
- **Path**: `/api/admin/metrics`
- **Auth**: Bearer JWT (`admin`)
- **Response `200 OK`**:
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
    "decline_reasons": { "icu": 2 }
  }
  ```

### 5.3 Admin Stale Listings
- **Method**: `GET`
- **Path**: `/api/admin/stale`
- **Auth**: Bearer JWT (`admin`)
- **Response `200 OK`**: Array of hospitals with stale data (> 5 min).

---

## 6. AI Explanation API (Groq Decision Support)

### 6.1 Explain Match Ranking
- **Method**: `POST`
- **Path**: `/api/ai/explain`
- **Auth**: Bearer JWT
- **Request Body**:
  ```json
  {
    "hospitalName": "City Hospital",
    "rank": 1,
    "totalScore": 0.94,
    "reasons": ["ALL_RESOURCES", "FASTEST_ETA", "FRESH_DATA", "LOW_LOAD"],
    "components": {
      "resource": 1.0,
      "eta": 0.95,
      "freshness": 1.0,
      "load": 0.83,
      "distance": 0.92
    }
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "explanation": "City Hospital is ranked #1 because all required resources (ICU, ventilator, cardiac) are available with the fastest estimated ETA of 6 minutes, recent freshness verification under 1 minute, and low 17% overall load."
  }
  ```
