import { motion } from "framer-motion";
import {
  Compass,
  Crosshair,
  Gamepad2,
  Navigation2,
  Radio,
  Route as RouteIcon,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GpsStatusType } from "./LiveAmbulanceMarker";

export interface LiveNavigationPanelProps {
  hospitalName: string;
  hospitalArea?: string | undefined;
  distanceKm: number;
  etaMinutes: number;
  routeStatus?: "LIVE_ROUTE" | "FALLBACK_ROUTE" | "LOADING" | undefined;
  routeSource?: "osrm" | "fallback" | undefined;
  gpsStatus: GpsStatusType;
  gpsAccuracy?: number | null | undefined;
  lastGpsUpdateSec?: number | undefined;
  followAmbulance: boolean;
  onToggleFollow: () => void;
  onCenterAmbulance: () => void;
  onFitRoute: () => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onClose?: (() => void) | undefined;
}

export function LiveNavigationPanel({
  hospitalName,
  hospitalArea,
  distanceKm,
  etaMinutes,
  routeStatus = "LIVE_ROUTE",
  routeSource = "osrm",
  gpsStatus,
  gpsAccuracy,
  lastGpsUpdateSec = 0,
  followAmbulance,
  onToggleFollow,
  onCenterAmbulance,
  onFitRoute,
  isSimulating,
  onToggleSimulation,
  onClose,
}: LiveNavigationPanelProps) {
  // GPS Status rendering details (Section 4 & 5)
  const gpsBadge = (() => {
    switch (gpsStatus) {
      case "DEMO_SIMULATION":
        return {
          label: "DEMO SIMULATION",
          sub: "Automated route playback",
          color: "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400",
          dot: "bg-orange-500",
        };
      case "MANUAL_OVERRIDE":
        return {
          label: "MANUAL PIN",
          sub: "Clicked on map",
          color: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
          dot: "bg-purple-500",
        };
      case "GPS_ACCURACY_LOW":
        return {
          label: `GPS LOW ACCURACY (±${Math.round(gpsAccuracy ?? 150)}m)`,
          sub: "Weak device satellite fix",
          color: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
          dot: "bg-amber-500 animate-pulse",
        };
      case "GPS_SIGNAL_LOST":
        return {
          label: "GPS SIGNAL LOST",
          sub: `Last fix ${lastGpsUpdateSec}s ago`,
          color: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
          dot: "bg-amber-500",
        };
      case "GPS_PERMISSION_DENIED":
      case "GPS_UNAVAILABLE":
        return {
          label: "GPS UNAVAILABLE",
          sub: "Click map to set location",
          color: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
          dot: "bg-rose-500",
        };
      case "GPS_WAITING":
        return {
          label: "ACQUIRING GPS...",
          sub: "Searching for satellites",
          color: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
          dot: "bg-blue-500 animate-ping",
        };
      case "GPS_ACTIVE":
      default:
        return {
          label: `GPS LIVE (±${Math.round(gpsAccuracy ?? 18)}m)`,
          sub: "Continuous device watch",
          color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          dot: "bg-emerald-500 animate-pulse",
        };
    }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="absolute bottom-4 left-4 right-4 z-[450] mx-auto max-w-xl rounded-2xl border border-border/80 bg-card/95 p-3.5 shadow-2xl backdrop-blur-md md:left-6 md:right-auto md:w-[420px]"
    >
      {/* Header bar: Live status indicator + Close */}
      <div className="flex items-center justify-between border-b pb-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-blue-600 animate-pulse" />
          <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Real-Time Ambulance Navigation
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Demo simulation mode toggle (Section 31 & 32) */}
          <Button
            type="button"
            variant={isSimulating ? "default" : "outline"}
            size="sm"
            onClick={onToggleSimulation}
            className={cn(
              "h-7 px-2 text-[11px] gap-1 rounded-lg",
              isSimulating ? "bg-orange-600 hover:bg-orange-700 text-white" : "text-muted-foreground"
            )}
            title={isSimulating ? "Stop demo movement playback" : "Simulate live ambulance driving for demo"}
          >
            <Gamepad2 className="size-3" />
            {isSimulating ? "Stop Sim" : "Demo Sim"}
          </Button>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted transition"
              aria-label="Close navigation panel"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Destination + ETA stats grid (Section 26) */}
      <div className="grid grid-cols-[1fr_auto] items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5">
            <span className="font-semibold text-foreground">Destination:</span>
            <span className="truncate">{hospitalArea || "Mumbai"}</span>
          </div>
          <h3 className="truncate font-bold text-base text-foreground leading-tight">
            🏥 {hospitalName}
          </h3>
        </div>

        {/* Big ETA badge */}
        <div className="rounded-xl border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-right shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-primary">LIVE ETA</div>
          <div className="text-xl font-extrabold text-primary leading-none mt-0.5">
            {etaMinutes} <span className="text-xs font-semibold">min</span>
          </div>
          <div className="text-[11px] font-medium text-muted-foreground mt-0.5">
            {distanceKm} km
          </div>
        </div>
      </div>

      {/* GPS Status and Route Source Badges (Section 4, 5, 8, 29) */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 text-xs">
        <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-semibold text-[11px]", gpsBadge.color)}>
          <span className={cn("size-1.5 rounded-full", gpsBadge.dot)} />
          <span>{gpsBadge.label}</span>
        </div>

        <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <RouteIcon className="size-3 text-primary" />
          <span>
            {routeSource === "osrm" ? (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Live OSRM Route</span>
            ) : (
              <span className="font-medium text-amber-600 dark:text-amber-400">Fallback Estimate</span>
            )}
          </span>
        </div>
      </div>

      {/* Interactive Map Controls (Section 17 & 33) */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2.5">
        {/* Follow Ambulance toggle */}
        <Button
          type="button"
          variant={followAmbulance ? "default" : "outline"}
          size="sm"
          onClick={onToggleFollow}
          className={cn(
            "h-8 flex-1 text-xs gap-1.5 font-semibold rounded-xl",
            followAmbulance ? "bg-primary text-primary-foreground shadow" : ""
          )}
        >
          <Navigation2 className={cn("size-3.5", followAmbulance ? "fill-current animate-pulse" : "")} />
          {followAmbulance ? "Following Ambulance" : "Follow Ambulance"}
        </Button>

        {/* Center on Ambulance */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCenterAmbulance}
          className="h-8 px-2.5 text-xs gap-1 rounded-xl"
          title="Center map on ambulance's current position"
        >
          <Crosshair className="size-3.5 text-primary" />
          <span className="hidden sm:inline">Ambulance</span>
        </Button>

        {/* Fit Entire Route */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onFitRoute}
          className="h-8 px-2.5 text-xs gap-1 rounded-xl"
          title="Zoom to fit both ambulance and hospital destination"
        >
          <Compass className="size-3.5 text-primary" />
          <span className="hidden sm:inline">Fit Route</span>
        </Button>
      </div>
    </motion.div>
  );
}
