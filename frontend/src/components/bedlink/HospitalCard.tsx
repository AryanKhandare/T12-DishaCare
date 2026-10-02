import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown, Clock, MapPin, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { explainMatch } from "@/lib/matching";
import type { Hospital, MatchResult, ResourceKey } from "@/lib/types";
import { RESOURCE_KEYS, TOGGLE_RESOURCES } from "@/lib/types";
import { FreshnessBadge, LoadBar, ResourcePill, ScoreBreakdownBar, ScoreRing } from "./primitives";

export function ReasonList({ match }: { match: MatchResult }) {
  return (
    <ul className="space-y-1.5">
      {explainMatch(match).map((r) => {
        const Icon = r.tone === "good" ? CheckCircle2 : r.tone === "warn" ? AlertTriangle : XCircle;
        return (
          <li key={r.text} className="flex items-start gap-2 text-sm">
            <Icon
              className={cn(
                "mt-0.5 size-4 shrink-0",
                r.tone === "good" ? "text-success" : r.tone === "warn" ? "text-warning" : "text-destructive",
              )}
            />
            {r.text}
          </li>
        );
      })}
    </ul>
  );
}

export function HospitalCard({
  hospital, match, required, isTop, selected, disabled, onSelect, onRequest, onOpen, onHover,
}: {
  hospital: Hospital;
  match: MatchResult;
  required: ResourceKey[];
  isTop: boolean;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onRequest: () => void;
  onOpen: () => void;
  onHover?: (on: boolean) => void;
}) {
  const [open, setOpen] = useState(isTop);
  const shown = RESOURCE_KEYS.filter((k) => required.includes(k) || (hospital.resources?.[k]?.available ?? 0) > 0).slice(0, 5);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 34 }}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onClick={onSelect}
      className={cn(
        "relative cursor-pointer overflow-hidden rounded-2xl border bg-card p-4 transition-shadow hover:shadow-lift",
        selected && "border-primary/40 shadow-lift",
      )}
    >
      {selected && <div className="absolute inset-y-0 left-0 w-1 bg-primary" />}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold tnum",
            isTop
              ? match.matchType === "PARTIAL_MATCH"
                ? "bg-amber-500 text-white"
                : "bg-primary text-primary-foreground"
              : "bg-muted text-foreground",
          )}
        >
          {match.rank}
        </div>
        <div className="min-w-0 flex-1">
          {/* Recommendation & Tier Badges (Section 9 & 11) */}
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {isTop ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                  match.matchType === "PARTIAL_MATCH"
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30",
                )}
              >
                ★ {match.matchType === "PARTIAL_MATCH" ? "Best Available Match" : "Recommended"}
              </span>
            ) : match.matchType === "PARTIAL_MATCH" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 border border-amber-500/20">
                <AlertTriangle className="size-2.5" /> Alternative ({match.requirementsFulfilled ?? 0}/{match.requirementsTotal ?? 0})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 border border-emerald-500/20">
                <CheckCircle2 className="size-2.5" /> Full Match
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="truncate text-left text-base font-semibold hover:text-primary hover:underline"
          >
            {hospital.name}
          </button>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" /> {hospital.area} · <span className="tnum">{match.distance_km.toFixed(1)} km</span>
          </div>

          {/* Missing Resources Warning (Section 6 & 15) */}
          {match.missingResources && match.missingResources.length > 0 && (
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300 border border-amber-500/20">
              <AlertTriangle className="size-3 shrink-0 text-amber-600" />
              <span>Missing: <strong className="font-semibold">{match.missingResources.map((r) => r.toUpperCase()).join(", ")}</strong></span>
            </div>
          )}

          <div className="mt-2 flex items-end gap-3">
            <div>
              <div className="text-3xl font-bold leading-none tnum">
                {Math.round(match.eta_min)}
                <span className="ml-0.5 text-sm font-medium text-muted-foreground">min</span>
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">ETA</div>
            </div>
            <div className="pb-1">
              <FreshnessBadge updatedAt={hospital.updated_at} />
            </div>
          </div>
        </div>
        <ScoreRing value={match.total_score} label="match" size={62} />
      </div>

      <div className="mt-3">
        <LoadBar pct={hospital.load_pct} />
      </div>

      {/* Requirements checklist / Resource pills */}
      {match.requirements && Object.keys(match.requirements).length > 0 ? (
        <div className="mt-2.5 rounded-lg border bg-muted/30 p-2 text-xs">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Requirements ({match.fulfillmentPercentage ?? 100}%)
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {Object.entries(match.requirements).map(([k, val]) => (
              <div key={k} className="flex items-center justify-between text-[11px]">
                <span className="capitalize text-muted-foreground">{k}</span>
                {val.matched ? (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">✓ Available</span>
                ) : (
                  <span className="font-semibold text-destructive">✗ Not available</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {shown.map((k) => (
            <ResourcePill key={k} k={k} count={hospital.resources?.[k]?.available ?? 0} toggle={TOGGLE_RESOURCES.includes(k)} />
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Button
          className="h-11 flex-1"
          variant={isTop ? "default" : "outline"}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onRequest();
          }}
        >
          Request Bed
        </Button>
        <Button
          variant="ghost"
          className="h-11 text-muted-foreground"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          aria-expanded={open}
        >
          Why this hospital?
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </Button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-3 rounded-xl bg-muted/60 p-3">
              <ReasonList match={match} />
              <ScoreBreakdownBar components={match.components} />
              {match.stale && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <Clock className="size-3.5" /> Listing is stale — score penalized
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
