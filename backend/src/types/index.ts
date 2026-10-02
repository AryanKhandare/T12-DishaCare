export type Role = "dispatcher" | "hospital" | "admin";

export type ResourceKey = "icu" | "ventilator" | "cardiac" | "oxygen" | "burns";
export const RESOURCE_KEYS: ResourceKey[] = ["icu", "ventilator", "cardiac", "oxygen", "burns"];
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

export interface HospitalData {
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
  is_active?: boolean;
  verified?: boolean;
  source?: string;
  source_reference?: string;
  source_verified_at?: string;
  load_pct: number;
  specialties: string[];
  capabilities?: HospitalCapabilities;
  resources: Record<ResourceKey, ResourceSlot>;
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
  };
  markerState: "GREEN" | "YELLOW" | "RED" | "GREY";
  isRecommended: boolean;
  fulfillmentPercentage: number;
  matchType: MatchType;
  requirementsFulfilled: number;
  requirementsTotal: number;
  missingResources: string[];
  requirements: Record<string, RequirementMatch>;
}

export interface RecommendationSummary {
  hospitalId: string;
  hospitalName: string;
  matchType: MatchType;
  matchScore: number;
  distanceKm: number;
  etaMinutes: number;
  etaSource?: string;
  availabilityStatus: "LIVE" | "STALE" | "VERY_STALE" | "UNKNOWN";
  lastUpdatedAt?: string;
  requirementsFulfilled: number;
  requirementsTotal: number;
  fulfillmentPercentage: number;
  missingResources: string[];
  requirements: Record<string, RequirementMatch>;
  scoreBreakdown: {
    resourceFulfillment: number;
    eta: number;
    freshness: number;
    load: number;
    distance: number;
  };
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

export type ReservationStatus =
  | "RESERVATION_REQUESTED"
  | "ACCEPTED"
  | "HELD"
  | "REJECTED"
  | "TIMEOUT"
  | "CANCELLED"
  | "RELEASED";

export type ReasonCode =
  | "ALL_RESOURCES"
  | "FASTEST_ETA"
  | "GOOD_ETA"
  | "FRESH_DATA"
  | "AGING_DATA"
  | "STALE_DATA"
  | "LOW_LOAD"
  | "MODERATE_LOAD"
  | "HIGH_LOAD"
  | "NEAREST"
  | "SPECIALTY_MATCH"
  | "PARTIAL_RESOURCES";

export type MatchType = "FULL_MATCH" | "PARTIAL_MATCH" | "UNAVAILABLE" | "STALE";

export interface RequirementMatch {
  required: boolean;
  available: boolean;
  matched: boolean;
}

export interface ScoreComponents {
  resource: number;
  eta: number;
  freshness: number;
  load: number;
  distance: number;
}

export interface MatchResult {
  hospital_id: string;
  hospital_name?: string;
  rank: number;
  total_score: number;
  components: ScoreComponents;
  eta_min: number;
  distance_km: number;
  stale: boolean;
  reasons: ReasonCode[];

  // Dev 2 standardized contract fields
  hospitalId?: string;
  hospitalName?: string;
  distanceKm?: number;
  etaMinutes?: number;
  fulfillmentPercentage?: number;
  isFullyEligible?: boolean;
  resourceScore?: number;
  etaScore?: number;
  freshnessScore?: number;
  loadScore?: number;
  distanceScore?: number;
  finalScore?: number;
  dataAgeMinutes?: number;
  currentLoad?: number;
  lastUpdated?: string;

  // Smart Recommendation & Discovery fields
  matchType?: MatchType;
  requirementsFulfilled?: number;
  requirementsTotal?: number;
  missingResources?: string[];
  requirements?: Record<string, RequirementMatch>;
  scoreBreakdown?: {
    resourceFulfillment: number;
    eta: number;
    freshness: number;
    load: number;
    distance: number;
  };
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
  | "HOSPITAL_AVAILABILITY_UPDATED"
  | "LOGIN"
  | "VIEWED"
  | "ARRIVED"
  | "EMERGENCY_BROADCAST"
  | "HOSPITAL_RESPONSE_RECEIVED"
  | "BED_HELD"
  | "BED_RELEASED";

export interface JwtPayload {
  sub?: string;
  userId: string;
  username: string;
  role: Role;
  hospitalId: string | null;
  ambulanceId?: string;
}
