import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createSeedHospitals, reasonLabel } from "./seed";
import { rankHospitals } from "./matching";
import type {
  AppEvent, EmergencyRequest, EmergencyRequestInput, EventType, Hospital, Reservation, ResourceKey,
} from "./types";
import { TOGGLE_RESOURCES } from "./types";

export const RESERVATION_MS = 120_000;
export const FALLBACK_TRANSITION_MS = 3_500;

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}${(seq++).toString(36)}`;

interface SimState {
  hospitals: Hospital[];
  requests: EmergencyRequest[];
  reservations: Reservation[];
  events: AppEvent[];
  activeRequestId: string | null;
  speed: number;
  seededAt: number;

  reset: () => void;
  log: (e: Omit<AppEvent, "id" | "ts"> & { ts?: number }) => void;
  createRequest: (input: EmergencyRequestInput, ambulanceId: string, actor: string) => EmergencyRequest;
  requestBed: (requestId: string, hospitalId: string, actor: string, delayMs?: number) => Reservation | null;
  accept: (reservationId: string, actor: string) => void;
  reject: (reservationId: string, actor: string, reasons?: string[], note?: string) => void;
  markViewed: (reservationId: string, actor: string) => void;
  arrived: (reservationId: string, actor: string) => void;
  expire: (reservationId: string, actor?: string) => void;
  release: (reservationId: string, actor: string, reason?: string) => void;
  cancelRequest: (requestId: string, actor: string) => void;
  completeRequest: (requestId: string, actor: string) => void;
  clearActive: () => void;
  updateAvailability: (hospitalId: string, patch: Partial<Record<ResourceKey, number>>, actor: string) => void;
  setSpeed: (s: number) => void;
  tick: () => void;
}

function initial() {
  const now = Date.now();
  return {
    hospitals: createSeedHospitals(now),
    requests: [] as EmergencyRequest[],
    reservations: [] as Reservation[],
    events: [] as AppEvent[],
    activeRequestId: null as string | null,
    speed: 1,
    seededAt: now,
  };
}

const ev = (type: EventType, actor: string, message: string, extra: Partial<AppEvent> = {}): AppEvent => ({
  id: uid("ev"),
  ts: Date.now(),
  type,
  actor,
  message,
  ...extra,
});

export const useSim = create<SimState>()(
  persist(
    (set, get) => ({
      ...initial(),

      reset: () => set({ ...initial() }),

      log: (e) => set((s) => ({ events: [{ id: uid("ev"), ts: e.ts ?? Date.now(), ...e }, ...s.events].slice(0, 400) })),

      createRequest: (input, ambulanceId, actor) => {
        const req: EmergencyRequest = {
          ...input,
          id: uid("REQ"),
          ambulance_id: ambulanceId,
          created_at: Date.now(),
          status: "matching",
          reservation_ids: [],
        };
        const matches = rankHospitals(input, get().hospitals, Date.now());
        set((s) => ({
          requests: [req, ...s.requests],
          activeRequestId: req.id,
          events: [
            ev("MATCHES_RANKED", "matching-engine", `${matches.length} eligible hospitals ranked`, {
              request_id: req.id,
              meta: { top: matches[0] ? hospitalName(s.hospitals, matches[0].hospital_id) : "none" },
            }),
            ev("REQUEST_CREATED", actor, `${input.type} request created (${input.severity})`, {
              request_id: req.id,
              meta: { ambulance: ambulanceId, resources: input.resources.join(", ") || "none" },
            }),
            ...s.events,
          ],
        }));
        return req;
      },

      requestBed: (requestId, hospitalId, actor, delayMs = 0) => {
        const s = get();
        const req = s.requests.find((r) => r.id === requestId);
        if (!req) return null;
        const live = s.reservations.find((r) => r.request_id === requestId && r.status === "RESERVATION_REQUESTED");
        if (live) return live;
        const ranking = rankHospitals(req, s.hospitals, Date.now());
        const m = ranking.find((x) => x.hospital_id === hospitalId);
        const now = Date.now();
        const starts = now + delayMs;
        const res: Reservation = {
          id: uid("RSV"),
          request_id: requestId,
          hospital_id: hospitalId,
          status: "RESERVATION_REQUESTED",
          created_at: now,
          starts_at: starts,
          expires_at: starts + RESERVATION_MS / s.speed,
          score: m?.total_score ?? 0,
          attempt: req.reservation_ids.length + 1,
          held: {},
        };
        set((st) => ({
          reservations: [res, ...st.reservations.filter((r) => r.id !== res.id)],
          requests: st.requests.map((r) =>
            r.id === requestId ? { ...r, status: "reserving", reservation_ids: [...r.reservation_ids, res.id] } : r,
          ),
          events: [
            ev("RESERVATION_REQUESTED", actor, `Bed requested at ${hospitalName(st.hospitals, hospitalId)}`, {
              request_id: requestId,
              hospital_id: hospitalId,
              meta: { attempt: res.attempt, score: Math.round(res.score * 100), expires_in: "02:00" },
            }),
            ...st.events,
          ],
        }));
        return res;
      },

      accept: (reservationId, actor) => {
        const s = get();
        const res = s.reservations.find((r) => r.id === reservationId);
        if (!res || res.status !== "RESERVATION_REQUESTED") return;
        const req = s.requests.find((r) => r.id === res.request_id);
        const need = req?.resources ?? [];
        const held: Partial<Record<ResourceKey, number>> = {};
        need.forEach((k) => {
          if (!TOGGLE_RESOURCES.includes(k)) held[k] = 1;
        });
        const name = hospitalName(s.hospitals, res.hospital_id);
        const now = Date.now();
        set((st) => ({
          hospitals: st.hospitals.map((h) =>
            h.id === res.hospital_id
              ? {
                  ...h,
                  updated_at: now,
                  resources: Object.fromEntries(
                    Object.entries(h.resources).map(([k, v]) => [
                      k,
                      { ...v, available: Math.max(0, v.available - (held[k as ResourceKey] ?? 0)) },
                    ]),
                  ) as Hospital["resources"],
                }
              : h,
          ),
          reservations: st.reservations.map((r) =>
            r.id === reservationId ? { ...r, status: "HELD", resolved_at: now, held, responded_at: now, responded_by: actor } : r,
          ),
          requests: st.requests.map((r) => (r.id === res.request_id ? { ...r, status: "held" } : r)),
          events: [
            ev("HELD", "system", `Bed held at ${name} — ${Object.keys(held).join(", ") || "unit"} decremented`, {
              request_id: res.request_id,
              hospital_id: res.hospital_id,
              ts: now + 1,
            }),
            ev("ACCEPTED", actor, `${name} accepted the request`, { request_id: res.request_id, hospital_id: res.hospital_id }),
            ...st.events,
          ],
        }));
      },

      reject: (reservationId, actor, reasons = [], note) => resolveFailed(reservationId, "REJECTED", actor, reasons, note),

      markViewed: (reservationId, actor) => {
        const res = get().reservations.find((r) => r.id === reservationId);
        if (!res || res.viewed_at || res.status !== "RESERVATION_REQUESTED") return;
        set((st) => ({
          reservations: st.reservations.map((r) => (r.id === reservationId ? { ...r, viewed_at: Date.now() } : r)),
          events: [
            ev("VIEWED", actor, `Request viewed by nurse at ${hospitalName(st.hospitals, res.hospital_id)}`, {
              request_id: res.request_id,
              hospital_id: res.hospital_id,
            }),
            ...st.events,
          ],
        }));
      },

      arrived: (reservationId, actor) => {
        const res = get().reservations.find((r) => r.id === reservationId);
        if (!res || res.status !== "HELD" || res.arrived_at) return;
        set((st) => ({
          reservations: st.reservations.map((r) => (r.id === reservationId ? { ...r, arrived_at: Date.now() } : r)),
          requests: st.requests.map((r) => (r.id === res.request_id ? { ...r, status: "completed" } : r)),
          events: [
            ev("ARRIVED", actor, `Ambulance arrived at ${hospitalName(st.hospitals, res.hospital_id)} — hold converted to occupied bed`, {
              request_id: res.request_id,
              hospital_id: res.hospital_id,
            }),
            ...st.events,
          ],
        }));
      },
      expire: (reservationId, actor = "system") => resolveFailed(reservationId, "TIMEOUT", actor),

      release: (reservationId, actor, reason) => {
        const s = get();
        const res = s.reservations.find((r) => r.id === reservationId);
        if (!res || res.status !== "HELD" || res.arrived_at) return;
        set((st) => ({
          hospitals: st.hospitals.map((h) =>
            h.id === res.hospital_id
              ? {
                  ...h,
                  resources: Object.fromEntries(
                    Object.entries(h.resources).map(([k, v]) => [
                      k,
                      { ...v, available: Math.min(v.total, v.available + (res.held[k as ResourceKey] ?? 0)) },
                    ]),
                  ) as Hospital["resources"],
                }
              : h,
          ),
          reservations: st.reservations.map((r) => (r.id === reservationId ? { ...r, status: "RELEASED", release_reason: reason } : r)),
          events: [
            ev("RELEASED", actor, `Hold released at ${hospitalName(st.hospitals, res.hospital_id)}${reason ? ` — ${reason}` : ""}`, {
              request_id: res.request_id,
              hospital_id: res.hospital_id,
            }),
            ...st.events,
          ],
        }));
      },

      cancelRequest: (requestId, actor) => {
        const now = Date.now();
        set((st) => ({
          reservations: st.reservations.map((r) =>
            r.request_id === requestId && r.status === "RESERVATION_REQUESTED"
              ? { ...r, status: "CANCELLED", resolved_at: now }
              : r,
          ),
          requests: st.requests.map((r) => (r.id === requestId ? { ...r, status: "cancelled" } : r)),
          activeRequestId: st.activeRequestId === requestId ? null : st.activeRequestId,
          events: [ev("CANCELLED", actor, "Request cancelled by dispatcher", { request_id: requestId }), ...st.events],
        }));
      },

      completeRequest: (requestId) => {
        set((st) => ({
          requests: st.requests.map((r) => (r.id === requestId && r.status === "held" ? { ...r, status: "completed" } : r)),
          activeRequestId: null,
        }));
      },

      clearActive: () => set({ activeRequestId: null }),

      updateAvailability: (hospitalId, patch, actor) => {
        const now = Date.now();
        set((st) => ({
          hospitals: st.hospitals.map((h) =>
            h.id === hospitalId
              ? {
                  ...h,
                  updated_at: now,
                  resources: Object.fromEntries(
                    Object.entries(h.resources).map(([k, v]) => {
                      const nv = patch[k as ResourceKey];
                      return [k, nv === undefined ? v : { ...v, available: Math.max(0, Math.min(v.total, nv)) }];
                    }),
                  ) as Hospital["resources"],
                }
              : h,
          ),
          events: [
            ev("AVAILABILITY_UPDATED", actor, `${hospitalName(st.hospitals, hospitalId)} updated availability`, {
              hospital_id: hospitalId,
              meta: Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, v as number])),
            }),
            ...st.events,
          ].slice(0, 400),
        }));
      },

      setSpeed: (speed) => {
        const s = get();
        const now = Date.now();
        // rescale live reservations so the remaining time reflects the new speed
        set({
          speed,
          reservations: s.reservations.map((r) => {
            if (r.status !== "RESERVATION_REQUESTED") return r;
            const remaining = Math.max(0, r.expires_at - Math.max(now, r.starts_at));
            const scaled = (remaining * s.speed) / speed;
            return { ...r, expires_at: Math.max(now, r.starts_at) + scaled };
          }),
        });
      },

      tick: () => {
        const s = get();
        const now = Date.now();
        s.reservations
          .filter((r) => r.status === "RESERVATION_REQUESTED" && r.expires_at <= now)
          .forEach((r) => get().expire(r.id));
        // simulated nurse heartbeat keeps "fresh" listings fresh
        if (s.hospitals.some((h) => h.heartbeat && now - h.updated_at > 45_000)) {
          set((st) => ({
            hospitals: st.hospitals.map((h) =>
              h.heartbeat && now - h.updated_at > 45_000 ? { ...h, updated_at: now - 4000 } : h,
            ),
          }));
        }
      },
    }),
    {
      name: "bedlink-sim",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        hospitals: s.hospitals,
        requests: s.requests,
        reservations: s.reservations,
        events: s.events,
        activeRequestId: s.activeRequestId,
        speed: s.speed,
        seededAt: s.seededAt,
      }),
    },
  ),
);

function hospitalName(hs: Hospital[], id: string) {
  return hs.find((h) => h.id === id)?.name ?? id;
}

function resolveFailed(reservationId: string, outcome: "REJECTED" | "TIMEOUT", actor: string, reasons: string[] = [], note?: string) {
  const s = useSim.getState();
  const res = s.reservations.find((r) => r.id === reservationId);
  if (!res || res.status !== "RESERVATION_REQUESTED") return;
  const req = s.requests.find((r) => r.id === res.request_id);
  const name = hospitalName(s.hospitals, res.hospital_id);
  const now = Date.now();
  useSim.setState((st) => ({
    reservations: st.reservations.map((r) => (r.id === reservationId
        ? { ...r, status: outcome, resolved_at: now, ...(outcome === "REJECTED" ? { reject_reasons: reasons, reject_note: note, responded_at: now, responded_by: actor } : {}) }
        : r)),
    events: [
      ev(
        outcome,
        outcome === "TIMEOUT" ? "system" : actor,
        outcome === "TIMEOUT" ? `${name} did not respond within 2:00` : `${name} declined${reasons.length ? `: ${reasons.map(reasonLabel).join(", ")}` : " the request"}${note ? ` (“${note}”)` : ""}`,
        { request_id: res.request_id, hospital_id: res.hospital_id },
      ),
      ...st.events,
    ],
  }));
  if (!req || req.status === "cancelled") return;

  // Automatic fallback to next eligible hospital
  const tried = useSim
    .getState()
    .reservations.filter((r) => r.request_id === req.id)
    .map((r) => r.hospital_id);
  const next = rankHospitals(req, useSim.getState().hospitals, Date.now(), tried)[0];
  if (!next) {
    useSim.setState((st) => ({
      requests: st.requests.map((r) => (r.id === req.id ? { ...r, status: "failed" } : r)),
      events: [ev("NO_CANDIDATES", "matching-engine", "No eligible hospitals remain", { request_id: req.id }), ...st.events],
    }));
    return;
  }
  useSim.getState().log({
    type: "FALLBACK",
    actor: "matching-engine",
    request_id: req.id,
    hospital_id: next.hospital_id,
    message: `Fallback to next best match: ${hospitalName(useSim.getState().hospitals, next.hospital_id)} (${Math.round(next.total_score * 100)}%)`,
  });
  useSim.getState().requestBed(req.id, next.hospital_id, "matching-engine", FALLBACK_TRANSITION_MS);
}
