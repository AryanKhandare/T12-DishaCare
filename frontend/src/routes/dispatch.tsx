import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Compass,
  Crosshair,
  Gamepad2,
  Hospital as HospitalIcon,
  Loader2,
  Maximize2,
  MousePointerClick,
  Navigation,
  Navigation2,
  Pencil,
  Radio,
  RotateCw,
  SearchX,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/bedlink/AppHeader";
import { LazyMap, MapLegend } from "@/components/bedlink/LazyMap";
import { RequestForm } from "@/components/bedlink/RequestForm";
import { HospitalCard } from "@/components/bedlink/HospitalCard";
import { TopRecommendationCard } from "@/components/bedlink/TopRecommendationCard";
import { HospitalDrawer } from "@/components/bedlink/HospitalDrawer";
import { ReservationPanel } from "@/components/bedlink/ReservationPanel";
import { TimelineDrawer } from "@/components/bedlink/TimelineDrawer";
import { MapRecommendationCard } from "@/components/bedlink/MapRecommendationCard";
import { LiveNavigationPanel } from "@/components/bedlink/LiveNavigationPanel";
import type { GpsStatusType } from "@/components/bedlink/LiveAmbulanceMarker";
import { RESOURCE_META, StatusPill } from "@/components/bedlink/primitives";
import { requireRole } from "@/lib/guards";
import { useSim } from "@/lib/sim-store";
import { useAuth } from "@/lib/auth-store";
import { createEmergencyRequest, createReservation, getDrivingRoute, getHospitals, getNearbyHospitals, updateAmbulanceLocation } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { haversineKm, rankHospitals } from "@/lib/matching";
import { useNow } from "@/hooks/use-now";
import type { EmergencyRequestInput, Hospital, MatchResult, NearbyHospitalItem, ResourceKey } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dispatch")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dispatch workspace — DishaCare" },
      { name: "description", content: "Create an emergency request, compare real verified hospitals on the map and reserve a bed." },
      { property: "og:title", content: "Dispatch workspace — DishaCare" },
      { property: "og:description", content: "Create an emergency request, compare real verified hospitals and reserve a bed." },
    ],
  }),
  beforeLoad: () => requireRole("dispatcher"),
  component: DispatchPage,
});

type SortKey = "best" | "eta" | "load" | "fresh";

// Initial Mumbai coordinates (Andheri central corridor baseline)
const INITIAL_COORDS = { lat: 19.1235, lng: 72.8450, label: "Andheri Station, Mumbai (19.1235, 72.8450)" };

const DEFAULT_FORM: EmergencyRequestInput = {
  type: "Cardiac",
  resources: ["icu", "ventilator", "cardiac"],
  severity: "Critical",
  location: INITIAL_COORDS,
};

function DispatchPage() {
  const hospitals = useSim((s) => s.hospitals);
  const requests = useSim((s) => s.requests);
  const activeId = useSim((s) => s.activeRequestId);
  const cancelRequest = useSim((s) => s.cancelRequest);
  const completeRequest = useSim((s) => s.completeRequest);
  const user = useAuth((s) => s.user);
  const now = useNow(5000);

  const [form, setForm] = useState<EmergencyRequestInput>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [sort, setSort] = useState<SortKey>("best");
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  // GPS & Real-Time Navigation State (Section 2, 4, 5, 20)
  const [gpsStatus, setGpsStatus] = useState<GpsStatusType>("GPS_WAITING");
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsHeading, setGpsHeading] = useState<number | null>(null);
  const [lastGpsTimestamp, setLastGpsTimestamp] = useState<number>(Date.now());
  const [isManualPin, setIsManualPin] = useState(false);
  const [ambulanceCoords, setAmbulanceCoords] = useState<{ lat: number; lng: number }>(INITIAL_COORDS);

  // Map Navigation & Follow Camera State (Section 17, 33)
  const [followAmbulance, setFollowAmbulance] = useState(false);
  const [centerTrigger, setCenterTrigger] = useState(0);
  const [fitRouteTrigger, setFitRouteTrigger] = useState(0);

  // Real OSRM Driving Route State (Section 7, 8, 9, 10, 11)
  const [routeGeometry, setRouteGeometry] = useState<[number, number][]>([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [routeEtaMinutes, setRouteEtaMinutes] = useState<number | null>(null);
  const [routeSource, setRouteSource] = useState<"osrm" | "fallback">("osrm");
  const [routeStatus, setRouteStatus] = useState<"LIVE_ROUTE" | "FALLBACK_ROUTE" | "LOADING">("LIVE_ROUTE");
  const lastRoutedPos = useRef<{ lat: number; lng: number } | null>(null);
  const lastRoutedHospitalId = useRef<string | null>(null);
  const routeFetchingRef = useRef<boolean>(false);

  // Demo Simulation Mode State (Section 31 & 32)
  const [isSimulating, setIsSimulating] = useState(false);
  const isSimulatingRef = useRef(false);
  const simTimerRef = useRef<any>(null);
  const simStepRef = useRef<number>(0);

  // Backend Location Sync (Section 21)
  const lastBackendSyncPos = useRef<{ lat: number; lng: number } | null>(null);
  const lastBackendSyncTime = useRef<number>(0);

  const [radiusKm, setRadiusKm] = useState<number>(15);
  const [nearbyList, setNearbyList] = useState<NearbyHospitalItem[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const lastFetchedPos = useRef<{ lat: number; lng: number } | null>(null);

  const request = requests.find((r) => r.id === activeId) ?? null;
  const inFlow = request && request.status !== "matching";
  const showForm = !request || editing;

  // The ambulance current authoritative position
  const currentCoords = ambulanceCoords;

  // 1. Device GPS continuous watch (Section 2 & 3: Ambulance GPS Location)
  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setGpsStatus("GPS_UNAVAILABLE");
      return;
    }

    setGpsStatus("GPS_WAITING");

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = Math.round(pos.coords.accuracy);
        const heading = typeof pos.coords.heading === "number" ? Math.round(pos.coords.heading) : null;
        setGpsAccuracy(acc);
        setGpsHeading(heading);
        setLastGpsTimestamp(Date.now());

        if (isManualPin || isSimulatingRef.current) {
          // Keep manual or demo mode authoritative
          return;
        }

        // Section 4 & 5: GPS Accuracy & State
        if (acc > 120) {
          setGpsStatus("GPS_ACCURACY_LOW");
        } else {
          setGpsStatus("GPS_ACTIVE");
        }

        const newLat = Number(pos.coords.latitude.toFixed(6));
        const newLng = Number(pos.coords.longitude.toFixed(6));
        const newPos = { lat: newLat, lng: newLng };

        setAmbulanceCoords(newPos);
        setForm((prev) => ({
          ...prev,
          location: {
            lat: newLat,
            lng: newLng,
            label: `Live GPS (${newLat.toFixed(4)}, ${newLng.toFixed(4)}) ±${acc}m`,
          },
        }));
      },
      (err) => {
        console.warn("[BedLink GPS] Geolocation watch error/denied:", err.message);
        if (err.code === 1) {
          setGpsStatus("GPS_PERMISSION_DENIED");
        } else {
          setGpsStatus("GPS_UNAVAILABLE");
        }
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isManualPin]);

  // Section 28: GPS Loss detection (if no update for 18+ seconds in real GPS mode)
  useEffect(() => {
    const timer = setInterval(() => {
      if (isSimulating || isManualPin) return;
      const elapsed = Date.now() - lastGpsTimestamp;
      if (elapsed > 18000 && (gpsStatus === "GPS_ACTIVE" || gpsStatus === "GPS_ACCURACY_LOW")) {
        setGpsStatus("GPS_SIGNAL_LOST");
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [lastGpsTimestamp, gpsStatus, isSimulating, isManualPin]);

  // Section 21: Backend Synchronization throttled to 8-10s or 50m movement
  useEffect(() => {
    const nowTime = Date.now();
    const moved =
      !lastBackendSyncPos.current ||
      haversineKm(ambulanceCoords, lastBackendSyncPos.current) * 1000 >= 50;
    const timeElapsed = nowTime - lastBackendSyncTime.current >= 8000;

    if ((moved || timeElapsed) && !isSimulating) {
      lastBackendSyncPos.current = ambulanceCoords;
      lastBackendSyncTime.current = nowTime;

      updateAmbulanceLocation({
        latitude: ambulanceCoords.lat,
        longitude: ambulanceCoords.lng,
        accuracy: gpsAccuracy ?? null,
        heading: gpsHeading ?? null,
      }).catch((err) => {
        // Silent fail for background telemetry sync
      });
    }

  }, [ambulanceCoords, gpsAccuracy, gpsHeading, isSimulating]);

  // 1b. Load full corridor network of hospitals from PostgreSQL on mount so map always displays all facilities
  useEffect(() => {
    getHospitals()
      .then((all) => {
        if (Array.isArray(all) && all.length > 0) {
          useSim.setState({ hospitals: all });
        }
      })
      .catch((err) => {
        console.warn("[BedLink Dispatch] Failed to load initial network hospitals:", err);
      });
  }, []);

  // 2. Fetch real verified hospitals from GET /api/hospitals/nearby (Section 9 & 17)
  const fetchNearby = useCallback(
    async (lat: number, lng: number, rad: number, requiredRes: ResourceKey[], sev?: string) => {
      setLoadingNearby(true);
      try {
        const data = await getNearbyHospitals({
          lat,
          lng,
          radiusKm: rad,
          requiredResources: requiredRes,
          severity: sev,
        });

        if (data && Array.isArray(data.hospitals)) {
          setNearbyList(data.hospitals);

          const currentStore = useSim.getState().hospitals;
          const nearbyMap = new Map<string, NearbyHospitalItem>(data.hospitals.map((h) => [h.id, h]));

          // Map over all known hospitals in the corridor network
          const mergedHospitals: Hospital[] = currentStore.map((h) => {
            const nh = nearbyMap.get(h.id);
            if (nh) {
              return {
                ...h,
                name: nh.name,
                area: nh.area,
                address: nh.address,
                phone: nh.phone,
                hospital_type: nh.hospitalType,
                lat: nh.lat,
                lng: nh.lng,
                active: nh.markerState !== "GREY",
                load_pct: nh.currentLoad,
                resources: nh.resources,
                capabilities: nh.capabilities,
                is_confirmed_live: nh.isConfirmedLive,
                availability_status: nh.availabilityStatus,
                updated_at: new Date(nh.lastUpdatedAt).getTime(),
                markerState: nh.markerState,
                distanceKm: nh.distanceKm,
                etaMinutes: nh.etaMinutes,
                outsideRadius: false,
              } as any;
            }
            // Outside current active search radius: keep on map as verified facility
            const dist = Number(haversineKm({ lat, lng }, { lat: h.lat, lng: h.lng }).toFixed(1));
            return {
              ...h,
              markerState: "GREY",
              distanceKm: dist,
              outsideRadius: true,
            } as any;
          });

          // Ensure any hospital returned in nearby not currently in currentStore is included
          for (const nh of data.hospitals) {
            if (!mergedHospitals.some((h) => h.id === nh.id)) {
              mergedHospitals.push({
                id: nh.id,
                name: nh.name,
                area: nh.area,
                address: nh.address,
                city: nh.city,
                state: nh.state,
                pincode: nh.pincode,
                phone: nh.phone,
                hospital_type: nh.hospitalType,
                lat: nh.lat,
                lng: nh.lng,
                active: nh.markerState !== "GREY",
                load_pct: nh.currentLoad,
                specialties: (nh as any).specialties || [],
                resources: nh.resources,
                verified: nh.verified,
                source: nh.source,
                source_reference: nh.sourceReference,
                source_verified_at: nh.sourceVerifiedAt,
                capabilities: nh.capabilities,
                is_confirmed_live: nh.isConfirmedLive,
                availability_status: nh.availabilityStatus,
                updated_at: new Date(nh.lastUpdatedAt).getTime(),
                heartbeat: true,
                markerState: nh.markerState,
                distanceKm: nh.distanceKm,
                etaMinutes: nh.etaMinutes,
                outsideRadius: false,
              } as any);
            }
          }

          useSim.setState({ hospitals: mergedHospitals });
          lastFetchedPos.current = { lat, lng };
        }
      } catch (err) {
        console.warn("[BedLink Dispatch] Failed to fetch nearby hospitals from backend:", err);
      } finally {
        setLoadingNearby(false);
      }
    },
    []
  );

  // Trigger fetchNearby when location moves > 500 meters or requirements change
  useEffect(() => {
    const prev = lastFetchedPos.current;
    let shouldFetch = false;

    if (!prev) {
      shouldFetch = true;
    } else {
      // Rough distance check (~0.0045 deg is approx 500m)
      const dLat = Math.abs(currentCoords.lat - prev.lat);
      const dLng = Math.abs(currentCoords.lng - prev.lng);
      if (dLat > 0.0045 || dLng > 0.0045) {
        shouldFetch = true;
      }
    }

    if (shouldFetch) {
      fetchNearby(currentCoords.lat, currentCoords.lng, radiusKm, form.resources, form.severity);
    }
  }, [currentCoords.lat, currentCoords.lng, radiusKm, form.resources, form.severity, fetchNearby]);

  // 3. Real-Time Socket Updates (Section 8 & 18)
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleAvailabilityUpdate = (payload: any) => {
      toast.info("Real-Time Capacity Update", {
        description: `${payload.hospitalName || "Hospital"} updated bed counts via Hospital Portal. Re-ranking...`,
      });
      // Immediately refetch nearby hospitals to re-score and re-rank live
      fetchNearby(currentCoords.lat, currentCoords.lng, radiusKm, form.resources, form.severity);
    };

    socket.on("HOSPITAL_AVAILABILITY_UPDATED", handleAvailabilityUpdate);
    socket.on("AVAILABILITY_UPDATED", handleAvailabilityUpdate);

    return () => {
      socket.off("HOSPITAL_AVAILABILITY_UPDATED", handleAvailabilityUpdate);
      socket.off("AVAILABILITY_UPDATED", handleAvailabilityUpdate);
    };
  }, [currentCoords.lat, currentCoords.lng, radiusKm, form.resources, form.severity, fetchNearby]);

  // Local ranking fallback for active request
  const matches = useMemo<MatchResult[]>(() => {
    if (!request) return [];

    // 1. If backend returned matches for this request, use them directly
    const backendMatches = (request as any).matches;
    if (Array.isArray(backendMatches) && backendMatches.length > 0) {
      return backendMatches;
    }

    // 2. Rank using local ranking algorithm
    const ranked = rankHospitals(request, hospitals, now);
    if (ranked.length > 0) {
      return ranked;
    }

    // 3. Fallback: if nearbyList has hospitals, map them to MatchResult format
    if (nearbyList.length > 0) {
      return nearbyList
        .filter((h) => h.markerState !== "GREY")
        .map((h, idx) => ({
          hospital_id: h.id,
          hospital_name: h.name,
          rank: idx + 1,
          total_score: (h.matchScore ?? 50) / 100,
          components: {
            resource: (h.scoreBreakdown?.resource ?? 50) / 100,
            eta: (h.scoreBreakdown?.eta ?? 50) / 100,
            freshness: (h.scoreBreakdown?.freshness ?? 50) / 100,
            load: (h.scoreBreakdown?.load ?? 50) / 100,
            distance: (h.scoreBreakdown?.distance ?? 50) / 100,
          },
          eta_min: h.etaMinutes,
          distance_km: h.distanceKm,
          stale: h.availabilityStatus === "STALE" || h.availabilityStatus === "VERY_STALE",
          reasons: [
            h.fulfillmentPercentage === 100 ? "ALL_RESOURCES" : "PARTIAL_RESOURCES",
            h.etaMinutes < 15 ? "GOOD_ETA" : "NEAREST",
            h.availabilityStatus === "LIVE" ? "FRESH_DATA" : "AGING_DATA",
          ],
          matchType: h.matchType || (h.fulfillmentPercentage === 100 ? "FULL_MATCH" : "PARTIAL_MATCH"),
          fulfillmentPercentage: h.fulfillmentPercentage ?? 50,
          requirementsFulfilled: h.requirementsFulfilled ?? 1,
          requirementsTotal: h.requirementsTotal ?? 1,
          missingResources: (h.missingResources as any) ?? [],
          requirements: (h.requirements as any) ?? {},
          scoreBreakdown: {
            resourceFulfillment: h.scoreBreakdown?.resource ?? 50,
            eta: h.scoreBreakdown?.eta ?? 50,
            freshness: h.scoreBreakdown?.freshness ?? 50,
            load: h.scoreBreakdown?.load ?? 50,
            distance: h.scoreBreakdown?.distance ?? 50,
          },
          isRecommended: idx === 0,
        }));
    }

    return [];
  }, [request, hospitals, now, nearbyList]);

  const sorted = useMemo(() => {
    const m = [...matches];
    if (sort === "eta") m.sort((a, b) => a.eta_min - b.eta_min);
    if (sort === "load") m.sort((a, b) => hosp(a).load_pct - hosp(b).load_pct);
    if (sort === "fresh") m.sort((a, b) => hosp(b).updated_at - hosp(a).updated_at);
    return m;
    function hosp(x: MatchResult) {
      return hospitals.find((h) => h.id === x.hospital_id) || (nearbyList.find((h) => h.id === x.hospital_id) as any) || ({ load_pct: 50, updated_at: 0 } as any);
    }
  }, [matches, sort, hospitals, nearbyList]);

  const ranks = Object.fromEntries(matches.map((m) => [m.hospital_id, m.rank]));
  const reservations = useSim((s) => s.reservations);
  const currentRes = request ? reservations.filter((r) => r.request_id === request.id).sort((a, b) => b.attempt - a.attempt)[0] : undefined;
  const mapSelected = inFlow && currentRes ? currentRes.hospital_id : selected ?? matches[0]?.hospital_id ?? null;

  // Section 6 & 24: Active Destination Hospital for Live Routing
  const activeDestinationHospital = useMemo(() => {
    const targetId = mapSelected;
    if (!targetId) return null;
    return hospitals.find((h) => h.id === targetId) || (nearbyList.find((h) => h.id === targetId) as any) || null;
  }, [mapSelected, hospitals, nearbyList]);

  // Section 7, 8, 9, 10, 11: Route fetching & Live ETA recalculation
  const fetchRoute = useCallback(async (fromLat: number, fromLng: number, toHosp: Hospital) => {
    if (routeFetchingRef.current) return;
    routeFetchingRef.current = true;
    setRouteStatus("LOADING");

    try {
      const res = await getDrivingRoute({
        fromLat,
        fromLng,
        toLat: toHosp.lat,
        toLng: toHosp.lng,
      });

      setRouteGeometry(res.geometry);
      setRouteDistanceKm(res.distanceKm);
      setRouteEtaMinutes(res.etaMinutes);
      setRouteSource(res.source);
      setRouteStatus(res.source === "osrm" ? "LIVE_ROUTE" : "FALLBACK_ROUTE");
      lastRoutedPos.current = { lat: fromLat, lng: fromLng };
      lastRoutedHospitalId.current = toHosp.id;
    } catch (err) {
      console.warn("[BedLink Route] Failed to fetch driving route:", err);
      // Section 29: Deterministic fallback
      const dist = Number(haversineKm({ lat: fromLat, lng: fromLng }, toHosp).toFixed(1));
      const eta = Math.max(1, Math.round(dist * 1.6 + 2));
      setRouteDistanceKm(dist);
      setRouteEtaMinutes(eta);
      setRouteSource("fallback");
      setRouteStatus("FALLBACK_ROUTE");
    } finally {
      routeFetchingRef.current = false;
    }
  }, []);

  // Section 10: Rerouting on destination change or when ambulance moves >= 100m
  useEffect(() => {
    if (!activeDestinationHospital) {
      setRouteGeometry([]);
      setRouteDistanceKm(null);
      setRouteEtaMinutes(null);
      lastRoutedHospitalId.current = null;
      lastRoutedPos.current = null;
      return;
    }

    const hospChanged = lastRoutedHospitalId.current !== activeDestinationHospital.id;
    const distFromLast = lastRoutedPos.current
      ? haversineKm(ambulanceCoords, lastRoutedPos.current) * 1000
      : 999999;

    if (hospChanged || distFromLast >= 100) {
      fetchRoute(ambulanceCoords.lat, ambulanceCoords.lng, activeDestinationHospital);
    } else {
      // Continuous live distance & ETA recalculation while moving (Section 11)
      const directKm = haversineKm(ambulanceCoords, activeDestinationHospital);
      const estKm = Number((directKm * 1.25).toFixed(1));
      const estEta = Math.max(1, Math.round(estKm * 1.5 + 1));
      setRouteDistanceKm(estKm);
      setRouteEtaMinutes(estEta);
    }
  }, [ambulanceCoords.lat, ambulanceCoords.lng, activeDestinationHospital, fetchRoute]);

  // Section 31 & 32: Hackathon Demo Simulation Mode
  const startSimulation = useCallback(() => {
    if (!activeDestinationHospital) {
      toast.error("Select a destination hospital first to simulate driving.");
      return;
    }

    setIsSimulating(true);
    isSimulatingRef.current = true;
    setGpsStatus("DEMO_SIMULATION");
    setFollowAmbulance(true);
    toast.info("Demo Simulation Started", {
      description: "Ambulance is driving along road route towards destination.",
    });

    let waypoints: [number, number][] = [];
    if (routeGeometry.length > 6) {
      const stride = Math.max(1, Math.floor(routeGeometry.length / 30));
      for (let i = 0; i < routeGeometry.length; i += stride) {
        const pt = routeGeometry[i];
        if (pt) waypoints.push(pt);
      }
      const lastPt = routeGeometry[routeGeometry.length - 1];
      if (lastPt && waypoints[waypoints.length - 1] !== lastPt) {
        waypoints.push(lastPt);
      }
    } else {
      const steps = 25;
      const start = ambulanceCoords;
      const end = activeDestinationHospital;
      for (let i = 0; i <= steps; i++) {
        const frac = i / steps;
        waypoints.push([
          start.lat + (end.lat - start.lat) * frac,
          start.lng + (end.lng - start.lng) * frac,
        ]);
      }
    }

    simStepRef.current = 0;
    if (simTimerRef.current) clearInterval(simTimerRef.current);

    simTimerRef.current = setInterval(() => {
      simStepRef.current += 1;
      if (simStepRef.current >= waypoints.length) {
        clearInterval(simTimerRef.current);
        toast.success("Ambulance Arrived at Hospital!", {
          description: `Reached ${activeDestinationHospital.name}`,
        });
        return;
      }

      const curWp = waypoints[simStepRef.current];
      const prevWp = waypoints[simStepRef.current - 1];
      if (!curWp) return;

      let heading: number | null = null;
      if (prevWp && curWp) {
        const dLat = curWp[0] - prevWp[0];
        const dLng = curWp[1] - prevWp[1];
        heading = Math.round((Math.atan2(dLng, dLat) * 180) / Math.PI);
        if (heading < 0) heading += 360;
      }

      setGpsHeading(heading);
      setAmbulanceCoords({ lat: curWp[0], lng: curWp[1] });
    }, 1500);

  }, [activeDestinationHospital, routeGeometry, ambulanceCoords]);

  const stopSimulation = useCallback(() => {
    setIsSimulating(false);
    isSimulatingRef.current = false;
    if (simTimerRef.current) clearInterval(simTimerRef.current);
    setGpsStatus(isManualPin ? "MANUAL_OVERRIDE" : "GPS_ACTIVE");
    toast.info("Demo Simulation Ended", {
      description: isManualPin ? "Reverted to manual position." : "Reverted to live GPS.",
    });
  }, [isManualPin]);

  const toggleSimulation = useCallback(() => {
    if (isSimulating) {
      stopSimulation();
    } else {
      startSimulation();
    }
  }, [isSimulating, startSimulation, stopSimulation]);

  // Section 30: Manual Map Override
  const handleMapClick = (lat: number, lng: number) => {
    if (isSimulating) {
      stopSimulation();
    }
    setIsManualPin(true);
    setGpsStatus("MANUAL_OVERRIDE");
    const pinnedCoords = {
      lat: Number(lat.toFixed(5)),
      lng: Number(lng.toFixed(5)),
    };
    setAmbulanceCoords(pinnedCoords);
    setForm((prev) => ({
      ...prev,
      location: {
        lat: pinnedCoords.lat,
        lng: pinnedCoords.lng,
        label: `Manual Pin (${pinnedCoords.lat.toFixed(4)}, ${pinnedCoords.lng.toFixed(4)})`,
      },
    }));
    fetchNearby(pinnedCoords.lat, pinnedCoords.lng, radiusKm, form.resources, form.severity);
    toast.info("Manual ambulance position set", {
      description: "Recalculating driving route and nearby hospital rankings...",
    });
  };

  const resumeLiveGps = () => {
    setIsManualPin(false);
    setGpsStatus("GPS_WAITING");
    toast.info("Resuming Live Device GPS", {
      description: "Listening for browser geolocation coordinates...",
    });
  };

  const submit = async () => {
    if (!form.resources.length) toast("No resources selected — matching on general capability");
    setSubmitting(true);
    try {
      await createEmergencyRequest(form);
      setEditing(false);
      setSelected(null);
      setRailOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const reserve = async (hospitalId: string) => {
    if (!request) return;
    setRequesting(true);
    setDrawer(null);
    setSelected(null);
    try {
      await createReservation(request.id, hospitalId);
    } finally {
      setRequesting(false);
    }
  };

  const drawerHospital = hospitals.find((h) => h.id === drawer) ?? null;
  const drawerMatch = matches.find((m) => m.hospital_id === drawer) ?? null;

  // Selected hospital for Recommendation Card popup (Section 15)
  const selectedHospitalItem = useMemo(() => {
    if (!selected) return null;
    const foundInNearby = nearbyList.find((h) => h.id === selected);
    if (foundInNearby) return foundInNearby;
    const found = hospitals.find((h) => h.id === selected);
    if (!found) return null;
    const dist = (found as any).distanceKm ?? Number(haversineKm(currentCoords, found).toFixed(1));
    return {
      id: found.id,
      name: found.name,
      area: found.area,
      address: found.address || found.area,
      city: found.city || "Mumbai",
      state: found.state || "Maharashtra",
      pincode: found.pincode || "400001",
      phone: found.phone || "",
      hospitalType: found.hospital_type || "Multispeciality",
      lat: found.lat,
      lng: found.lng,
      markerState: (found as any).markerState || "GREY",
      currentLoad: found.load_pct,
      distanceKm: dist,
      etaMinutes: Math.round(dist * 1.5 + 2),
      resources: found.resources,
      capabilities: found.capabilities || { icu: true, ventilator: true, oxygen: true, cardiac: true, burns: false, trauma: true, emergencyDepartment: true },
      isConfirmedLive: found.is_confirmed_live ?? false,
      availabilityStatus: found.availability_status || "LIVE",
      lastUpdatedAt: new Date(found.updated_at).toISOString(),
      matchType: "PARTIAL_MATCH",
      fulfillmentPercentage: 50,
      requirementsFulfilled: 0,
      requirementsTotal: form.resources.length,
      missingResources: form.resources,
      requirements: {},
      isRecommended: false,
      outsideRadius: true,
    } as any;
  }, [selected, nearbyList, hospitals, currentCoords, form.resources]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <AppHeader
        hideDemoBadge
        hideDemoTools
        left={
          request && !showForm ? (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="hidden items-center gap-2 overflow-hidden lg:flex">
              <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">{request.ambulance_id}</span>
              <span className="text-sm font-semibold">{request.type}</span>
              <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold", request.severity === "Critical" ? "bg-destructive/10 text-destructive" : request.severity === "Serious" ? "bg-warning/15 text-warning-foreground" : "bg-success/10 text-success")}>
                {request.severity}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {request.resources.map((k) => RESOURCE_META[k].short).join(" · ")} · {request.location.label}
              </span>
              <StatusPill status={request.status} />
            </motion.div>
          ) : null
        }
      />

      <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Left rail */}
        <motion.aside
          animate={{ width: railOpen ? 450 : 56 }}
          transition={{ type: "spring", stiffness: 300, damping: 34 }}
          className="relative z-[450] hidden shrink-0 border-r bg-card md:block"
        >
          <button
            onClick={() => setRailOpen((o) => !o)}
            aria-label={railOpen ? "Collapse navigation panel" : "Expand navigation panel"}
            className="absolute -right-4 top-4 z-[460] grid size-8 place-items-center rounded-full border border-border bg-card text-foreground shadow-md hover:bg-muted transition-all cursor-pointer"
            title={railOpen ? "Collapse navigation panel" : "Expand navigation panel"}
          >
            {railOpen ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
          {railOpen ? (
            <div className="h-full overflow-y-auto p-5 sm:p-6">
              {showForm ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8.5 shrink-0 rounded-lg border border-border/80 bg-muted/60 text-foreground hover:bg-muted transition cursor-pointer shadow-xs"
                        onClick={() => setRailOpen(false)}
                        title="Close navigation panel"
                        aria-label="Close navigation panel"
                      >
                        <ChevronLeft className="size-5" />
                      </Button>
                      <h2 className="text-xl font-bold truncate">Create Emergency Request</h2>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1 shrink-0"
                      onClick={() => fetchNearby(currentCoords.lat, currentCoords.lng, radiusKm, form.resources, form.severity)}
                      disabled={loadingNearby}
                      title="Refresh nearby hospitals"
                    >
                      <RotateCw className={cn("size-3", loadingNearby && "animate-spin")} />
                      Refresh
                    </Button>
                  </div>
                  <p className="mb-4 text-xs text-muted-foreground">
                    Ambulance {user?.ambulance_id ?? "A12"} · {nearbyList.length} verified hospitals within {radiusKm}km
                  </p>

                  {/* Search Radius Control */}
                  <div className="mb-4 rounded-xl border bg-muted/40 p-2.5 text-xs">
                    <div className="flex justify-between font-medium">
                      <span>Search Radius</span>
                      <span className="font-bold text-primary">{radiusKm} km</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="5"
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(Number(e.target.value))}
                      className="w-full mt-2 accent-primary cursor-pointer"
                    />
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[10px]">
                      {[10, 15, 25, 35, 50].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRadiusKm(r)}
                          className={cn(
                            "rounded px-1.5 py-0.5 font-medium transition",
                            radiusKm === r ? "bg-primary text-primary-foreground font-semibold" : "bg-card border hover:bg-muted"
                          )}
                        >
                          {r === 50 ? "Full Corridor (50km)" : `${r}km`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <RequestForm value={form} onChange={setForm} onSubmit={submit} submitting={submitting} />
                  {editing && (
                    <Button variant="ghost" className="mt-2 w-full" onClick={() => setEditing(false)}>
                      Back to results
                    </Button>
                  )}
                </>
              ) : (
                request && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8.5 shrink-0 rounded-lg border border-border/80 bg-muted/60 text-foreground hover:bg-muted transition cursor-pointer shadow-xs"
                          onClick={() => setRailOpen(false)}
                          title="Close navigation panel"
                          aria-label="Close navigation panel"
                        >
                          <ChevronLeft className="size-5" />
                        </Button>
                        <h2 className="text-xl font-bold truncate">Active request</h2>
                      </div>
                    </div>
                    <SummaryCard request={request} />
                    {!inFlow && (
                      <Button variant="outline" className="h-11 w-full" onClick={() => setEditing(true)}>
                        <Pencil className="size-4" /> Edit request
                      </Button>
                    )}
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 pt-14">
              <button onClick={() => setRailOpen(true)} className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary" aria-label="Open request form">
                <Pencil className="size-4" />
              </button>
            </div>
          )}
        </motion.aside>

        {/* Mobile form */}
        {showForm && (
          <div className="border-b bg-card p-4 md:hidden">
            <RequestForm value={form} onChange={setForm} onSubmit={submit} submitting={submitting} />
          </div>
        )}

        {/* Map */}
        <section className="relative h-full min-h-[520px] min-w-0 flex-1 overflow-hidden">
          <LazyMap
            hospitals={hospitals}
            ranks={request ? ranks : undefined}
            ambulance={ambulanceCoords}
            selectedId={mapSelected}
            highlightId={hover}
            onSelect={(id) => {
              setSelected(id);
            }}
            onHover={setHover}
            onMapClick={handleMapClick}
            fitKey={request?.id ? `req-${request.id}` : undefined}
            routeGeometry={routeGeometry}
            routeDistanceKm={routeDistanceKm}
            routeEtaMinutes={routeEtaMinutes}
            ambulanceAccuracy={gpsAccuracy}
            ambulanceHeading={gpsHeading}
            gpsStatus={gpsStatus}
            followAmbulance={followAmbulance}
            centerTrigger={centerTrigger}
            fitRouteTrigger={fitRouteTrigger}
            onUserDrag={() => {
              // Free pan exploration per Section 17 & 18
            }}
          />

          <MapLegend className="absolute bottom-3 left-3 z-[400] pointer-events-auto" />

          {/* Quick Map Controls Floating Toolbar (Section 17, 33) */}
          <div className="absolute right-3.5 top-3.5 z-[400] flex flex-col gap-1.5 pointer-events-auto">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => setCenterTrigger((c) => c + 1)}
              className="size-9 rounded-xl bg-card/95 shadow-md border hover:bg-card transition"
              title="Center Map on Ambulance"
            >
              <Crosshair className="size-4 text-primary" />
            </Button>
            <Button
              type="button"
              variant={followAmbulance ? "default" : "secondary"}
              size="icon"
              onClick={() => setFollowAmbulance((f) => !f)}
              className={cn(
                "size-9 rounded-xl shadow-md border transition",
                followAmbulance ? "bg-primary text-primary-foreground" : "bg-card/95 hover:bg-card"
              )}
              title={followAmbulance ? "Follow Ambulance: ON (Click to disable)" : "Follow Ambulance: OFF (Click to follow)"}
            >
              <Navigation2 className={cn("size-4", followAmbulance && "fill-current animate-pulse")} />
            </Button>
            {activeDestinationHospital && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={() => setFitRouteTrigger((c) => c + 1)}
                className="size-9 rounded-xl bg-card/95 shadow-md border hover:bg-card transition"
                title="Fit Route (Ambulance + Hospital Destination)"
              >
                <Compass className="size-4 text-primary" />
              </Button>
            )}
            <Button
              type="button"
              variant={isSimulating ? "default" : "secondary"}
              size="icon"
              onClick={toggleSimulation}
              className={cn(
                "size-9 rounded-xl shadow-md border transition",
                isSimulating ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-card/95 hover:bg-card"
              )}
              title={isSimulating ? "Stop Demo Simulation" : "Start Hackathon Demo Simulation"}
            >
              <Gamepad2 className="size-4" />
            </Button>
          </div>

          {/* Top Status & Manual Override Guidance Banner (Section 4, 5, 30, 31) */}
          <div className="absolute left-1/2 top-3 z-[400] flex -translate-x-1/2 items-center gap-2 rounded-full border bg-card/95 px-3.5 py-1.5 text-xs font-medium shadow-card backdrop-blur pointer-events-auto">
            {isSimulating ? (
              <>
                <span className="flex size-2 rounded-full bg-orange-500 animate-ping" />
                <span className="font-bold text-orange-600 dark:text-orange-400">🟠 DEMO SIMULATION</span>
                <span className="text-muted-foreground">· Moving towards hospital</span>
                <button
                  type="button"
                  onClick={stopSimulation}
                  className="ml-1 rounded px-1.5 py-0.5 text-[11px] font-bold bg-muted hover:bg-muted/80 text-foreground"
                >
                  Stop
                </button>
              </>
            ) : isManualPin ? (
              <>
                <MousePointerClick className="size-3.5 text-purple-600" />
                <span className="font-bold text-purple-600 dark:text-purple-400">📍 Manual Pin Override</span>
                <span className="text-muted-foreground">· Click map to reposition</span>
                <button
                  type="button"
                  onClick={resumeLiveGps}
                  className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary hover:bg-primary/20 transition"
                >
                  Resume Live GPS
                </button>
              </>
            ) : gpsStatus === "GPS_SIGNAL_LOST" ? (
              <>
                <span className="flex size-2 rounded-full bg-amber-500" />
                <span className="font-bold text-amber-600 dark:text-amber-400">🟡 GPS Signal Lost</span>
                <span className="text-muted-foreground">· Holding last known location</span>
              </>
            ) : gpsStatus === "GPS_ACCURACY_LOW" ? (
              <>
                <span className="flex size-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="font-semibold text-amber-700 dark:text-amber-300">
                  GPS Low Accuracy (±{gpsAccuracy}m)
                </span>
                <span className="text-muted-foreground">· Click map to override</span>
              </>
            ) : gpsStatus === "GPS_PERMISSION_DENIED" || gpsStatus === "GPS_UNAVAILABLE" ? (
              <>
                <span className="flex size-2 rounded-full bg-rose-500" />
                <span className="font-bold text-rose-600 dark:text-rose-400">GPS Unavailable</span>
                <span className="text-muted-foreground">· Click anywhere on map to pin ambulance</span>
              </>
            ) : (
              <>
                <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Live GPS Active {gpsAccuracy ? `(±${gpsAccuracy}m)` : ""}
                </span>
                <span className="text-muted-foreground">· Click map anytime to override pin</span>
              </>
            )}
          </div>

          {/* Real-Time Navigation HUD Panel (Section 26: UI Design) */}
          <AnimatePresence>
            {activeDestinationHospital && (
              <LiveNavigationPanel
                hospitalName={activeDestinationHospital.name}
                hospitalArea={activeDestinationHospital.area}
                distanceKm={routeDistanceKm ?? (activeDestinationHospital as any).distanceKm ?? 0}
                etaMinutes={routeEtaMinutes ?? (activeDestinationHospital as any).etaMinutes ?? 0}
                routeStatus={routeStatus}
                routeSource={routeSource}
                gpsStatus={gpsStatus}
                gpsAccuracy={gpsAccuracy}
                lastGpsUpdateSec={Math.round((Date.now() - lastGpsTimestamp) / 1000)}
                followAmbulance={followAmbulance}
                onToggleFollow={() => setFollowAmbulance((f) => !f)}
                onCenterAmbulance={() => setCenterTrigger((c) => c + 1)}
                onFitRoute={() => setFitRouteTrigger((c) => c + 1)}
                isSimulating={isSimulating}
                onToggleSimulation={toggleSimulation}
                onClose={() => {
                  if (!request) setSelected(null);
                }}
              />
            )}
          </AnimatePresence>

          {/* Map Recommendation Card Popup (Section 15) */}
          <AnimatePresence>
            {selectedHospitalItem && !activeDestinationHospital && (
              <MapRecommendationCard
                hospital={selectedHospitalItem}
                onClose={() => setSelected(null)}
                onViewDetails={() => {
                  setDrawer(selectedHospitalItem.id);
                  setSelected(null);
                }}
                onSelect={() => {
                  if (request) {
                    reserve(selectedHospitalItem.id);
                  } else {
                    toast.info(`Hospital selected: ${selectedHospitalItem.name}`, {
                      description: "Create an emergency request to complete reservation.",
                    });
                    setDrawer(selectedHospitalItem.id);
                  }
                }}
                disabled={requesting}
              />
            )}
          </AnimatePresence>
        </section>

        {/* Right panel */}
        <aside className="relative flex w-full shrink-0 flex-col border-l bg-card md:w-[420px]">
          <AnimatePresence mode="wait">
            {inFlow && request ? (
              <motion.div key="res" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} className="h-full">
                <ReservationPanel
                  request={request}
                  onCancel={() => {
                    cancelRequest(request.id, user?.username ?? "dispatcher");
                    toast("Request cancelled");
                  }}
                  onTimeline={() => setTimeline(request.id)}
                  onDirections={(hid) => {
                    const h = hospitals.find((x) => x.id === hid);
                    if (h) window.open(`https://www.google.com/maps/dir/?api=1&origin=${request.location.lat},${request.location.lng}&destination=${h.lat},${h.lng}`, "_blank", "noopener");
                  }}
                  onNew={() => {
                    completeRequest(request.id, user?.username ?? "dispatcher");
                    setRailOpen(true);
                    setForm(DEFAULT_FORM);
                  }}
                />
              </motion.div>
            ) : request ? (
              <motion.div key="list" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="flex h-full min-h-0 flex-col">
                <div className="flex items-center justify-between gap-2 border-b px-4 py-3 bg-card/60 backdrop-blur-sm">
                  <div>
                    <h2 className="font-bold text-sm md:text-base">Hospital Recommendations</h2>
                    <p className="text-xs text-muted-foreground tnum">
                      {submitting
                        ? "Evaluating nearby hospitals..."
                        : matches.length === 0
                        ? "0 hospitals within search radius"
                        : sorted[0]?.matchType === "FULL_MATCH"
                        ? `Full match identified · ${matches.length} candidates`
                        : `Best partial match · ${matches.length} candidates`}
                    </p>
                  </div>
                  <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                    <SelectTrigger className="h-9 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="best">Best Match</SelectItem>
                      <SelectItem value="eta">ETA</SelectItem>
                      <SelectItem value="load">Load</SelectItem>
                      <SelectItem value="fresh">Freshness</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto bg-muted/40 p-3">
                  {/* Section 14: Loading state when finding available hospitals */}
                  {submitting && (
                    <div className="flex flex-col items-center py-10 px-4 text-center space-y-3">
                      <Loader2 className="size-9 animate-spin text-primary" />
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Finding nearby hospitals...</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Calculating distance, ETA, resource fulfillment & real-time load
                        </p>
                      </div>
                      <div className="w-full space-y-2.5 pt-2">
                        {[0, 1, 2].map((i) => (
                          <Skeleton key={i} className="h-44 rounded-2xl" />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section 16: True No-Hospital State (no hospitals in radius or no confirmed availability) */}
                  {!submitting && matches.length === 0 && (
                    <div className="flex flex-col items-center py-12 px-4 text-center">
                      <div className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive mb-3">
                        <SearchX className="size-7" />
                      </div>
                      <h3 className="text-base font-bold text-foreground uppercase tracking-wide">
                        No Hospital Available
                      </h3>
                      <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                        No participating hospitals within <strong className="font-semibold text-foreground">{radiusKm} km</strong> can fulfill any of the requested resources.
                      </p>
                      <div className="mt-5 flex flex-col gap-2 w-full max-w-xs">
                        <Button
                          className="w-full gap-1.5 font-semibold text-xs h-10"
                          onClick={() => {
                            const nextRad = Math.min(50, radiusKm + 10);
                            setRadiusKm(nextRad);
                            fetchNearby(currentCoords.lat, currentCoords.lng, nextRad, form.resources, form.severity);
                            toast.info(`Search radius expanded to ${nextRad} km`);
                          }}
                        >
                          <Maximize2 className="size-3.5" /> Expand Search Radius (+10 km)
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full gap-1.5 text-xs h-10"
                          onClick={() => {
                            setEditing(true);
                            setRailOpen(true);
                          }}
                        >
                          <Pencil className="size-3.5" /> Edit Requirements
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Section 11 & 15: Recommendations & Alternatives */}
                  {!submitting && sorted.length > 0 && (() => {
                    const topMatch = sorted[0];
                    if (!topMatch) return null;
                    const topHospital = hospitals.find((h) => h.id === topMatch.hospital_id) || (nearbyList.find((h) => h.id === topMatch.hospital_id) as any);
                    const isFullMatch = topMatch.matchType === "FULL_MATCH";
                    const alternatives = sorted.slice(1);

                    return (
                      <div className="space-y-3">
                        {/* Section 15: No Full Match State banner if top is partial */}
                        {!isFullMatch && (
                          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 shadow-sm">
                            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                              <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                              <span>No Full Match Found</span>
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed">
                              No hospital has all requested resources. The best available partial matches are recommended below with real-time capability breakdowns.
                            </p>
                          </div>
                        )}

                        {/* Section 11: Top Recommendation Card */}
                        {topHospital && (
                          <TopRecommendationCard
                            hospital={topHospital}
                            match={topMatch}
                            onSelect={() => reserve(topHospital.id)}
                            onViewDetails={() => setDrawer(topHospital.id)}
                            disabled={requesting}
                          />
                        )}

                        {/* Alternatives List */}
                        {alternatives.length > 0 && (
                          <div className="pt-2">
                            <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              <span>Alternatives ({alternatives.length})</span>
                              <span className="text-[10px] font-normal lowercase">by rank</span>
                            </div>
                            <div className="space-y-3">
                              {alternatives.map((m) => {
                                const h = hospitals.find((x) => x.id === m.hospital_id) || (nearbyList.find((x) => x.id === m.hospital_id) as any);
                                if (!h) return null;
                                return (
                                  <HospitalCard
                                    key={m.hospital_id}
                                    hospital={h}
                                    match={m}
                                    required={request.resources}
                                    isTop={false}
                                    selected={mapSelected === m.hospital_id}
                                    disabled={requesting}
                                    onSelect={() => setSelected(m.hospital_id)}
                                    onOpen={() => setDrawer(m.hospital_id)}
                                    onRequest={() => reserve(m.hospital_id)}
                                    onHover={(on) => setHover(on ? m.hospital_id : null)}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full flex-col items-center justify-center p-8 text-center">
                <div className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <HospitalIcon className="size-8" />
                </div>
                <h2 className="mt-4 text-lg font-bold">Real-Time Hospital Map</h2>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{nearbyList.length} verified hospitals</span> around your ambulance location from PostgreSQL.
                </p>
                <div className="mt-4 flex flex-col gap-2 w-full max-w-xs">
                  <Button className="w-full font-semibold" onClick={() => setRailOpen(true)}>
                    <Pencil className="size-4 mr-1.5" /> Create Emergency Request
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-xs text-muted-foreground"
                    onClick={() => fetchNearby(currentCoords.lat, currentCoords.lng, radiusKm, form.resources, form.severity)}
                  >
                    <RotateCw className="size-3.5 mr-1.5" /> Refresh Nearby Hospitals
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>

      <HospitalDrawer
        hospital={drawerHospital}
        match={drawerMatch}
        open={!!drawer}
        onOpenChange={(o) => !o && setDrawer(null)}
        canRequest={!inFlow && !requesting}
        onRequest={drawerHospital ? () => reserve(drawerHospital.id) : undefined}
        onViewMap={() => {
          setSelected(drawer);
          setDrawer(null);
        }}
      />
      <TimelineDrawer requestId={timeline} onOpenChange={(o) => !o && setTimeline(null)} />
    </div>
  );
}

function SummaryCard({ request }: { request: NonNullable<ReturnType<typeof useSim.getState>["requests"][number]> }) {
  return (
    <div className="space-y-3 rounded-2xl border bg-muted/40 p-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">{request.type}</span>
        <StatusPill status={request.status} />
      </div>
      <Row k="Severity" v={request.severity} />
      <Row k="Ambulance" v={request.ambulance_id} />
      {request.age !== undefined && <Row k="Age" v={String(request.age)} />}
      {request.gender && <Row k="Gender" v={request.gender} />}
      <Row k="Location" v={request.location.label} />
      <div className="flex flex-wrap gap-1.5 pt-1">
        {request.resources.map((k) => {
          const M = RESOURCE_META[k];
          return (
            <span key={k} className="inline-flex items-center gap-1 rounded-lg bg-card px-2 py-1 text-xs font-medium">
              <M.icon className="size-3.5 text-primary" /> {M.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}
