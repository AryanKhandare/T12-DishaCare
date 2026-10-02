# BedLink: Real-Time WebSocket / Socket.IO Events Specification

BedLink utilizes authenticated Socket.IO connections to facilitate instant emergency broadcasts, response coordination, and real-time bed hold notifications between ambulances, hospital nurses, and command centers.

---

## 1. Connection & Authentication

Clients connect to the root namespace (`/`):
```ts
import { io } from "socket.io-client";

const socket = io(BACKEND_URL, {
  auth: {
    token: accessToken,
  },
  transports: ["websocket", "polling"],
});
```

The server verifies the JWT token on handshake. If valid, the connection attaches `socket.data.user = { id, username, role, hospital_id, ambulance_id }`.

---

## 2. Client → Server Events

### 2.1 `JOIN_HOSPITAL_ROOM`
- **Emitted By**: Hospital staff client upon connection or role switch
- **Payload**:
  ```json
  {
    "hospitalId": "h-city"
  }
  ```
- **Server Verification**: The authenticated user's role must be `hospital` (with matching `hospital_id`) or `admin`.
- **Action**: Socket joins room `hospital:h-city`.

### 2.2 `JOIN_AMBULANCE_ROOM`
- **Emitted By**: Dispatcher / Paramedic client
- **Payload**:
  ```json
  {
    "ambulanceId": "A12"
  }
  ```
- **Server Verification**: The authenticated user's role must be `dispatcher` or `admin`.
- **Action**: Socket joins room `ambulance:A12`.

---

## 3. Server → Hospital Events

### 3.1 `NEW_EMERGENCY`
- **Target Room**: `hospital:{hospitalId}` for each eligible nearby hospital within radius
- **Payload**:
  ```json
  {
    "event": "NEW_EMERGENCY",
    "emergencyId": "REQ-1001",
    "type": "Cardiac",
    "severity": "Critical",
    "requirements": {
      "icu": true,
      "ventilator": true,
      "oxygen": true,
      "cardiac": true
    },
    "ambulanceLocation": {
      "lat": 19.0178,
      "lng": 72.8478,
      "label": "Dadar TT Circle, Mumbai"
    },
    "etaMinutes": 6.2,
    "distanceKm": 2.1,
    "timestamp": 1775199300000
  }
  ```

### 3.2 `RESERVATION_REQUEST`
- **Target Room**: `hospital:{hospitalId}`
- **Payload**:
  ```json
  {
    "event": "RESERVATION_REQUEST",
    "reservationId": "RSV-501",
    "emergencyId": "REQ-1001",
    "hospitalId": "h-city",
    "score": 0.94,
    "attempt": 1,
    "startsAt": 1775199320000,
    "expiresAt": 1775199440000,
    "expiresInSec": 120,
    "requiredResources": ["icu", "ventilator", "cardiac"]
  }
  ```

### 3.3 `RESERVATION_CANCELLED`
- **Target Room**: `hospital:{hospitalId}`
- **Payload**:
  ```json
  {
    "event": "RESERVATION_CANCELLED",
    "reservationId": "RSV-501",
    "emergencyId": "REQ-1001",
    "reason": "Dispatcher cancelled emergency"
  }
  ```

---

## 4. Server → Ambulance / Dispatcher Events

### 4.1 `HOSPITAL_RESPONSE_RECEIVED`
- **Target Room**: `ambulance:{ambulanceId}`
- **Payload**:
  ```json
  {
    "event": "HOSPITAL_RESPONSE_RECEIVED",
    "emergencyId": "REQ-1001",
    "hospitalId": "h-city",
    "hospitalName": "City Hospital",
    "requirementsFulfilled": 3,
    "requirementsTotal": 4,
    "fulfillmentPercentage": 75,
    "matchScore": 0.94
  }
  ```

### 4.2 `MATCHING_COMPLETED`
- **Target Room**: `ambulance:{ambulanceId}`
- **Payload**:
  ```json
  {
    "event": "MATCHING_COMPLETED",
    "emergencyId": "REQ-1001",
    "hospitals": [
      {
        "hospitalId": "h-city",
        "hospitalName": "City Hospital",
        "rank": 1,
        "matchScore": 0.94,
        "etaMinutes": 6.2,
        "distanceKm": 2.1,
        "reasons": ["ALL_RESOURCES", "FASTEST_ETA"]
      },
      {
        "hospitalId": "h-metro",
        "hospitalName": "Metro Hospital",
        "rank": 2,
        "matchScore": 0.87,
        "etaMinutes": 8.5,
        "distanceKm": 3.4,
        "reasons": ["ALL_RESOURCES", "GOOD_ETA"]
      }
    ]
  }
  ```

### 4.3 `RESERVATION_PENDING`
- **Target Room**: `ambulance:{ambulanceId}`
- **Payload**:
  ```json
  {
    "event": "RESERVATION_PENDING",
    "reservationId": "RSV-501",
    "emergencyId": "REQ-1001",
    "hospitalId": "h-city",
    "hospitalName": "City Hospital",
    "expiresAt": 1775199440000,
    "attempt": 1
  }
  ```

### 4.4 `RESERVATION_ACCEPTED`
- **Target Room**: `ambulance:{ambulanceId}`
- **Payload**:
  ```json
  {
    "event": "RESERVATION_ACCEPTED",
    "reservationId": "RSV-501",
    "emergencyId": "REQ-1001",
    "hospitalId": "h-city",
    "hospitalName": "City Hospital",
    "heldResources": { "icu": 1, "ventilator": 1 },
    "resolvedAt": 1775199350000
  }
  ```

### 4.5 `RESERVATION_REJECTED`
- **Target Room**: `ambulance:{ambulanceId}`
- **Payload**:
  ```json
  {
    "event": "RESERVATION_REJECTED",
    "reservationId": "RSV-501",
    "emergencyId": "REQ-1001",
    "hospitalId": "h-city",
    "hospitalName": "City Hospital",
    "reasons": ["icu"],
    "note": "Surge in walk-ins"
  }
  ```

### 4.6 `RESERVATION_EXPIRED`
- **Target Room**: `ambulance:{ambulanceId}`, `hospital:{hospitalId}`
- **Payload**:
  ```json
  {
    "event": "RESERVATION_EXPIRED",
    "reservationId": "RSV-501",
    "emergencyId": "REQ-1001",
    "hospitalId": "h-city",
    "hospitalName": "City Hospital",
    "expiredAt": 1775199440000
  }
  ```

### 4.7 `FALLBACK_TRIGGERED`
- **Target Room**: `ambulance:{ambulanceId}`
- **Payload**:
  ```json
  {
    "event": "FALLBACK_TRIGGERED",
    "emergencyId": "REQ-1001",
    "previousHospital": "City Hospital",
    "nextHospital": "Metro Hospital",
    "nextHospitalId": "h-metro",
    "score": 0.87,
    "attempt": 2
  }
  ```

### 4.8 `NO_HOSPITAL_AVAILABLE`
- **Target Room**: `ambulance:{ambulanceId}`
- **Payload**:
  ```json
  {
    "event": "NO_HOSPITAL_AVAILABLE",
    "emergencyId": "REQ-1001",
    "message": "All eligible hospitals have been exhausted without acceptance"
  }
  ```

---

## 5. Broadcast / Global Feed Events

### 5.1 `AVAILABILITY_UPDATED`
- **Target**: All connected clients (`io.emit`)
- **Payload**:
  ```json
  {
    "event": "AVAILABILITY_UPDATED",
    "hospitalId": "h-city",
    "hospitalName": "City Hospital",
    "patch": { "icu": 4, "ventilator": 2 },
    "resources": { ... },
    "updatedAt": 1775199350000
  }
  ```

### 5.2 `BED_HELD` & `BED_RELEASED`
- **Target**: Hospital room & Admin room
- **Payload**:
  ```json
  {
    "event": "BED_HELD",
    "reservationId": "RSV-501",
    "hospitalId": "h-city",
    "held": { "icu": 1, "ventilator": 1 }
  }
  ```
