import { useAuth } from "./auth-store";
import { useSim } from "./sim-store";
import { DEMO_USERS } from "./seed";
import { freshnessLevel, haversineKm, rankHospitals } from "./matching";
import { initSocket } from "./socket";
import type { AppEvent, EmergencyRequest, EmergencyRequestInput, Hospital, MatchResult, NearbyHospitalItem, Reservation, ResourceKey, User } from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const API_BASE =
  (typeof window !== "undefined" && (window as any).__BEDLINK_API_URL__) ||
  (import.meta as any).env?.VITE_API_URL ||
  "http://localhost:5000";

/**
 * Universal request wrapper: calls the real Express backend API,
 * handles Bearer tokens and 401 redirects, with fallback to local state if offline.
 */
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  fallback?: () => T,
  opts: { auth?: boolean } = {}
): Promise<T> {
  const token = useAuth.getState().token;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  const isPublic =
    opts.auth === false ||
    path.startsWith("/api/auth/") ||
    (method === "GET" && path.startsWith("/api/hospitals"));

  if (!isPublic) {
    if (!token && typeof window !== "undefined") {
      useAuth.getState().logout();
      if (
        !window.location.pathname.includes("/login") &&
        !window.location.pathname.includes("/signup")
      ) {
        window.location.assign("/login");
      }
      throw new ApiError(401, "Unauthorized");
    }
    if (token && token !== "undefined" && token !== "null") {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } else if (token && token !== "undefined" && token !== "null") {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const reqInit: RequestInit = {
      method,
      headers,
      credentials: "include",
    };
    if (body !== undefined) {
      reqInit.body = JSON.stringify(body);
    }
    const res = await fetch(`${API_BASE}${path}`, reqInit);

    if (res.status === 401 && !isPublic) {
      useAuth.getState().logout();
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/login") &&
        !window.location.pathname.includes("/signup")
      ) {
        window.location.assign("/login");
      }
      throw new ApiError(401, "Unauthorized");
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new ApiError(
        res.status,
        errData.message || errData.error?.message || `HTTP ${res.status}`
      );
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // If backend is unreachable, gracefully fall back to local store
    if (fallback) {
      console.warn(`[BedLink API] Fallback for ${method} ${path}:`, err);
      return fallback();
    }
    throw new ApiError(500, (err as Error)?.message || "Network request failed");
  }
}

const actor = () => useAuth.getState().user?.username ?? "system";

export interface SendOtpResponse {
  success: boolean;
  message: string;
  phone: string;
  expiresAt: string;
  devOtp?: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  phone: string;
}

// POST /api/auth/send-otp
export async function sendOtp(phone: string): Promise<SendOtpResponse> {
  return request<SendOtpResponse>(
    "POST",
    "/api/auth/send-otp",
    { phone },
    undefined,
    { auth: false }
  );
}

// POST /api/auth/verify-otp
export async function verifyOtp(phone: string, otp: string): Promise<VerifyOtpResponse> {
  return request<VerifyOtpResponse>(
    "POST",
    "/api/auth/verify-otp",
    { phone, otp },
    undefined,
    { auth: false }
  );
}

export interface SignupPayload {
  name: string;
  username?: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword?: string;
  role: "DISPATCHER" | "HOSPITAL_NURSE";
  hospital_id?: string | null;
  hospitalId?: string | null;
  otp?: string;
}

// POST /api/auth/signup
export async function signup(payload: SignupPayload) {
  const res = await request<{ access_token: string; user: User; message?: string }>(
    "POST",
    "/api/auth/signup",
    payload,
    undefined,
    { auth: false }
  );
  useSim.getState().log({
    type: "LOGIN",
    actor: res.user.username || res.user.name,
    message: `${res.user.name} created account and signed in`,
  });
  try {
    initSocket();
  } catch {}
  return res;
}

// POST /api/auth/logout
export async function logoutApi() {
  try {
    await request<{ ok: boolean; message: string }>(
      "POST",
      "/api/auth/logout",
      {},
      undefined,
      { auth: false }
    );
  } catch {}
  useAuth.getState().logout();
}

// GET /api/auth/me
export async function getCurrentUser() {
  return request<{ user: User } | User>("GET", "/api/auth/me");
}

// POST /api/auth/login
export async function login(username: string, password: string) {
  try {
    const res = await request<{ access_token: string; user: User }>(
      "POST",
      "/api/auth/login",
      { username, password },
      undefined,
      { auth: false }
    );
    useSim.getState().log({ type: "LOGIN", actor: res.user.username, message: `${res.user.name} signed in` });
    // Initialize real-time socket connection
    try {
      initSocket();
    } catch {}
    return res;
  } catch (err) {
    // Demo fallback if backend is offline
    const u = DEMO_USERS.find((x) => x.username === username.trim().toLowerCase());
    if (u && u.password === password) {
      const { password: _p, ...user } = u;
      const payload = btoa(JSON.stringify({ sub: user.id, role: user.role, iat: Date.now() }));
      useSim.getState().log({ type: "LOGIN", actor: user.username, message: `${user.name} signed in` });
      return { access_token: `demo.${payload}.sig`, user };
    }
    throw err;
  }
}

// GET /api/hospitals
export async function getHospitals(): Promise<Hospital[]> {
  const data = await request<Hospital[] | { hospitals: Hospital[] }>(
    "GET",
    "/api/hospitals",
    undefined,
    () => useSim.getState().hospitals,
    { auth: false }
  );
  const list = Array.isArray(data) ? data : (data as any)?.hospitals || [];
  if (Array.isArray(list) && list.length > 0) {
    useSim.setState({ hospitals: list });
  }
  return list;
}

// GET /api/hospitals/nearby
export async function getNearbyHospitals(params: {
  lat: number;
  lng: number;
  radiusKm?: number | undefined;
  requiredResources?: ResourceKey[] | undefined;
  severity?: string | undefined;
}): Promise<{
  ambulance: { latitude: number; longitude: number };
  radiusKm: number;
  count: number;
  hospitals: NearbyHospitalItem[];
}> {
  const query = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
  });
  if (params.radiusKm) query.set("radiusKm", String(params.radiusKm));
  if (params.requiredResources && params.requiredResources.length > 0) {
    query.set("requiredResources", params.requiredResources.join(","));
  }
  if (params.severity) query.set("severity", params.severity);

  return request(
    "GET",
    `/api/hospitals/nearby?${query.toString()}`,
    undefined,
    undefined,
    { auth: false }
  );
}

// GET /api/hospitals/{id}/availability
export const getAvailability = (id: string) =>
  request<any>(
    "GET",
    `/api/hospitals/${id}/availability`,
    undefined,
    () => useSim.getState().hospitals.find((h) => h.id === id)
  );

// GET /api/hospitals/{id}
export const getHospital = (id: string) =>
  request<Hospital>("GET", `/api/hospitals/${id}`);


// PATCH /api/hospitals/{id}/availability
export async function patchAvailability(id: string, patch: Partial<Record<ResourceKey, number>>) {
  // Optimistic local update
  useSim.getState().updateAvailability(id, patch, actor());
  try {
    const res = await request<{ ok: boolean; updated_at: number; hospital?: Hospital }>(
      "PATCH",
      `/api/hospitals/${id}/availability`,
      patch,
      () => ({ ok: true, updated_at: Date.now() })
    );
    return res;
  } catch (err) {
    return { ok: true, updated_at: Date.now() };
  }
}

// POST /api/emergency-requests
export async function createEmergencyRequest(input: EmergencyRequestInput): Promise<EmergencyRequest> {
  const u = useAuth.getState().user;
  const ambulanceId = u?.ambulance_id ?? "A12";

  try {
    const data = await request<EmergencyRequest & { matches: MatchResult[] }>(
      "POST",
      "/api/emergency-requests",
      input,
      () => {
        const req = useSim.getState().createRequest(input, ambulanceId, actor());
        const matches = rankHospitals(input, useSim.getState().hospitals, Date.now());
        return { ...req, matches };
      }
    );

    useSim.setState((s) => ({
      requests: [data, ...s.requests.filter((r) => r.id !== data.id)],
      activeRequestId: data.id,
      events: [
        {
          id: `ev-${Date.now()}`,
          ts: Date.now(),
          request_id: data.id,
          actor: "matching-engine",
          type: "MATCHES_RANKED",
          message: `${data.matches?.length ?? 0} eligible hospitals ranked`,
          meta: { top: data.matches?.[0]?.hospital_name ?? "City Hospital" },
        },
        {
          id: `ev-${Date.now() + 1}`,
          ts: Date.now(),
          request_id: data.id,
          actor: actor(),
          type: "REQUEST_CREATED",
          message: `${input.type} request created (${input.severity})`,
          meta: { ambulance: ambulanceId, resources: input.resources.join(", ") || "none" },
        },
        ...s.events,
      ],
    }));

    return data;
  } catch {
    return useSim.getState().createRequest(input, ambulanceId, actor());
  }
}

// GET /api/emergency-requests/{id}/matches
export async function getMatches(requestId: string): Promise<MatchResult[]> {
  try {
    const data = await request<MatchResult[]>(
      "GET",
      `/api/emergency-requests/${requestId}/matches`,
      undefined,
      () => {
        const s = useSim.getState();
        const req = s.requests.find((r) => r.id === requestId);
        return req ? rankHospitals(req, s.hospitals, Date.now()) : [];
      }
    );
    return data;
  } catch {
    const s = useSim.getState();
    const req = s.requests.find((r) => r.id === requestId);
    return req ? rankHospitals(req, s.hospitals, Date.now()) : [];
  }
}

// POST /api/reservations
export async function createReservation(requestId: string, hospitalId: string): Promise<Reservation | null> {
  try {
    const res = await request<Reservation>(
      "POST",
      "/api/reservations",
      { requestId, hospitalId },
      () => {
        const r = useSim.getState().requestBed(requestId, hospitalId, actor());
        if (!r) throw new Error("Could not request bed");
        return r;
      }
    );

    useSim.setState((st) => ({
      reservations: [res, ...st.reservations.filter((r) => r.id !== res.id)],
      requests: st.requests.map((r) =>
        r.id === requestId ? { ...r, status: "reserving", reservation_ids: [...r.reservation_ids, res.id] } : r
      ),
      events: [
        {
          id: `ev-${Date.now()}`,
          ts: Date.now(),
          request_id: requestId,
          hospital_id: hospitalId,
          actor: actor(),
          type: "RESERVATION_REQUESTED",
          message: `Bed requested at ${hospitalId}`,
          meta: { attempt: res.attempt, expires_in: "02:00" },
        },
        ...st.events,
      ],
    }));

    return res;
  } catch {
    return useSim.getState().requestBed(requestId, hospitalId, actor());
  }
}

// POST /api/reservations/{id}/accept
export async function acceptReservation(id: string): Promise<Reservation | null> {
  try {
    const res = await request<Reservation>(
      "POST",
      `/api/reservations/${id}/accept`,
      undefined,
      () => {
        useSim.getState().accept(id, actor());
        return useSim.getState().reservations.find((r) => r.id === id) || (null as any);
      }
    );
    useSim.getState().accept(id, actor());
    return res;
  } catch {
    useSim.getState().accept(id, actor());
    return useSim.getState().reservations.find((r) => r.id === id) || null;
  }
}

// POST /api/reservations/{id}/reject
export async function rejectReservation(id: string, body: { reasons: string[]; note?: string | undefined } = { reasons: [] }): Promise<any> {
  try {
    const res = await request<any>(
      "POST",
      `/api/reservations/${id}/reject`,
      body,
      () => {
        useSim.getState().reject(id, actor(), body.reasons, body.note);
        return null;
      }
    );
    useSim.getState().reject(id, actor(), body.reasons, body.note);
    return res;
  } catch {
    useSim.getState().reject(id, actor(), body.reasons, body.note);
    return null;
  }
}

// POST /api/reservations/{id}/arrived
export async function markArrived(id: string) {
  try {
    const res = await request<any>(
      "POST",
      `/api/reservations/${id}/arrived`,
      undefined,
      () => {
        useSim.getState().arrived(id, actor());
        return null;
      }
    );
    useSim.getState().arrived(id, actor());
    return res;
  } catch {
    useSim.getState().arrived(id, actor());
  }
}

// GET /api/hospitals/{id}/reservations?status=pending|held
export const getHospitalReservations = (hospitalId: string, status: "pending" | "held") =>
  request<Reservation[]>(
    "GET",
    `/api/hospitals/${hospitalId}/reservations?status=${status}`,
    undefined,
    () =>
      useSim
        .getState()
        .reservations.filter(
          (r) =>
            r.hospital_id === hospitalId &&
            (status === "pending" ? r.status === "RESERVATION_REQUESTED" : r.status === "HELD" && !r.arrived_at)
        )
  );

// POST /api/reservations/{id}/expire
export const expireReservation = (id: string) =>
  request<any>(
    "POST",
    `/api/reservations/${id}/expire`,
    undefined,
    () => useSim.getState().expire(id, "demo-tools")
  );

// POST /api/reservations/{id}/release
export const releaseReservation = (id: string, reason?: string) =>
  request<any>(
    "POST",
    `/api/reservations/${id}/release`,
    { reason },
    () => useSim.getState().release(id, actor(), reason)
  );

// GET /api/admin/metrics
export function computeMetrics() {
  const s = useSim.getState();
  const now = Date.now();
  const active = s.requests.filter((r) => r.status === "matching" || r.status === "reserving").length;
  const icu = s.hospitals.filter((h) => h.active).reduce((t, h) => t + (h.resources.icu?.available ?? 0), 0);
  const pending = s.reservations.filter((r) => r.status === "RESERVATION_REQUESTED").length;
  const stale = s.hospitals.filter((h) => h.active && freshnessLevel((now - h.updated_at) / 1000) === "stale").length;
  const resolved = s.reservations.filter((r) => r.resolved_at && r.status !== "CANCELLED");
  const accepted = s.reservations.filter((r) => r.status === "HELD" || r.status === "RELEASED");
  const avgResp = accepted.length
    ? accepted.reduce((t, r) => t + ((r.resolved_at ?? r.starts_at) - r.starts_at), 0) / accepted.length / 1000
    : 0;
  const reasonCounts: Record<string, number> = {};
  s.reservations
    .filter((r) => r.status === "REJECTED")
    .forEach((r) =>
      (r.reject_reasons?.length ? r.reject_reasons : ["unspecified"]).forEach(
        (x) => (reasonCounts[x] = (reasonCounts[x] ?? 0) + 1)
      )
    );
  const responded = s.reservations.filter((r) => r.responded_at);
  const avgDecision = responded.length
    ? responded.reduce((t, r) => t + (r.responded_at! - r.starts_at), 0) / responded.length / 1000
    : 0;
  return {
    decline_reasons: reasonCounts,
    avg_decision_sec: Math.round(avgDecision),
    active_emergencies: active,
    available_icu: icu,
    pending_reservations: pending,
    stale_listings: stale,
    requests_today: s.requests.length,
    successful_reservations: accepted.length,
    fallbacks: s.events.filter((e) => e.type === "FALLBACK").length,
    avg_response_sec: Math.round(avgResp),
    resolved: resolved.length,
  };
}

export const getAdminMetrics = () =>
  request<any>("GET", "/api/admin/metrics", undefined, computeMetrics);

// GET /api/admin/stale
export const getStale = () =>
  request<Hospital[]>(
    "GET",
    "/api/admin/stale",
    undefined,
    () => useSim.getState().hospitals.filter((h) => h.active && freshnessLevel((Date.now() - h.updated_at) / 1000) === "stale")
  );

// GET /api/events/{request_id}
export const getRequestEvents = (requestId: string): Promise<AppEvent[]> =>
  request<AppEvent[]>(
    "GET",
    `/api/events/${requestId}`,
    undefined,
    () => useSim.getState().events.filter((e) => e.request_id === requestId).sort((a, b) => a.ts - b.ts)
  );

// ── Admin hospital & user management ──

// GET /api/admin/users
export const getAdminUsers = () =>
  request<any[]>("GET", "/api/admin/users", undefined, () => []);

// POST /api/admin/hospitals
export const createAdminHospital = (data: {
  id: string; name: string; area: string; address?: string; phone?: string;
  lat: number; lng: number; specialties?: string[]; active?: boolean;
}) => request<any>("POST", "/api/admin/hospitals", data);

// PATCH /api/admin/hospitals/:id
export const updateAdminHospital = (hospitalId: string, data: any) =>
  request<any>("PATCH", `/api/admin/hospitals/${hospitalId}`, data);

// PATCH /api/admin/hospitals/:id/activate
export const toggleAdminHospital = (hospitalId: string, active: boolean) =>
  request<any>("PATCH", `/api/admin/hospitals/${hospitalId}/activate`, { active });

// POST /api/admin/users
export const createAdminUser = (data: {
  name: string; username: string; email?: string; phone?: string;
  password: string; role: string; hospitalId?: string;
}) => request<any>("POST", "/api/admin/users", data);

// PATCH /api/admin/users/:id/active
export const toggleAdminUser = (userId: string, active: boolean) =>
  request<any>("PATCH", `/api/admin/users/${userId}/active`, { active });

// ── Hospital /me endpoints ──

// GET /api/hospitals/me
export const getMyHospital = () =>
  request<Hospital>("GET", "/api/hospitals/me", undefined, () => {
    const u = useAuth.getState().user;
    const hId = u?.hospital_id;
    return useSim.getState().hospitals.find((h) => h.id === hId) as Hospital;
  });

// PATCH /api/hospitals/me/availability
export async function patchMyAvailability(patch: Partial<Record<ResourceKey, number>>) {
  const u = useAuth.getState().user;
  const hId = u?.hospital_id ?? "h-city";
  useSim.getState().updateAvailability(hId, patch, actor());
  try {
    return await request<{ ok: boolean; updated_at: number; hospital?: Hospital }>(
      "PATCH", "/api/hospitals/me/availability", patch,
      () => ({ ok: true, updated_at: Date.now() })
    );
  } catch {
    return { ok: true, updated_at: Date.now() };
  }
}

// GET /api/hospitals/me/emergencies
export const getMyEmergencies = () =>
  request<any[]>("GET", "/api/hospitals/me/emergencies", undefined, () => []);

// GET /api/hospitals/me/reservations
export const getMyReservations = (status?: string) =>
  request<any[]>("GET", `/api/hospitals/me/reservations${status ? `?status=${status}` : ""}`, undefined, () => []);

// GET /api/hospitals/me/events
export const getMyEvents = () =>
  request<any[]>("GET", "/api/hospitals/me/events", undefined, () => []);

// ── Routing & Ambulance Location Services (Section 7, 21, 23) ──

export interface DrivingRouteResult {
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  etaMinutes: number;
  geometry: [number, number][];
  source: "osrm" | "fallback";
  status: "LIVE_ROUTE" | "FALLBACK_ROUTE";
  summary: string;
}

// GET /api/routes?fromLat=..&fromLng=..&toLat=..&toLng=..
export async function getDrivingRoute(
  fromOrParams: { lat: number; lng: number } | { fromLat: number; fromLng: number; toLat: number; toLng: number },
  maybeTo?: { lat: number; lng: number }
): Promise<DrivingRouteResult> {
  const from = "fromLat" in fromOrParams ? { lat: fromOrParams.fromLat, lng: fromOrParams.fromLng } : fromOrParams;
  const to = "toLat" in fromOrParams ? { lat: fromOrParams.toLat, lng: fromOrParams.toLng } : (maybeTo ?? from);

  const query = new URLSearchParams({
    fromLat: String(from.lat),
    fromLng: String(from.lng),
    toLat: String(to.lat),
    toLng: String(to.lng),
  });

  return request<DrivingRouteResult>(
    "GET",
    `/api/routes?${query.toString()}`,
    undefined,
    () => {
      // Deterministic fallback if offline
      const dist = Number(haversineKm(from, to).toFixed(2));
      const eta = Math.max(1, Math.round(dist * 1.5 + 2));
      return {
        distanceMeters: Math.round(dist * 1000),
        distanceKm: dist,
        durationSeconds: eta * 60,
        etaMinutes: eta,
        geometry: [
          [from.lat, from.lng],
          [to.lat, to.lng],
        ],
        source: "fallback",
        status: "FALLBACK_ROUTE",
        summary: "Direct estimate (fallback)",
      };
    },
    { auth: false }
  );
}

// POST /api/ambulances/me/location
export async function updateAmbulanceLocation(payload: {
  latitude: number;
  longitude: number;
  accuracy?: number | null | undefined;
  heading?: number | null | undefined;
  timestamp?: string | undefined;
  ambulanceId?: string | undefined;
}) {
  return request<{ ok: boolean }>(
    "POST",
    "/api/ambulances/me/location",
    payload,
    () => ({ ok: true })
  );
}


