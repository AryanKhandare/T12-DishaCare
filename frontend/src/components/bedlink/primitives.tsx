import { motion } from "framer-motion";
import {
  Activity, AlertTriangle, BedDouble, Check, CheckCircle2, Clock, Droplet, Flame, HeartPulse, Hourglass,
  LogIn, Minus, Plus, RefreshCw, Send, ShieldCheck, Undo2, Wind, X, XCircle, Zap, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNow, timeAgo, mmss } from "@/hooks/use-now";
import { freshnessLevel, SCORE_WEIGHTS } from "@/lib/matching";
import type { AppEvent, EventType, ResourceKey, ScoreComponents } from "@/lib/types";

export const RESOURCE_META: Record<ResourceKey, { label: string; short: string; icon: LucideIcon }> = {
  icu: { label: "ICU", short: "ICU", icon: BedDouble },
  ventilator: { label: "Ventilator", short: "Vent", icon: Wind },
  cardiac: { label: "Cardiac Facility", short: "Cardiac", icon: HeartPulse },
  oxygen: { label: "Oxygen", short: "O₂", icon: Droplet },
  burns: { label: "Burns Unit", short: "Burns", icon: Flame },
};

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/15 px-2 py-1 text-[11px] font-semibold tracking-wide text-warning-foreground dark:text-warning",
        className,
      )}
    >
      <Zap className="size-3" /> DEMO · SIMULATED DATA
    </span>
  );
}

export function ResourceChip({ k, selected, onClick }: { k: ResourceKey; selected: boolean; onClick: () => void }) {
  const M = RESOURCE_META[k];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition-all",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted",
      )}
    >
      <M.icon className="size-4" />
      {M.label}
      {selected && <Check className="size-3.5" />}
    </button>
  );
}

export function ResourcePill({ k, count, toggle }: { k: ResourceKey; count: number; toggle?: boolean }) {
  const M = RESOURCE_META[k];
  const ok = count > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium tnum",
        ok ? "border-success/25 bg-success/10 text-success" : "border-border bg-muted text-muted-foreground line-through",
      )}
    >
      <M.icon className="size-3" />
      {M.short}
      {!toggle && <span className="font-semibold">{count}</span>}
    </span>
  );
}

const FRESH_STYLE = {
  fresh: "text-success bg-success/10 border-success/25",
  aging: "text-warning-foreground dark:text-warning bg-warning/15 border-warning/30",
  stale: "text-destructive bg-destructive/10 border-destructive/25",
};

export function FreshnessBadge({ updatedAt, compact }: { updatedAt: number; compact?: boolean }) {
  const now = useNow(1000);
  const lvl = freshnessLevel((now - updatedAt) / 1000);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium tnum", FRESH_STYLE[lvl])}>
      <span className={cn("size-1.5 rounded-full bg-current", lvl === "fresh" && "animate-pulse")} />
      {timeAgo(updatedAt, now)}
      {lvl === "stale" && !compact && <span className="font-bold">STALE</span>}
    </span>
  );
}

export function ScoreRing({ value, size = 56, stroke = 5, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.round(value * 100);
  const tone = pct >= 85 ? "text-success" : pct >= 70 ? "text-primary" : "text-warning";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn("stroke-current", tone)}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value) }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute text-center leading-none">
        <div className={cn("font-bold tnum", size > 80 ? "text-2xl" : "text-sm")}>{pct}%</div>
        {label && <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>}
      </div>
    </div>
  );
}

const BREAKDOWN: { key: keyof ScoreComponents; label: string; cls: string }[] = [
  { key: "resource", label: "Resource", cls: "bg-chart-1" },
  { key: "eta", label: "ETA", cls: "bg-chart-2" },
  { key: "freshness", label: "Freshness", cls: "bg-chart-3" },
  { key: "load", label: "Load", cls: "bg-chart-4" },
  { key: "distance", label: "Distance", cls: "bg-chart-5/70" },
];

export function ScoreBreakdownBar({ components }: { components: ScoreComponents }) {
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        {BREAKDOWN.map((b) => (
          <motion.div
            key={b.key}
            className={cn("h-full border-r border-card last:border-0", b.cls)}
            initial={{ width: 0 }}
            animate={{ width: `${SCORE_WEIGHTS[b.key] * components[b.key] * 100}%` }}
            transition={{ duration: 0.6 }}
          />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1 text-[11px]">
        {BREAKDOWN.map((b) => (
          <div key={b.key}>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className={cn("size-2 rounded-sm", b.cls)} />
              {b.label}
            </div>
            <div className="font-semibold tnum">
              {Math.round(SCORE_WEIGHTS[b.key] * components[b.key] * 100)}
              <span className="font-normal text-muted-foreground">/{Math.round(SCORE_WEIGHTS[b.key] * 100)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LoadBar({ pct, showLabel = true }: { pct: number; showLabel?: boolean }) {
  const cls = pct >= 80 ? "bg-destructive" : pct >= 60 ? "bg-warning" : "bg-success";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <motion.div className={cn("h-full rounded-full", cls)} animate={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="w-14 text-right text-xs text-muted-foreground tnum">{pct}% load</span>}
    </div>
  );
}

const STATUS: Record<string, { label: string; cls: string; icon: LucideIcon }> = {
  RESERVATION_REQUESTED: { label: "Pending", cls: "bg-primary/10 text-primary border-primary/25", icon: Hourglass },
  ACCEPTED: { label: "Accepted", cls: "bg-success/10 text-success border-success/25", icon: Check },
  HELD: { label: "Held", cls: "bg-success/10 text-success border-success/25", icon: ShieldCheck },
  REJECTED: { label: "Rejected", cls: "bg-destructive/10 text-destructive border-destructive/25", icon: XCircle },
  TIMEOUT: { label: "Timeout", cls: "bg-destructive/10 text-destructive border-destructive/25", icon: Clock },
  CANCELLED: { label: "Cancelled", cls: "bg-muted text-muted-foreground border-border", icon: X },
  RELEASED: { label: "Released", cls: "bg-muted text-muted-foreground border-border", icon: Undo2 },
  available: { label: "Available", cls: "bg-success/10 text-success border-success/25", icon: CheckCircle2 },
  limited: { label: "Limited", cls: "bg-warning/15 text-warning-foreground dark:text-warning border-warning/30", icon: AlertTriangle },
  occupied: { label: "Occupied", cls: "bg-destructive/10 text-destructive border-destructive/25", icon: XCircle },
  stale: { label: "Stale", cls: "bg-destructive/10 text-destructive border-destructive/25", icon: Clock },
  matching: { label: "Matching", cls: "bg-primary/10 text-primary border-primary/25", icon: RefreshCw },
  reserving: { label: "Reserving", cls: "bg-primary/10 text-primary border-primary/25", icon: Hourglass },
  held: { label: "Bed held", cls: "bg-success/10 text-success border-success/25", icon: ShieldCheck },
  completed: { label: "Completed", cls: "bg-success/10 text-success border-success/25", icon: CheckCircle2 },
  failed: { label: "No match", cls: "bg-destructive/10 text-destructive border-destructive/25", icon: XCircle },
  cancelled: { label: "Cancelled", cls: "bg-muted text-muted-foreground border-border", icon: X },
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const s = (STATUS[status] ?? STATUS["cancelled"])!;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold", s.cls, className)}>
      <s.icon className="size-3" />
      {s.label}
    </span>
  );
}

export function CountdownRing({ startsAt, expiresAt, size = 168 }: { startsAt: number; expiresAt: number; size?: number }) {
  const now = useNow(200);
  const total = Math.max(1, expiresAt - startsAt);
  const remaining = Math.max(0, expiresAt - Math.max(now, startsAt));
  const frac = remaining / total;
  const secs = remaining / 1000;
  const tone = secs < 10 ? "text-destructive" : secs < 30 ? "text-warning" : "text-primary";
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn("stroke-current transition-[stroke-dashoffset] duration-200 ease-linear", tone)}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
        />
      </svg>
      <div className="absolute text-center">
        <div className={cn("font-bold tnum tracking-tight", tone, size > 120 ? "text-4xl" : "text-xl")}>{mmss(remaining)}</div>
        {size > 120 && <div className="text-xs text-muted-foreground">remaining</div>}
      </div>
    </div>
  );
}

export interface AttemptItem {
  name: string;
  state: "timeout" | "rejected" | "pending" | "queued" | "held";
  detail?: string | undefined;
}

export function AttemptChain({ items }: { items: AttemptItem[] }) {
  const style = {
    timeout: { cls: "border-destructive/30 bg-destructive/10 text-destructive", icon: Clock, txt: "Timeout" },
    rejected: { cls: "border-destructive/30 bg-destructive/10 text-destructive", icon: XCircle, txt: "Declined" },
    pending: { cls: "border-primary/30 bg-primary/10 text-primary", icon: Hourglass, txt: "Pending" },
    queued: { cls: "border-border bg-muted text-muted-foreground", icon: Clock, txt: "Queued" },
    held: { cls: "border-success/30 bg-success/10 text-success", icon: ShieldCheck, txt: "Held" },
  };
  return (
    <div className="flex flex-col gap-0">
      {items.map((it, i) => {
        const s = style[it.state];
        return (
          <div key={i}>
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
              className={cn("flex items-center justify-between rounded-lg border px-3 py-2 text-sm", s.cls)}
            >
              <span className="flex items-center gap-2 font-medium text-foreground">
                <span className="grid size-5 place-items-center rounded-full bg-card text-[11px] font-bold tnum">{i + 1}</span>
                <span className="flex flex-col">
                  {it.name}
                  {it.detail && <span className="text-xs font-normal text-muted-foreground">{it.detail}</span>}
                </span>
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold">
                <s.icon className="size-3.5" /> {s.txt}
              </span>
            </motion.div>
            {i < items.length - 1 && (
              <div className="ml-5 h-4 w-px overflow-hidden bg-border">
                <motion.div
                  className="w-full bg-primary"
                  initial={{ height: 0 }}
                  animate={{ height: "100%" }}
                  transition={{ delay: i * 0.15 + 0.1, duration: 0.3 }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ReservationStepper({ step, failed }: { step: number; failed?: boolean }) {
  const steps = ["Request Sent", "Awaiting Response", "Confirmation"];
  return (
    <div className="flex items-start">
      {steps.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <div key={label} className="flex flex-1 flex-col items-center text-center">
            <div className="flex w-full items-center">
              <div className={cn("h-0.5 flex-1", i === 0 ? "opacity-0" : done || current ? "bg-primary" : "bg-border")} />
              <div
                className={cn(
                  "grid size-8 place-items-center rounded-full border-2 text-xs font-bold",
                  done && "border-primary bg-primary text-primary-foreground",
                  current && !failed && "border-primary bg-card text-primary",
                  current && failed && "border-destructive bg-destructive/10 text-destructive",
                  !done && !current && "border-border bg-card text-muted-foreground",
                )}
              >
                {done ? <Check className="size-4" /> : current && failed ? <X className="size-4" /> : i + 1}
              </div>
              <div className={cn("h-0.5 flex-1", i === steps.length - 1 ? "opacity-0" : done ? "bg-primary" : "bg-border")} />
            </div>
            <div className={cn("mt-1.5 text-[11px] font-medium", current ? "text-foreground" : "text-muted-foreground")}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

export function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const w = 96, h = 32;
  const max = Math.max(...data, 1), min = Math.min(...data, 0);
  const pts = data.map((d, i) => `${(i / Math.max(1, data.length - 1)) * w},${h - ((d - min) / (max - min || 1)) * (h - 4) - 2}`);
  return (
    <svg width={w} height={h} className={cn("overflow-visible", className)}>
      <polyline points={pts.join(" ")} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function KpiCard({
  label, value, icon: Icon, tone = "primary", spark, hint,
}: { label: string; value: number | string; icon: LucideIcon; tone?: "primary" | "success" | "warning" | "destructive"; spark: number[]; hint?: string }) {
  const toneCls = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning-foreground dark:text-warning bg-warning/15",
    destructive: "text-destructive bg-destructive/10",
  }[tone];
  const sparkCls = { primary: "text-primary", success: "text-success", warning: "text-warning", destructive: "text-destructive" }[tone];
  return (
    <div className="rounded-2xl border bg-card p-4 transition-shadow hover:shadow-lift">
      <div className="flex items-start justify-between">
        <div className={cn("grid size-9 place-items-center rounded-lg", toneCls)}>
          <Icon className="size-4.5" />
        </div>
        <Sparkline data={spark} className={sparkCls} />
      </div>
      <div className="mt-3 text-3xl font-bold tnum">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

const EVENT_ICON: Record<EventType, { icon: LucideIcon; cls: string }> = {
  REQUEST_CREATED: { icon: Send, cls: "text-primary bg-primary/10" },
  MATCHES_RANKED: { icon: Activity, cls: "text-primary bg-primary/10" },
  RESERVATION_REQUESTED: { icon: Hourglass, cls: "text-primary bg-primary/10" },
  ACCEPTED: { icon: Check, cls: "text-success bg-success/10" },
  HELD: { icon: ShieldCheck, cls: "text-success bg-success/10" },
  REJECTED: { icon: XCircle, cls: "text-destructive bg-destructive/10" },
  TIMEOUT: { icon: Clock, cls: "text-destructive bg-destructive/10" },
  FALLBACK: { icon: RefreshCw, cls: "text-warning-foreground dark:text-warning bg-warning/15" },
  CANCELLED: { icon: X, cls: "text-muted-foreground bg-muted" },
  RELEASED: { icon: Undo2, cls: "text-muted-foreground bg-muted" },
  NO_CANDIDATES: { icon: AlertTriangle, cls: "text-destructive bg-destructive/10" },
  AVAILABILITY_UPDATED: { icon: RefreshCw, cls: "text-muted-foreground bg-muted" },
  LOGIN: { icon: LogIn, cls: "text-muted-foreground bg-muted" },
  VIEWED: { icon: Activity, cls: "text-primary bg-primary/10" },
  ARRIVED: { icon: ShieldCheck, cls: "text-success bg-success/10" },
};

export function EventTimelineItem({ event, last, showMeta = true }: { event: AppEvent; last?: boolean; showMeta?: boolean }) {
  const s = EVENT_ICON[event.type];
  return (
    <motion.div layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="relative flex gap-3 pb-4">
      {!last && <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />}
      <div className={cn("grid size-8 shrink-0 place-items-center rounded-full", s.cls)}>
        <s.icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <div className="text-sm font-medium">{event.message}</div>
          <div className="text-xs text-muted-foreground tnum">{new Date(event.ts).toLocaleTimeString()}</div>
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="font-mono">{event.type}</span> · {event.actor}
        </div>
        {showMeta && event.meta && (
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(event.meta).map(([k, v]) => (
              <span key={k} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                {k}: {String(v)}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function StepperControl({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Decrease"
        disabled={value <= 0}
        onClick={() => onChange(value - 1)}
        className="grid size-12 place-items-center rounded-xl border bg-card text-foreground transition active:scale-95 disabled:opacity-40"
      >
        <Minus className="size-5" />
      </button>
      <div className="w-14 text-center">
        <div className="text-2xl font-bold tnum">{value}</div>
        <div className="text-[11px] text-muted-foreground tnum">of {max}</div>
      </div>
      <button
        type="button"
        aria-label="Increase"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground transition active:scale-95 disabled:opacity-40"
      >
        <Plus className="size-5" />
      </button>
    </div>
  );
}

export function hospitalAvailability(h: { resources: Record<ResourceKey, { available: number; total: number }>; updated_at: number }, now: number) {
  if (freshnessLevel((now - h.updated_at) / 1000) === "stale") return "stale" as const;
  const icu = h.resources.icu;
  if (icu.available === 0) return "occupied" as const;
  if (icu.available / icu.total < 0.25) return "limited" as const;
  return "available" as const;
}
