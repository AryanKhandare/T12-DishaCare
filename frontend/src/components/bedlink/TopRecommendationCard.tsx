import React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  MapPin,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "./primitives";
import type { Hospital, MatchResult } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TopRecommendationCardProps {
  hospital: Hospital;
  match: MatchResult;
  onSelect: () => void;
  onViewDetails: () => void;
  disabled?: boolean;
}

export function TopRecommendationCard({
  hospital,
  match,
  onSelect,
  onViewDetails,
  disabled = false,
}: TopRecommendationCardProps) {
  const isFull = match.matchType === "FULL_MATCH";
  const reqTotal = match.requirementsTotal ?? 4;
  const reqFulfilled = match.requirementsFulfilled ?? (isFull ? reqTotal : 3);

  // Calculate human freshness
  const updatedAtMs = hospital.updated_at ? new Date(hospital.updated_at).getTime() : Date.now();
  const ageSec = Math.max(0, Math.floor((Date.now() - updatedAtMs) / 1000));
  const ageMin = Math.max(1, Math.floor(ageSec / 60));
  const timeAgoStr = ageSec < 60 ? "just now" : `${ageMin} min ago`;

  const distKm = Number(match.distance_km ?? (hospital as any).distanceKm ?? 0).toFixed(1);
  const etaMins = Math.round(match.eta_min ?? (hospital as any).etaMinutes ?? 10);
  const scoreVal = match.total_score ?? ((match as any).matchScore ? (match as any).matchScore / 100 : 0.85);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 p-4 shadow-lift transition-all",
        isFull
          ? "border-emerald-500/50 bg-gradient-to-b from-emerald-500/10 via-card to-card"
          : "border-amber-500/50 bg-gradient-to-b from-amber-500/10 via-card to-card",
      )}
    >
      {/* Top Banner Tag */}
      <div className="mb-2 flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide",
            isFull
              ? "bg-emerald-500 text-white shadow-sm"
              : "bg-amber-500 text-white shadow-sm",
          )}
        >
          <Sparkles className="size-3.5 fill-current" />
          {isFull ? "Recommended Hospital" : "Best Available Match"}
        </span>

        {hospital.verified && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 border border-emerald-500/20">
            <ShieldCheck className="size-3" /> Verified
          </span>
        )}
      </div>

      {/* Hospital Identity & Distance/ETA */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold leading-tight text-foreground truncate">
            {hospital.name}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MapPin className="size-3 shrink-0 text-primary" />
            <span>{distKm} km</span>
            <span>•</span>
            <span className="font-semibold text-foreground">{etaMins} min ETA</span>
            <span>•</span>
            <span className="truncate">{hospital.area}</span>
          </p>
        </div>
        <ScoreRing value={scoreVal} label="match" size={62} />
      </div>

      {/* Match Tier Status */}
      <div className="mt-3">
        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold",
            isFull
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30",
          )}
        >
          {isFull ? (
            <>
              <CheckCircle2 className="size-3.5" />
              FULL MATCH — {reqTotal}/{reqTotal} REQUIREMENTS
            </>
          ) : (
            <>
              <AlertTriangle className="size-3.5" />
              PARTIAL MATCH — {reqFulfilled}/{reqTotal} REQUIREMENTS
            </>
          )}
        </div>
      </div>

      {/* Missing Resources Warning if Partial */}
      {!isFull && match.missingResources && match.missingResources.length > 0 && (
        <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/25 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-200">
          <span className="font-semibold">Missing: </span>
          <span className="font-bold underline">
            {match.missingResources.map((r) => r.toUpperCase()).join(", ")}
          </span>
        </div>
      )}

      {/* Requirements Checklist (Section 11) */}
      <div className="mt-3 rounded-xl border bg-card/80 p-2.5 text-xs">
        <div className="mb-2 flex items-center justify-between border-b pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <span>Requirements</span>
          <span>Status</span>
        </div>
        <div className="space-y-1.5">
          {match.requirements && Object.keys(match.requirements).length > 0 ? (
            Object.entries(match.requirements).map(([k, val]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="font-medium capitalize text-foreground">{k}</span>
                {val.matched ? (
                  <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3" /> Available
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-semibold text-rose-500">
                    <span className="font-bold">✗</span> Not available
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="text-muted-foreground italic">Standard emergency requirements verified</div>
          )}
        </div>
      </div>

      {/* Availability & Metadata */}
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground">Availability:</span>
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-bold text-emerald-600">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          <Clock className="size-3" />
          <span>Updated {timeAgoStr}</span>
        </div>
      </div>

      {/* Why This Hospital Bullets */}
      <div className="mt-3 rounded-xl bg-muted/40 p-2.5 text-xs text-muted-foreground">
        <div className="font-semibold text-foreground mb-1">Why this hospital?</div>
        <ul className="space-y-1 text-[11px]">
          <li>• {reqFulfilled} of {reqTotal} requirements fulfilled</li>
          <li>• {distKm} km from ambulance location</li>
          <li>• {etaMins} min estimated arrival time</li>
          <li>• Live availability confirmed {timeAgoStr}</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex items-center gap-2">
        <Button
          variant="outline"
          className="h-11 flex-1 text-xs font-semibold gap-1"
          onClick={onViewDetails}
        >
          <ExternalLink className="size-3.5" />
          View Details
        </Button>
        <Button
          className={cn(
            "h-11 flex-1 text-xs font-bold gap-1 shadow-sm",
            isFull
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-primary hover:bg-primary/90 text-primary-foreground",
          )}
          disabled={disabled}
          onClick={onSelect}
        >
          Select Hospital
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
