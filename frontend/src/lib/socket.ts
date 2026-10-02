import { io, Socket } from "socket.io-client";
import { useAuth } from "./auth-store";
import { useSim } from "./sim-store";
import { toast } from "sonner";
import type { Hospital, Reservation, ResourceKey } from "./types";

const SOCKET_URL =
  (typeof window !== "undefined" && (window as any).__BEDLINK_API_URL__) ||
  (import.meta as any).env?.VITE_API_URL ||
  "http://localhost:5000";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function initSocket(): Socket {
  if (socket && socket.connected) {
    return socket;
  }

  const token = useAuth.getState().token;

  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log("[BedLink Socket] Connected to backend:", socket?.id);
    const user = useAuth.getState().user;
    if (user?.hospital_id) {
      socket?.emit("JOIN_HOSPITAL_ROOM", { hospitalId: user.hospital_id });
    }
    if (user?.ambulance_id) {
      socket?.emit("JOIN_AMBULANCE_ROOM", { ambulanceId: user.ambulance_id });
    }
  });

  socket.on("disconnect", () => {
    console.log("[BedLink Socket] Disconnected from backend");
  });

  // 1. Hospital receives new emergency broadcast
  socket.on("NEW_EMERGENCY", (payload: any) => {
    console.log("[Socket] NEW_EMERGENCY received", payload);
    const req = {
      id: payload.emergencyId,
      ambulance_id: "A12",
      type: payload.type,
      severity: payload.severity,
      resources: Object.keys(payload.requirements || {}).filter(
        (k) => payload.requirements[k]
      ) as ResourceKey[],
      location: payload.ambulanceLocation,
      created_at: payload.timestamp || Date.now(),
      status: "matching" as const,
      reservation_ids: [],
    };

    useSim.setState((s) => {
      const exists = s.requests.some((r) => r.id === req.id);
      if (exists) return s;
      return {
        requests: [req, ...s.requests],
        events: [
          {
            id: `ev-${Date.now()}`,
            ts: Date.now(),
            request_id: req.id,
            actor: "system",
            type: "REQUEST_CREATED",
            message: `${req.type} emergency broadcast received (${req.severity})`,
            meta: { eta: `${payload.etaMinutes} min` },
          },
          ...s.events,
        ],
      };
    });

    toast.error(`Emergency Broadcast: ${payload.type}`, {
      description: `${payload.severity} severity · ETA: ${payload.etaMinutes} min`,
    });
  });

  // 2. Hospital receives reservation hold request
  socket.on("RESERVATION_REQUEST", (payload: any) => {
    console.log("[Socket] RESERVATION_REQUEST received", payload);
    const res: Reservation = {
      id: payload.reservationId,
      request_id: payload.emergencyId,
      hospital_id: payload.hospitalId,
      status: "RESERVATION_REQUESTED",
      created_at: payload.startsAt || Date.now(),
      starts_at: payload.startsAt || Date.now(),
      expires_at: payload.expiresAt || Date.now() + 120_000,
      score: payload.score || 0,
      attempt: payload.attempt || 1,
      held: {},
    };

    useSim.setState((s) => {
      const existing = s.reservations.find((r) => r.id === res.id);
      const updatedRequests = payload.emergency
        ? [payload.emergency, ...s.requests.filter((q) => q.id !== payload.emergency.id)]
        : s.requests.map((q) =>
            q.id === res.request_id
              ? { ...q, status: "reserving", reservation_ids: [...q.reservation_ids, res.id] }
              : q
          );
      return {
        reservations: existing
          ? s.reservations.map((r) => (r.id === res.id ? { ...r, ...res } : r))
          : [res, ...s.reservations.filter((r) => r.id !== res.id)],
        requests: updatedRequests,
        events: [
          {
            id: `ev-${Date.now()}`,
            ts: Date.now(),
            request_id: res.request_id,
            hospital_id: res.hospital_id,
            actor: "ambulance",
            type: "RESERVATION_REQUESTED",
            message: `Bed hold requested (2:00 window)`,
            meta: { attempt: res.attempt },
          },
          ...s.events,
        ],
      };
    });

    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch {}

    toast.warning("Incoming Bed Hold Request!", {
      description: "2-minute response window started. Click to respond.",
      duration: 8000,
    });
  });

  // 3. Ambulance receives reservation acceptance confirmation
  socket.on("RESERVATION_ACCEPTED", (payload: any) => {
    console.log("[Socket] RESERVATION_ACCEPTED received", payload);
    useSim.setState((s) => ({
      reservations: s.reservations.map((r) =>
        r.id === payload.reservationId
          ? {
              ...r,
              status: "HELD",
              resolved_at: payload.resolvedAt || Date.now(),
              held: payload.heldResources || {},
            }
          : r
      ),
      requests: s.requests.map((q) =>
        q.id === payload.emergencyId ? { ...q, status: "held" } : q
      ),
      events: [
        {
          id: `ev-${Date.now()}`,
          ts: Date.now(),
          request_id: payload.emergencyId,
          hospital_id: payload.hospitalId,
          actor: "hospital",
          type: "ACCEPTED",
          message: `${payload.hospitalName} accepted the bed reservation request`,
        },
        ...s.events,
      ],
    }));

    toast.success(`Reservation Confirmed!`, {
      description: `${payload.hospitalName} accepted and held the requested bed.`,
    });
  });

  // 4. Fallback triggered to next hospital (Section 17 & 18: only after real reservation rejection/expiration)
  socket.on("FALLBACK_TRIGGERED", (payload: any) => {
    console.log("[Socket] FALLBACK_TRIGGERED received", payload);
    const simState = useSim.getState();
    const targetRequest = simState.requests.find((q) => q.id === payload.emergencyId);

    // Guard: Fallback must NOT trigger during searching/discovery or for untracked requests
    if (!targetRequest || targetRequest.status !== "reserving") {
      console.log("[Socket] Ignored FALLBACK_TRIGGERED: request not actively in reservation flow", payload.emergencyId);
      return;
    }

    const newRes: Reservation = {
      id: payload.reservationId || `RSV-fallback-${Date.now()}`,
      request_id: payload.emergencyId,
      hospital_id: payload.nextHospitalId,
      status: "RESERVATION_REQUESTED",
      created_at: Date.now(),
      starts_at: Date.now(),
      expires_at: payload.expiresAt || Date.now() + 120_000,
      score: payload.score || 0,
      attempt: payload.attempt || 2,
      held: {},
    };

    useSim.setState((s) => ({
      reservations: [newRes, ...s.reservations.filter((r) => r.id !== newRes.id)],
      requests: s.requests.map((q) =>
        q.id === payload.emergencyId
          ? { ...q, status: "reserving", reservation_ids: [...q.reservation_ids, newRes.id] }
          : q
      ),
      events: [
        {
          id: `ev-${Date.now()}`,
          ts: Date.now(),
          request_id: payload.emergencyId,
          hospital_id: payload.nextHospitalId,
          actor: "matching-engine",
          type: "FALLBACK",
          message: `Fallback to next best match: ${payload.nextHospital} (${Math.round(
            (payload.score || 0) * 100
          )}%)`,
        },
        ...s.events,
      ],
    }));

    toast.info("Automatic Fallback Triggered", {
      description: `${payload.previousHospital || "Hospital"} unavailable. Next request routed to ${payload.nextHospital}.`,
      duration: 6000,
    });
  });

  // 5. Hospital availability updated
  socket.on("AVAILABILITY_UPDATED", (payload: any) => {
    console.log("[Socket] AVAILABILITY_UPDATED received", payload);
    if (!payload.hospitalId || !payload.resources) return;

    useSim.setState((s) => ({
      hospitals: s.hospitals.map((h) =>
        h.id === payload.hospitalId
          ? {
              ...h,
              resources: payload.resources,
              updated_at: payload.updatedAt || Date.now(),
            }
          : h
      ),
    }));
  });

  socket.on("HOSPITAL_AVAILABILITY_UPDATED", (payload: any) => {
    console.log("[Socket] HOSPITAL_AVAILABILITY_UPDATED received", payload);
    if (!payload.hospitalId || !payload.resources) return;

    useSim.setState((s) => ({
      hospitals: s.hospitals.map((h) =>
        h.id === payload.hospitalId
          ? {
              ...h,
              resources: payload.resources,
              updated_at: payload.lastUpdatedAt ? new Date(payload.lastUpdatedAt).getTime() : Date.now(),
              availability_status: payload.availabilityStatus || "LIVE",
            }
          : h
      ),
    }));

    toast.info("Live Capacity Updated", {
      description: `${payload.hospitalName || "Hospital"} submitted live availability from Hospital Portal.`,
    });
  });

  // 6. Reservation rejection
  socket.on("RESERVATION_REJECTED", (payload: any) => {
    console.log("[Socket] RESERVATION_REJECTED received", payload);
    useSim.setState((s) => ({
      reservations: s.reservations.map((r) =>
        r.id === payload.reservationId
          ? {
              ...r,
              status: "REJECTED",
              resolved_at: Date.now(),
              reject_reasons: payload.reasons || [],
              reject_note: payload.note,
            }
          : r
      ),
    }));
  });

  // 7. Reservation timeout
  socket.on("RESERVATION_EXPIRED", (payload: any) => {
    console.log("[Socket] RESERVATION_EXPIRED received", payload);
    useSim.setState((s) => ({
      reservations: s.reservations.map((r) =>
        r.id === payload.reservationId
          ? {
              ...r,
              status: "TIMEOUT",
              resolved_at: Date.now(),
            }
          : r
      ),
    }));
  });

  // 8. No hospital available
  socket.on("NO_HOSPITAL_AVAILABLE", (payload: any) => {
    toast.error("No Hospitals Available", {
      description: "All candidate facilities were declined or timed out. Diverting to control center.",
    });
  });

  return socket;
}
