import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowUpDown, BedDouble, Clock, Hourglass, Siren, CheckCircle2, RefreshCw, Timer, Send } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LazyMap, MapLegend } from "@/components/bedlink/LazyMap";
import { EventTimelineItem, FreshnessBadge, KpiCard, LoadBar, ResourcePill, StatusPill, hospitalAvailability } from "@/components/bedlink/primitives";
import { useSim } from "@/lib/sim-store";
import { computeMetrics } from "@/lib/api";
import { freshnessLevel } from "@/lib/matching";
import { useNow } from "@/hooks/use-now";
import { reasonLabel } from "@/lib/seed";
import { RESOURCE_KEYS, TOGGLE_RESOURCES } from "@/lib/types";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Command Center dashboard — DishaCare" },
      { name: "description", content: "Live network KPIs, capacity, stale listings and the event feed across all hospitals." },
      { property: "og:title", content: "Command Center dashboard — DishaCare" },
      { property: "og:description", content: "Live network KPIs, capacity and event feed." },
    ],
  }),
  component: Dashboard,
});

const spark = (base: number[], last: number) => [...base, last];

function Dashboard() {
  const now = useNow(2000);
  const hospitals = useSim((s) => s.hospitals);
  const events = useSim((s) => s.events);
  useSim((s) => s.reservations);
  useSim((s) => s.requests);
  const m = computeMetrics();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo(
    () => [...hospitals].filter((h) => h.active).sort((a, b) => (sortDir === "desc" ? a.updated_at - b.updated_at : b.updated_at - a.updated_at)),
    [hospitals, sortDir],
  );

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Mumbai network · simulated live data</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active Emergencies" value={m.active_emergencies} icon={Siren} tone="primary" spark={spark([1, 2, 1, 3, 2, 2, 1], m.active_emergencies)} />
        <KpiCard label="Available ICU Beds" value={m.available_icu} icon={BedDouble} tone="success" spark={spark([44, 41, 43, 40, 38, 41, 39], m.available_icu)} />
        <KpiCard label="Pending Reservations" value={m.pending_reservations} icon={Hourglass} tone="warning" spark={spark([0, 1, 0, 2, 1, 0, 1], m.pending_reservations)} />
        <KpiCard label="Stale Listings" value={m.stale_listings} icon={Clock} tone="destructive" spark={spark([2, 3, 3, 4, 3, 4, 4], m.stale_listings)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="relative h-[380px] overflow-hidden rounded-2xl border bg-card">
          <LazyMap hospitals={hospitals} fitKey="admin" />
          <MapLegend className="absolute bottom-3 left-3 z-[400]" />
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-4">
            <h3 className="font-semibold">Today's Operations</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Op icon={Send} label="Emergency requests" value={m.requests_today} />
              <Op icon={CheckCircle2} label="Successful reservations" value={m.successful_reservations} />
              <Op icon={RefreshCw} label="Fallbacks triggered" value={m.fallbacks} />
              <Op icon={Timer} label="Avg response time" value={m.avg_response_sec ? `${m.avg_response_sec}s` : "—"} />
            </div>
          </div>
          <DeclineReasons counts={m.decline_reasons} avg={m.avg_decision_sec} />
          <div className="flex h-[220px] flex-col rounded-2xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-semibold">Recent Events</h3>
              <span className="flex items-center gap-1.5 text-xs text-success"><span className="size-1.5 animate-pulse rounded-full bg-success" /> Live</span>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pt-3">
              {events.length === 0 && <p className="text-sm text-muted-foreground">No events yet. Run a dispatch scenario.</p>}
              <AnimatePresence initial={false}>
                {events.slice(0, 20).map((e, i, arr) => (
                  <EventTimelineItem key={e.id} event={e} last={i === arr.length - 1} showMeta={false} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card">
        <div className="border-b px-4 py-3">
          <h3 className="font-semibold">Capacity</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hospital</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Resources</TableHead>
              <TableHead className="w-48">Load</TableHead>
              <TableHead>
                <button className="flex items-center gap-1 hover:text-foreground" onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}>
                  Freshness <ArrowUpDown className="size-3.5" />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((h) => (
              <TableRow key={h.id}>
                <TableCell>
                  <div className="font-medium">{h.name}</div>
                  <div className="text-xs text-muted-foreground">{h.area}</div>
                </TableCell>
                <TableCell><StatusPill status={hospitalAvailability(h, now)} /></TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {RESOURCE_KEYS.map((k) => <ResourcePill key={k} k={k} count={h.resources[k].available} toggle={TOGGLE_RESOURCES.includes(k)} />)}
                  </div>
                </TableCell>
                <TableCell><LoadBar pct={h.load_pct} /></TableCell>
                <TableCell><FreshnessBadge updatedAt={h.updated_at} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Op({ icon: Icon, label, value }: { icon: typeof Send; label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <Icon className="size-4 text-muted-foreground" />
      <div className="mt-2 text-2xl font-bold tnum">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function DeclineReasons({ counts, avg }: { counts: Record<string, number>; avg: number }) {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Decline reasons</h3>
        <span className="text-xs text-muted-foreground tnum">Avg nurse decision: {avg ? `${avg}s` : "—"}</span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No declines yet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {rows.map(([k, v]) => (
            <div key={k} className="text-sm">
              <div className="flex justify-between"><span>{reasonLabel(k)}</span><span className="font-semibold tnum">{v}</span></div>
              <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-destructive" style={{ width: `${(v / max) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
