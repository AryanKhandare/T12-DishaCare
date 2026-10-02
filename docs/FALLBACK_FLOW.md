# BEDLINK — AUTOMATIC FALLBACK ENGINE

---

## 1. Overview & Architecture

When a hospital is unable to accept an emergency reservation—either through an explicit rejection by hospital staff or when the authoritative 2-minute confirmation window expires—the BedLink Fallback Engine (`backend/src/services/fallback.service.ts`) instantly and automatically redirects the patient to the next best eligible hospital without requiring the ambulance driver or dispatcher to restart their workflow.

---

## 2. Fallback Trigger Conditions

A fallback cascade is triggered automatically upon:
1. **Explicit Rejection**: Hospital nurse clicks decline with specific operational reasons (e.g., *"ED at maximum capacity"*, *"Specialist in surgery"*).
2. **Authoritative Timeout**: Reservation exceeds `expiresAt` without nurse response, detected by the 2-second background expiration worker.

---

## 3. Fallback Hospital Selection & Filtering

```
[ HOSPITAL REJECTS OR TIMES OUT ]
                 │
                 ▼
[ GATHER ALL HISTORICAL CONTACTS FOR EMERGENCY ]
  - Exclude already attempted hospitals
  - Exclude previously rejected hospitals
  - Exclude expired hospitals
                 │
                 ▼
[ QUERY REMAINING CANDIDATE HOSPITALS WITHIN RADIUS ]
  - Filter by resource capability (ICU, Ventilator, etc.)
  - Filter by positive available bed capacity
                 │
                 ▼
[ SORT CANDIDATES BY DETERMINISTIC MATCH SCORE DESC ]
                 │
       ┌─────────┴─────────┐
       ▼                   ▼
[ CANDIDATE FOUND ]     [ NO CANDIDATE ]
       │                   │
       ▼                   ▼
Create Attempt (N+1)    Mark Emergency as
Reservation: PENDING    NO_HOSPITAL_AVAILABLE
Notify Hospital &       Notify Dispatcher via
Dispatcher via WS       WebSocket Alert
```

---

## 4. Fallback Ordering & Preservation of Ranking

The fallback sequence follows the deterministic multi-factor match score previously computed:
1. **Hospital A (City Care)**: Score 89.2% $\rightarrow$ *Rejected / Timed Out*
2. **Hospital B (Metro General)**: Score 84.5% $\rightarrow$ *Automatically Selected for Attempt 2*
3. **Hospital C (Sunrise Memorial)**: Score 81.0% $\rightarrow$ *Next in Line if B fails*

If live hospital availability changes during the emergency lifecycle, ranking is dynamically refreshed against the latest state before dispatching the next reservation attempt.

---

## 5. "No Hospital Available" Boundary

When all eligible hospitals within the radius have been contacted and rejected or timed out, the system safely transitions the emergency:

```json
{
  "type": "NO_HOSPITAL_AVAILABLE",
  "emergencyId": "REQ-1024",
  "message": "No eligible hospital within 15 km is currently available to accept this emergency."
}
```

The ambulance dispatcher dashboard receives this alert immediately to facilitate regional command escalation or air transport.

---

## 6. Audit Trail & Event Logging

Every step of the fallback pipeline writes an immutable record to `EventLog`:
- `FALLBACK_TRIGGERED`: Logs previous hospital, reason (e.g. `TIMEOUT` or `REJECTED`), and timestamp.
- `NEXT_HOSPITAL_SELECTED`: Logs candidate hospital ID, calculated match score, and new reservation ID.
- `NO_HOSPITAL_AVAILABLE`: Logged if candidate queue is exhausted.
