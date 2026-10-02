export type Role = "dispatcher" | "hospital" | "admin";

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
  hospital_id: string | null;
  ambulance_id?: string;
}

export type ResourceKey = "icu" | "ventilator" | "cardiac" | "oxygen" | "burns";
export const RESOURCE_KEYS: ResourceKey[] = ["icu", "ventilator", "cardiac", "oxygen", "burns"];
/** Toggle-type resources (unit available yes/no) vs countable beds/devices */
export const TOGGLE_RESOURCES: ResourceKey[] = ["cardiac", "burns"];

export interface ResourceSlot {
  available: number;
  total: number;
}

export interface HospitalCapabilities {
  icu: boolean;
  ventilator: boolean;
  oxygen: boolean;
  cardiac: boolean;
  burns: boolean;
  trauma: boolean;
  emergencyDepartment: boolean;
}

export interface Hospital {
  id: string;
  name: string;
  area: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  hospital_type?: string;
  lat: number;
  lng: number;
  active: boolean;
  load_pct: number;
  specialties: string[];
  resources: Record<ResourceKey, ResourceSlot>;
  verified?: boolean;
  source?: string;
  source_reference?: string;
  source_verified_at?: string;
  capabilities?: HospitalCapabilities;
  is_confirmed_live?: boolean;
  availability_status?: "LIVE" | "STALE" | "VERY_STALE" | "UNKNOWN";
  updated_at: number;
  heartbeat: boolean;
}

export interface NearbyHospitalItem {
  id: string;
  name: string;
  area: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  hospitalType?: string;
  latitude: number;
  longitude: number;
  lat: number;
  lng: number;
  active?: boolean;
  specialties?: string[];
  distanceKm: number;
  etaMinutes: number;
  etaSource: "osrm" | "deterministic" | "haversine";
  verified: boolean;
  source?: string;
  sourceReference?: string;
  sourceVerifiedAt?: string;
  capabilities: HospitalCapabilities;
  availability: Record<ResourceKey, number>;
  resources: Record<ResourceKey, ResourceSlot>;
  availabilityStatus: "LIVE" | "STALE" | "VERY_STALE" | "UNKNOWN";
  isConfirmedLive: boolean;
  lastUpdatedAt: string;
  currentLoad: number;
  matchScore: number;
  scoreBreakdown: {
    resource: number;
    eta: number;
    freshness: number;
    load: number;
    distance: number;
    resourceFulfillment?: number;
  };
  markerState: "GREEN" | "YELLOW" | "RED" | "GREY";
  isRecommended: boolean;
  fulfillmentPercentage: number;
  matchType?: MatchType;
  requirementsFulfilled?: number;
  requirementsTotal?: number;
  missingResources?: string[];
  requirements?: Record<string, RequirementMatch>;
}

export type MatchType = "FULL_MATCH" | "PARTIAL_MATCH" | "UNAVAILABLE" | "STALE";

export interface RequirementMatch {
  required: boolean;
  available: boolean;
  matched: boolean;
}

export interface ScoreBreakdown {
  resourceFulfillment: number;
  eta: number;
  freshness: number;
  load: number;
  distance: number;
}

export type EmergencyType = "Trauma" | "Cardiac" | "Respiratory" | "Burns" | "Other";
export type Severity = "Critical" | "Serious" | "Stable";

export interface GeoPoint {
  lat: number;
  lng: number;
  label: string;
}

export interface EmergencyRequestInput {
  type: EmergencyType;
  age?: number;
  gender?: string;
  resources: ResourceKey[];
  severity: Severity;
  location: GeoPoint;
}

export type RequestStatus = "matching" | "reserving" | "held" | "failed" | "cancelled" | "completed";

export interface EmergencyRequest extends EmergencyRequestInput {
  id: string;
  ambulance_id: string;
  created_at: number;
  status: RequestStatus;
  reservation_ids: string[];
}

export type ReservationStatus =
  | "RESERVATION_REQUESTED"
  | "ACCEPTED"
  | "HELD"
  | "REJECTED"
  | "TIMEOUT"
  | "CANCELLED"
  | "RELEASED";

export interface Reservation {
  id: string;
  request_id: string;
  hospital_id: string;
  status: ReservationStatus;
  created_at: number;
  /** countdown starts here (fallback reservations get a short transition delay) */
  starts_at: number;
  expires_at: number;
  resolved_at?: number;
  score: number;
  attempt: number;
  held: Partial<Record<ResourceKey, number>>;
  reject_reasons?: string[];
  reject_note?: string | undefined;
  responded_at?: number;
  responded_by?: string;
  viewed_at?: number;
  arrived_at?: number;
  release_reason?: string | undefined;
}

export interface Ambulance {
  id: string;
  vehicle_number: string;
  driver_name: string;
  driver_phone: string;
  paramedic_name: string;
  paramedic_phone: string;
  crew_size: number;
  operator_name: string;
}

export type ReasonCode =
  | "ALL_RESOURCES"
  | "PARTIAL_RESOURCES"
  | "FASTEST_ETA"
  | "GOOD_ETA"
  | "FRESH_DATA"
  | "AGING_DATA"
  | "STALE_DATA"
  | "LOW_LOAD"
  | "MODERATE_LOAD"
  | "HIGH_LOAD"
  | "NEAREST"
  | "SPECIALTY_MATCH";

export interface ScoreComponents {
  resource: number;
  eta: number;
  freshness: number;
  load: number;
  distance: number;
}

export interface MatchResult {
  hospital_id: string;
  rank: number;
  total_score: number;
  components: ScoreComponents;
  eta_min: number;
  distance_km: number;
  stale: boolean;
  reasons: ReasonCode[];

  // Smart Recommendation & Discovery fields
  hospital_name?: string;
  matchType?: MatchType;
  fulfillmentPercentage?: number;
  requirementsFulfilled?: number;
  requirementsTotal?: number;
  missingResources?: string[];
  requirements?: Record<string, RequirementMatch>;
  scoreBreakdown?: ScoreBreakdown;
  isRecommended?: boolean;
}

export type EventType =
  | "REQUEST_CREATED"
  | "MATCHES_RANKED"
  | "RESERVATION_REQUESTED"
  | "ACCEPTED"
  | "HELD"
  | "REJECTED"
  | "TIMEOUT"
  | "FALLBACK"
  | "CANCELLED"
  | "RELEASED"
  | "NO_CANDIDATES"
  | "AVAILABILITY_UPDATED"
  | "LOGIN"
  | "VIEWED"
  | "ARRIVED";

export interface AppEvent {
  id: string;
  ts: number;
  request_id?: string;
  hospital_id?: string;
  actor: string;
  type: EventType;
  message: string;
  meta?: Record<string, string | number>;
}
