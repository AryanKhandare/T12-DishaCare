import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, ShieldCheck, MapPin, Clock, X, ArrowRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { NearbyHospitalItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MapRecommendationCardProps {
  hospital: NearbyHospitalItem;
  onClose: () => void;
  onViewDetails: () => void;
  onSelect: () => void;
  disabled?: boolean;
}

export function MapRecommendationCard({
  hospital,
  onClose,
  onViewDetails,
  onSelect,
  disabled = false,
}: MapRecommendationCardProps) {
  const isLive = hospital.availabilityStatus === "LIVE";
  const isStale = hospital.availabilityStatus === "STALE" || hospital.availabilityStatus === "VERY_STALE";
  const isUnknown = hospital.availabilityStatus === "UNKNOWN";

  const statusLabel = isLive
    ? "LIVE"
    : isStale
    ? hospital.availabilityStatus === "VERY_STALE"
      ? "VERY STALE"
      : "STALE"
    : "AVAILABILITY UNCONFIRMED";

  const statusBadgeClass = isLive
    ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
    : isStale
    ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
    : "bg-muted text-muted-foreground border-border";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 z-[500] md:w-[410px] rounded-2xl border bg-card/98 p-4 shadow-lift backdrop-blur-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {hospital.isRecommended && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground tracking-wide uppercase">
                ★ Top Recommendation
              </span>
            )}
            {hospital.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 border border-emerald-500/20">
                <ShieldCheck className="size-3" /> Official Verified
              </span>
            )}
          </div>
          <h3 className="text-base font-bold leading-tight truncate text-foreground">
            {hospital.name}
          </h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="size-3 text-muted-foreground shrink-0" />
            <span className="truncate">{hospital.area} · {hospital.source || "Government Health Registry"}</span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Close card"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-2.5 text-center">
        <div>
          <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Distance</div>
          <div className="text-lg font-bold text-foreground">{hospital.distanceKm.toFixed(1)} <span className="text-xs font-normal">km</span></div>
        </div>
        <div className="border-x border-border/60">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">ETA</div>
          <div className="text-lg font-bold text-foreground">
            {Math.round(hospital.etaMinutes)} <span className="text-xs font-normal">min</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Match Score</div>
          <div className="text-lg font-bold text-primary">{Math.round(hospital.matchScore)}<span className="text-xs font-normal">/100</span></div>
        </div>
      </div>

      {/* Tier & Availability Status Badges */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          {hospital.matchType === "FULL_MATCH" ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-600 border border-emerald-500/30">
              <CheckCircle2 className="size-3.5" /> Full Match (100%)
            </span>
          ) : hospital.matchType === "PARTIAL_MATCH" ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-600 border border-amber-500/30">
              <AlertTriangle className="size-3.5" /> Partial Match ({hospital.requirementsFulfilled}/{hospital.requirementsTotal})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-0.5 text-xs font-bold text-rose-600 border border-rose-500/30">
              Unavailable
            </span>
          )}

          <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border", statusBadgeClass)}>
            <span className={cn("size-1.5 rounded-full animate-pulse", isLive ? "bg-emerald-500" : isStale ? "bg-amber-500" : "bg-muted-foreground")} />
            {statusLabel}
          </span>
        </div>

        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Clock className="size-3" />
          {hospital.isConfirmedLive ? `Live Staff` : `Static Dir`}
        </span>
      </div>

      {/* Missing Resources Warning if Partial */}
      {hospital.matchType === "PARTIAL_MATCH" && hospital.missingResources && hospital.missingResources.length > 0 && (
        <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
          <AlertTriangle className="size-3.5 shrink-0 text-amber-600" />
          <span>Missing: <strong className="font-semibold">{hospital.missingResources.map((r) => r.toUpperCase()).join(", ")}</strong></span>
        </div>
      )}

      {/* Requirements Checklist (Section 13) */}
      {hospital.requirements && Object.keys(hospital.requirements).length > 0 ? (
        <div className="mt-2.5 rounded-xl border bg-card p-2 text-xs space-y-1">
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
            Emergency Requirements ({hospital.fulfillmentPercentage}%)
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {Object.entries(hospital.requirements).map(([k, val]) => (
              <div key={k} className="flex items-center justify-between text-[11px]">
                <span className="capitalize text-muted-foreground">{k}:</span>
                {val.matched ? (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                    ✓ Available
                  </span>
                ) : (
                  <span className="font-semibold text-rose-500 flex items-center gap-0.5">
                    ✗ Unavailable
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Fallback Resource Highlights if no specific requirements queried */
        <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-xs text-center">
          <div className="rounded-lg border bg-card p-1.5">
            <div className="text-[10px] text-muted-foreground">ICU</div>
            <div className="font-bold text-sm text-foreground">
              {hospital.isConfirmedLive ? (hospital.availability?.icu ?? "Avail") : "Unconfirmed"}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-1.5">
            <div className="text-[10px] text-muted-foreground">Ventilator</div>
            <div className="font-bold text-sm text-foreground">
              {hospital.isConfirmedLive ? (hospital.availability?.ventilator ?? "Avail") : "Unconfirmed"}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-1.5">
            <div className="text-[10px] text-muted-foreground">Oxygen</div>
            <div className="font-bold text-sm text-foreground">
              {(hospital.availability?.oxygen ?? 0) > 0 ? "Avail" : "No"}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-1.5">
            <div className="text-[10px] text-muted-foreground">Cardiac</div>
            <div className="font-bold text-sm text-foreground">
              {(hospital.availability?.cardiac ?? 0) > 0 ? "Avail" : "No"}
            </div>
          </div>
        </div>
      )}

      {/* Score Breakdown Bars */}
      <div className="mt-2.5 space-y-1 rounded-xl bg-muted/30 p-2 text-[11px]">
        <div className="flex justify-between text-muted-foreground">
          <span>Resource Fulfillment</span>
          <span className="font-bold text-foreground">{hospital.scoreBreakdown?.resource ?? 50}%</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>ETA Score (Transit Time)</span>
          <span className="font-bold text-foreground">{hospital.scoreBreakdown?.eta ?? 50}%</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Data Freshness Score</span>
          <span className="font-bold text-foreground">{hospital.scoreBreakdown?.freshness ?? 50}%</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Current Hospital Load</span>
          <span className="font-bold text-foreground">{hospital.currentLoad ?? 0}%</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-10 flex-1 font-semibold"
          onClick={onViewDetails}
        >
          View Details
        </Button>
        <Button
          size="sm"
          className="h-10 flex-1 font-bold shadow-md"
          disabled={disabled || hospital.markerState === "GREY"}
          onClick={onSelect}
        >
          Select Hospital
          <ArrowRight className="size-3.5 ml-1.5" />
        </Button>
      </div>
    </motion.div>
  );
}
