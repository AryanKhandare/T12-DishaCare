import { useMemo } from "react";
import L from "leaflet";
import { Circle, Marker, Tooltip } from "react-leaflet";

export type GpsStatusType =
  | "GPS_ACTIVE"
  | "GPS_ACCURACY_LOW"
  | "GPS_PERMISSION_DENIED"
  | "GPS_UNAVAILABLE"
  | "GPS_WAITING"
  | "GPS_SIGNAL_LOST"
  | "MANUAL_OVERRIDE"
  | "DEMO_SIMULATION";

export interface LiveAmbulanceMarkerProps {
  position: { lat: number; lng: number };
  heading?: number | null | undefined;
  accuracy?: number | null | undefined;
  gpsStatus: GpsStatusType;
  ambulanceId?: string | undefined;
  lastUpdatedText?: string | undefined;
  onClick?: (() => void) | undefined;
}

export function LiveAmbulanceMarker({
  position,
  heading,
  accuracy,
  gpsStatus,
  ambulanceId = "A12",
  lastUpdatedText,
  onClick,
}: LiveAmbulanceMarkerProps) {
  // Dedicated custom ambulance pin icon (Section 3, 13, 14)
  const icon = useMemo(() => {
    const isSim = gpsStatus === "DEMO_SIMULATION";
    const isManual = gpsStatus === "MANUAL_OVERRIDE";
    const isLost = gpsStatus === "GPS_SIGNAL_LOST" || gpsStatus === "GPS_UNAVAILABLE";
    const isLow = gpsStatus === "GPS_ACCURACY_LOW";

    const badgeColor = isSim
      ? "#F97316" // Orange for simulation
      : isManual
      ? "#8B5CF6" // Purple for manual override
      : isLost
      ? "#EF4444" // Red for lost/unavailable
      : isLow
      ? "#F59E0B" // Amber for low accuracy
      : "#10B981"; // Emerald green for LIVE GPS

    const badgeText = isSim ? "SIM" : isManual ? "PIN" : isLost ? "LOST" : "LIVE";
    const rotateStyle = heading !== null && heading !== undefined ? `transform: rotate(${heading}deg);` : "";

    const html = `
      <div class="relative flex items-center justify-center cursor-pointer select-none" style="width: 44px; height: 44px;">
        <!-- Pulsing radar ring (Section 3 & 14) -->
        <div class="absolute inset-0 rounded-full animate-ping opacity-35" style="background-color: ${badgeColor};"></div>
        <div class="absolute inset-1 rounded-full opacity-20" style="background-color: ${badgeColor};"></div>

        <!-- Ambulance vehicle container with optional heading orientation -->
        <div class="relative z-10 flex size-9 items-center justify-center rounded-2xl shadow-lg border-2 border-white transition-transform duration-300"
             style="background: linear-gradient(135deg, #1E293B, #0F172A); ${rotateStyle}">
          <!-- Heading direction indicator arrow if device heading is available (Section 14) -->
          ${
            heading !== null && heading !== undefined
              ? `<div class="absolute -top-1 size-0 border-x-4 border-x-transparent border-b-4 border-b-white"></div>`
              : ""
          }
          <span style="font-size: 18px; line-height: 1; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));">🚑</span>
        </div>

        <!-- Status badge chip -->
        <div class="absolute -bottom-1 z-20 rounded-full px-1.5 py-0.2 text-[9px] font-black tracking-wider text-white shadow"
             style="background-color: ${badgeColor}; font-family: ui-monospace, SFMono-Regular, monospace; line-height: 1.2;">
          ${badgeText}
        </div>
      </div>
    `;

    return L.divIcon({
      className: "live-ambulance-marker",
      html,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  }, [gpsStatus, heading]);

  const accRadius = typeof accuracy === "number" && accuracy > 0 ? Math.min(250, accuracy) : 18;

  return (
    <>
      {/* Accuracy Uncertainty Circle (Section 15: Accuracy Circle) */}
      <Circle
        center={[position.lat, position.lng]}
        radius={accRadius}
        pathOptions={{
          color: gpsStatus === "DEMO_SIMULATION" ? "#F97316" : "#2563EB",
          fillColor: gpsStatus === "DEMO_SIMULATION" ? "#F97316" : "#3B82F6",
          fillOpacity: 0.12,
          weight: 1.5,
          dashArray: "5, 5",
        }}
      />

      {/* Main Moving Ambulance Marker */}
      <Marker
        position={[position.lat, position.lng]}
        icon={icon}
        zIndexOffset={3000}
        eventHandlers={{
          click: () => onClick?.(),
        }}
      >
        <Tooltip direction="top" offset={[0, -22]} opacity={0.95}>
          <div className="p-1 font-sans text-xs min-w-[140px]">
            <div className="flex items-center justify-between font-bold text-slate-900 border-b pb-1 mb-1">
              <span>🚑 Ambulance {ambulanceId}</span>
              <span
                className="rounded px-1 text-[10px] text-white font-mono uppercase"
                style={{
                  backgroundColor:
                    gpsStatus === "DEMO_SIMULATION"
                      ? "#F97316"
                      : gpsStatus === "MANUAL_OVERRIDE"
                      ? "#8B5CF6"
                      : gpsStatus === "GPS_ACTIVE"
                      ? "#10B981"
                      : "#F59E0B",
                }}
              >
                {gpsStatus === "DEMO_SIMULATION" ? "DEMO SIM" : gpsStatus === "MANUAL_OVERRIDE" ? "MANUAL" : "LIVE"}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 font-mono">
              {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
            </div>
            {accuracy !== undefined && accuracy !== null && (
              <div className="text-[11px] text-slate-500 mt-0.5">
                GPS Accuracy: <strong className="text-slate-800">±{Math.round(accuracy)}m</strong>
              </div>
            )}
            {lastUpdatedText && (
              <div className="text-[10px] text-slate-400 mt-0.5">{lastUpdatedText}</div>
            )}
          </div>
        </Tooltip>
      </Marker>
    </>
  );
}
