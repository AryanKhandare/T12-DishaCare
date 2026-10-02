import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { MUMBAI_CENTER } from "@/lib/seed";
import type { Hospital } from "@/lib/types";
import { hospitalAvailability } from "./primitives";
import { useNow } from "@/hooks/use-now";
import { LiveAmbulanceMarker, type GpsStatusType } from "./LiveAmbulanceMarker";

export interface MapViewProps {
  hospitals: Hospital[];
  ranks?: Record<string, number> | undefined;
  ambulance?: { lat: number; lng: number } | null;
  selectedId?: string | null;
  highlightId?: string | null;
  onSelect?: (id: string) => void;
  onMapClick?: ((lat: number, lng: number) => void) | undefined;
  onHover?: (id: string | null) => void;
  dark?: boolean;
  fitKey?: string | undefined;

  // Real-Time Ambulance Navigation additions
  routeGeometry?: [number, number][] | undefined;
  routeDistanceKm?: number | null | undefined;
  routeEtaMinutes?: number | null | undefined;
  ambulanceAccuracy?: number | null | undefined;
  ambulanceHeading?: number | null | undefined;
  gpsStatus?: GpsStatusType | undefined;
  followAmbulance?: boolean | undefined;
  centerTrigger?: number | undefined;
  fitRouteTrigger?: number | undefined;
  onUserDrag?: (() => void) | undefined;
}

const COLOR = {
  available: "var(--success)",
  limited: "var(--warning)",
  occupied: "var(--destructive)",
  stale: "var(--muted-foreground)",
};

const MARKER_COLORS: Record<string, string> = {
  GREEN: "#10B981",
  YELLOW: "#F59E0B",
  RED: "#EF4444",
  GREY: "#6B7280",
};

function ClickHandler({ onMapClick }: { onMapClick?: ((lat: number, lng: number) => void) | undefined }) {
  useMapEvents({ click: (e) => onMapClick?.(e.latlng.lat, e.latlng.lng) });
  return null;
}

function MapController({
  ambulance,
  selectedHospital,
  routeGeometry,
  followAmbulance,
  centerTrigger,
  fitRouteTrigger,
  onUserDrag,
}: {
  ambulance?: { lat: number; lng: number } | null | undefined;
  selectedHospital?: Hospital | null | undefined;
  routeGeometry?: [number, number][] | undefined;
  followAmbulance?: boolean | undefined;
  centerTrigger?: number | undefined;
  fitRouteTrigger?: number | undefined;
  onUserDrag?: (() => void) | undefined;
}) {
  const map = useMap();

  // Listen to drag events to allow free manual map exploration
  useMapEvents({
    dragstart: () => {
      onUserDrag?.();
    },
  });

  // Follow ambulance when active and position updates (Section 17: Auto Map Follow Mode)
  useEffect(() => {
    if (followAmbulance && ambulance) {
      map.panTo([ambulance.lat, ambulance.lng], { animate: true, duration: 0.6 });
    }
  }, [ambulance?.lat, ambulance?.lng, followAmbulance, map]);

  // Center on ambulance trigger
  useEffect(() => {
    if (centerTrigger && ambulance) {
      map.flyTo([ambulance.lat, ambulance.lng], Math.max(map.getZoom(), 14), { duration: 0.8 });
    }
  }, [centerTrigger]);

  // Fit entire route trigger
  useEffect(() => {
    if (fitRouteTrigger) {
      if (routeGeometry && routeGeometry.length > 1) {
        map.fitBounds(L.latLngBounds(routeGeometry), { padding: [50, 50], maxZoom: 15 });
      } else if (ambulance && selectedHospital) {
        map.fitBounds(
          L.latLngBounds([
            [ambulance.lat, ambulance.lng],
            [selectedHospital.lat, selectedHospital.lng],
          ]),
          { padding: [50, 50], maxZoom: 15 }
        );
      }
    }
  }, [fitRouteTrigger]);

  return null;
}

function Fit({ points, fitKey }: { points: [number, number][]; fitKey?: string | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (fitKey && fitKey.startsWith("req-") && points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
    }
  }, [fitKey, map, points]);
  return null;
}

function Invalidate() {
  const map = useMap();
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

export default function MapView({
  hospitals,
  ranks,
  ambulance,
  selectedId,
  highlightId,
  onSelect,
  onMapClick,
  onHover,
  dark,
  fitKey,
  routeGeometry,
  routeDistanceKm,
  routeEtaMinutes,
  ambulanceAccuracy,
  ambulanceHeading,
  gpsStatus = "GPS_ACTIVE",
  followAmbulance = false,
  centerTrigger,
  fitRouteTrigger,
  onUserDrag,
}: MapViewProps) {
  const now = useNow(5000);
  const selected = hospitals.find((h) => h.id === selectedId);

  const fitPoints: [number, number][] = useMemo(() => [
    ...(ambulance ? [[ambulance.lat, ambulance.lng] as [number, number]] : []),
    ...hospitals.filter((h) => !ranks || ranks[h.id]).slice(0, 8).map((h) => [h.lat, h.lng] as [number, number]),
  ], [ambulance, hospitals, ranks]);

  return (
    <MapContainer
      center={ambulance ? [ambulance.lat, ambulance.lng] : MUMBAI_CENTER}
      zoom={12}
      className="bedlink-map-root h-full w-full min-h-[500px]"
      dragging={true}
      scrollWheelZoom={true}
      doubleClickZoom={true}
      touchZoom={true}
      boxZoom={true}
      keyboard={true}
      zoomControl={true}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        className={dark ? "bl-tiles-dark" : "bl-tiles"}
      />
      <Invalidate />
      <ClickHandler onMapClick={onMapClick} />
      <Fit points={fitPoints} fitKey={fitKey} />
      <MapController
        ambulance={ambulance}
        selectedHospital={selected}
        routeGeometry={routeGeometry}
        followAmbulance={followAmbulance}
        centerTrigger={centerTrigger}
        fitRouteTrigger={fitRouteTrigger}
        onUserDrag={onUserDrag}
      />

      {/* Real-time driving route polyline (Section 7, 8, 9) */}
      {routeGeometry && routeGeometry.length > 1 ? (
        <>
          {/* Outer glow aura for clear visibility */}
          <Polyline
            positions={routeGeometry}
            pathOptions={{
              color: "#1D4ED8",
              weight: 8,
              opacity: 0.35,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
          {/* Inner crisp live navigation line */}
          <Polyline
            positions={routeGeometry}
            pathOptions={{
              color: "#2563EB",
              weight: 4.5,
              opacity: 0.95,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        </>
      ) : ambulance && selected ? (
        /* Fallback line connecting ambulance current position to selected hospital */
        <Polyline
          positions={[
            [ambulance.lat, ambulance.lng],
            [(ambulance.lat + selected.lat) / 2 + 0.002, (ambulance.lng + selected.lng) / 2 - 0.003],
            [selected.lat, selected.lng],
          ]}
          pathOptions={{
            color: "#3B82F6",
            weight: 3.5,
            dashArray: "6, 8",
            opacity: 0.75,
          }}
        />
      ) : null}

      {/* Hospital Markers */}
      {hospitals.map((h) => {
        const outside = Boolean((h as any).outsideRadius);
        const backendState = (h as any).markerState as string | undefined;
        const color = outside
          ? "#94A3B8"
          : backendState && MARKER_COLORS[backendState]
          ? MARKER_COLORS[backendState]
          : (h.active ? COLOR[hospitalAvailability(h, now)] : COLOR.occupied);

        const rank = ranks?.[h.id];
        const isSelected = h.id === selectedId;
        const isHighlight = h.id === highlightId;
        const hl = isSelected || isHighlight;

        const icon = L.divIcon({
          className: "",
          html: `<div class="hosp-pin ${hl ? "hl" : ""}" style="background:${color};${
            outside ? "opacity:.7;transform:scale(0.88);" : ranks && !rank ? "opacity:.75;" : ""
          }${isSelected ? "transform:rotate(-45deg) scale(1.35);box-shadow: 0 0 16px rgba(37,99,235,0.7);" : isHighlight ? "transform:rotate(-45deg) scale(1.25);opacity:1;" : ""}"><span>${
            rank ?? "+"
          }</span></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        });

        return (
          <Marker
            key={h.id}
            position={[h.lat, h.lng]}
            icon={icon}
            zIndexOffset={isSelected ? 2500 : hl ? 1000 : rank ? 500 - rank : outside ? 10 : 100}
            eventHandlers={{
              click: () => onSelect?.(h.id),
              mouseover: () => onHover?.(h.id),
              mouseout: () => onHover?.(null),
            }}
          >
            {/* Tooltip on hover */}
            <Tooltip direction="top" offset={[0, -26]}>
              <div className="text-left font-sans text-xs">
                <div className="font-bold flex items-center gap-1">
                  {h.name} {h.verified ? <span className="text-emerald-500 font-bold">✓</span> : null}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {h.area}{h.source ? ` · ${h.source}` : ""}
                </div>
                {(h as any).distanceKm !== undefined && (
                  <div className="text-xs font-semibold text-primary mt-0.5">
                    {(h as any).distanceKm} km · {outside ? "Outside active search radius" : `~${(h as any).etaMinutes} min · ${(h as any).availabilityStatus || "LIVE"}`}
                  </div>
                )}
              </div>
            </Tooltip>

            {/* Rich Destination Popup on click / selection (Section 16: Selected Hospital Marker) */}
            {isSelected && (
              <Popup offset={[0, -28]}>
                <div className="font-sans text-xs min-w-[160px] p-0.5">
                  <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    🏥 {h.name}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">{h.area}</div>
                  {routeDistanceKm !== undefined && routeDistanceKm !== null && (
                    <div className="mt-1.5 flex items-center gap-2 text-blue-600 font-bold text-xs bg-blue-50 dark:bg-blue-950/40 p-1.5 rounded-lg border border-blue-200 dark:border-blue-900">
                      <span>{routeDistanceKm} km</span>
                      <span>·</span>
                      <span>{routeEtaMinutes ?? "~"} min ETA</span>
                      <span className="ml-auto text-[9px] font-black uppercase text-emerald-600 bg-emerald-100 px-1 py-0.2 rounded">LIVE ROUTE</span>
                    </div>
                  )}
                  <div className="mt-2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => onSelect?.(h.id)}
                      className="w-full rounded bg-blue-600 px-2 py-1 text-center font-bold text-white hover:bg-blue-700 transition text-[11px]"
                    >
                      Selected Destination
                    </button>
                  </div>
                </div>
              </Popup>
            )}
          </Marker>
        );
      })}

      {/* Live Moving Ambulance Marker (Section 3, 13, 14, 15) */}
      {ambulance && (
        <LiveAmbulanceMarker
          position={ambulance}
          heading={ambulanceHeading}
          accuracy={ambulanceAccuracy}
          gpsStatus={gpsStatus}
          ambulanceId="A12"
          lastUpdatedText={gpsStatus === "DEMO_SIMULATION" ? "Demo Simulation" : "Live GPS Tracking"}
        />
      )}
    </MapContainer>
  );
}

