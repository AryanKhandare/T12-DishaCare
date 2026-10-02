# BedLink: Database Architecture & Schema Specification

BedLink uses PostgreSQL as its primary relational datastore with Prisma ORM for type safety, schema migrations, and relational integrity.

---

## 1. Schema Diagram (Entity Relationships)

```
       +-------------------+
       |    Ambulance      |
       +-------------------+
                 | 1
                 |
                 | *
       +-------------------+               +-------------------+
       | EmergencyRequest  |-------*-------| HospitalResponse  |
       +-------------------+               +-------------------+
         | 1             | 1                         | *
         |               |                           |
         | *             | *                         | 1
+-------------------+  +-------------------+  +-------------------+
|    Reservation    |  |     EventLog      |  |     Hospital      |
+-------------------+  +-------------------+  +-------------------+
         | *                     |                   | 1
         |                       +---------*---------+
         | 1                                         | 1
+-------------------+                                |
|     Hospital      |                                | 1
+-------------------+                      +-------------------+
         | 1                               |  BedAvailability  |
         | *                               +-------------------+
+-------------------+
|       User        |
+-------------------+
```

---

## 2. Core Entities

### 2.1 `users`
Represents dispatchers, hospital nurses/staff, and command center admins.
- `id` (String PK cuid)
- `name` (String)
- `username` (String UNIQUE)
- `email` (String UNIQUE, nullable)
- `passwordHash` (String, bcrypt hashed)
- `role` (String: `dispatcher`, `hospital`, `admin`)
- `hospital_id` (String FK -> `hospitals.id`, nullable)
- `ambulance_id` (String, nullable)
- `is_active` (Boolean, default true)
- `created_at`, `updated_at` (Timestamps)

### 2.2 `hospitals`
Master data for participating hospitals in the region (Mumbai Metropolitan Region demo).
- `id` (String PK: `h-city`, `h-metro`, etc.)
- `name` (String)
- `area` (String)
- `address`, `phone`, `hospital_type` (String, nullable)
- `lat`, `lng` (Float: Geographic coordinates for Haversine distance & map rendering)
- `active` (Boolean: whether facility is operational)
- `load_pct` (Float: 0-100 current bed/capacity load)
- `specialties` (String[]: e.g. `cardiology`, `trauma`, `general`, `pulmonology`, `burns`)
- `heartbeat` (Boolean: indicates automated or active nurse telemetry)
- `updated_at`, `created_at` (Timestamps)

### 2.3 `bed_availabilities`
Dynamic capacity telemetry for countable beds and unit toggles.
- `id` (String PK cuid)
- `hospital_id` (String FK UNIQUE -> `hospitals.id`)
- `icu_available`, `icu_total` (Int)
- `ventilator_available`, `ventilator_total` (Int)
- `cardiac_available` (Int: 0 or 1), `cardiac_total` (Int: 1)
- `oxygen_available`, `oxygen_total` (Int)
- `burns_available` (Int: 0 or 1), `burns_total` (Int: 1)
- `last_updated` (Timestamp)
- `updated_by` (String, actor username)

### 2.4 `ambulances`
Master registry for ambulance fleet vehicles and paramedics.
- `id` (String PK: `A12`, `A07`, `A21`, etc.)
- `vehicle_number`, `driver_name`, `driver_phone`
- `paramedic_name`, `paramedic_phone`
- `crew_size` (Int)
- `operator_name` (String)

### 2.5 `emergency_requests`
Primary incident lifecycle entity initiated by dispatchers/paramedics.
- `id` (String PK: `REQ-...`)
- `ambulance_id` (String FK -> `ambulances.id`)
- `patient_reference`, `age`, `gender`
- `type` (`Trauma` | `Cardiac` | `Respiratory` | `Burns` | `Other`)
- `severity` (`Critical` | `Serious` | `Stable`)
- `lat`, `lng`, `location_label`
- `requires_icu`, `requires_ventilator`, `requires_cardiac`, `requires_oxygen`, `requires_burns` (Booleans)
- `resources` (String[]: keys requested)
- `specialty` (String)
- `status` (`matching`, `reserving`, `held`, `failed`, `cancelled`, `completed`)
- `created_by` (String)
- `created_at`, `updated_at`

### 2.6 `hospital_responses`
Capacity confirmations submitted by hospital nurses during broadcast phase.
- `id` (String PK cuid)
- `emergency_id` (String FK -> `emergency_requests.id`)
- `hospital_id` (String FK -> `hospitals.id`)
- `icu`, `ventilator`, `oxygen`, `cardiac`, `burns` (Booleans fulfilled)
- `requirements_fulfilled`, `requirements_total` (Int)
- `fulfillment_percentage` (Float: 0-100 calculated by backend)
- `status` (`RECORDED`)
- `responded_at`, `created_at`, `updated_at`

### 2.7 `reservations`
Authoritative 2-minute bed hold locks.
- `id` (String PK: `RSV-...`)
- `request_id` (String FK -> `emergency_requests.id`)
- `hospital_id` (String FK -> `hospitals.id`)
- `status` (`RESERVATION_REQUESTED`, `ACCEPTED`, `HELD`, `REJECTED`, `TIMEOUT`, `CANCELLED`, `RELEASED`)
- `score` (Float: match score 0.0 - 1.0)
- `attempt` (Int: sequential attempt counter 1, 2, 3...)
- `starts_at` (Timestamp when countdown began)
- `expires_at` (Timestamp when hold window expires)
- `responded_at`, `responded_by`, `resolved_at`, `arrived_at`, `viewed_at`
- `reject_reasons` (String[])
- `reject_note`, `release_reason`
- `held` (JSON: key-value map of decremented resources e.g. `{"icu": 1}`)
- `hold_token` (String cryptographic authorization token)

### 2.8 `event_logs`
Immutable audit log feed for every critical state change in the system.
- `id` (String PK cuid)
- `ts` (BigInt: Millisecond Unix timestamp)
- `request_id`, `hospital_id`, `reservation_id` (Nullable FKs)
- `actor` (String: e.g. `dispatcher1`, `nurse_city`, `matching-engine`, `system`)
- `type` (String: EventType enum string)
- `message` (String: Human-readable narrative description)
- `metadata` (JSON: Extra contextual attributes)

---

## 3. Concurrency Protection & Resource Holding

When a hospital nurse accepts a reservation (`POST /api/reservations/:id/accept`):
1. An atomic PostgreSQL transaction is executed via `prisma.$transaction()`.
2. The reservation state is verified to be `RESERVATION_REQUESTED` and `expires_at > now()`.
3. The hospital's `bed_availabilities` row is inspected with row-level validation.
4. Each required resource is verified to have `available >= 1`.
5. If available, `available` count is decremented by 1, `last_updated` is set to `now()`, reservation is marked `HELD`, and `emergency_requests` status is updated to `held`.
6. If any resource was claimed concurrently by another reservation, the transaction rolls back and returns `409 Conflict` with `RESOURCE_NO_LONGER_AVAILABLE`.
