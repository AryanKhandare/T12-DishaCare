# BEDLINK — RESERVATION & BED HOLD ORCHESTRATION

---

## 1. Overview & Architecture

The Reservation Engine manages the critical transition from **broadcast matching** to **binding resource commitment**. It guarantees:
1. Clear separation between broadcast alerts and actual bed holds.
2. Server-authoritative 2-minute confirmation timers (20 seconds in `TEST_MODE`).
3. Atomic, concurrent reservation holds with row-level database locking.
4. Idempotency against duplicate network packets.

---

## 2. Separation of Broadcast vs. Reservation

```
[ EMERGENCY CREATED ]
         │
         ▼
[ BROADCAST ALERT ]  ──► All candidate hospitals receive alert
                           NO BEDS ARE HELD AT THIS STAGE.
                           Hospitals indicate capacity.
         │
         ▼
[ DISPATCHER SELECTS HOSPITAL ]
         │
         ▼
[ RESERVATION CREATED ] ──► ONLY the selected hospital enters 2-minute window.
                             Status: PENDING
```

---

## 3. Reservation State Machine

```
              ┌───────────────┐
              │    PENDING    │
              └──┬─────┬─────┬┘
                 │     │     │
       Accept    │     │     │ Reject / Decline
    ┌────────────┘     │     └────────────┐
    ▼                  ▼ Timeout          ▼
┌──────────┐     ┌───────────┐      ┌──────────┐
│ ACCEPTED │     │  EXPIRED  │      │ REJECTED │
└────┬─────┘     └─────┬─────┘      └────┬─────┘
     │                 │                 │
  Bed Held             └────────┬────────┘
     │                          │
     ▼                          ▼
┌──────────┐             [ FALLBACK ]
│ RELEASED │       (Next ranked hospital)
└──────────┘
```

---

## 4. Confirmation Window & Server Authority

- **Production Timeout**: 120 seconds (`RESERVATION_TIMEOUT_SECONDS=120`)
- **Test Mode Timeout**: 20 seconds (`TEST_MODE=true` / `RESERVATION_TIMEOUT_SECONDS=20`)

### Authoritative Time Architecture
- The frontend countdown UI is strictly visual and displays time remaining relative to `expiresAt`.
- The backend runs a periodic expiration worker every 2 seconds (`setInterval`) in `ReservationService.startExpirationWorker()`.
- Expired reservations are atomically transitioned:
  $$\text{PENDING} \longrightarrow \text{EXPIRED}$$
  and immediately trigger the automatic fallback cascade.

---

## 5. Concurrency Control & Bed Hold Atomicity

When multiple ambulances dispatch patients simultaneously, or concurrent accept requests hit the API, the system uses Prisma/PostgreSQL transactions to prevent double-booking:

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Fetch current live availability
  const avail = await tx.bedAvailability.findUnique({
    where: { hospitalId }
  });

  // 2. Validate sufficient available count
  if (requiresIcu && avail.icuAvailable < 1) {
    throw new Error("ICU bed is no longer available at this hospital.");
  }

  // 3. Atomically decrement available and increment held
  await tx.bedAvailability.update({
    where: { hospitalId },
    data: {
      icuAvailable: { decrement: 1 },
      icuHeld: { increment: 1 }
    }
  });

  // 4. Update reservation status
  await tx.reservation.update({
    where: { id: reservationId },
    data: { status: "ACCEPTED", confirmedAt: new Date() }
  });
});
```

If another reservation consumes the last available resource row, the concurrent transaction aborts and returns an explicit `409 Conflict` (`RESOURCE_NO_LONGER_AVAILABLE`).

---

## 6. Authorization & Ownership (Section 44)

For hospital actions:
- Never trust `hospitalId` provided in the HTTP request payload.
- Extract `req.user.hospitalId` directly from the authenticated JWT session.
- A nurse assigned to Hospital A cannot accept or reject reservations for Hospital B (returns `403 Forbidden`).

---

## 7. Idempotency Guarantees

- Duplicate `POST .../accept` calls on an already `ACCEPTED` reservation return the existing confirmation record without decrementing resources twice.
- Duplicate `POST .../reject` calls do not trigger multiple fallback cascades.
