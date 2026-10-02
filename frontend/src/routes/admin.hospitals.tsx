import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LazyMap, MapLegend } from "@/components/bedlink/LazyMap";
import { FreshnessBadge, LoadBar, ResourcePill, StatusPill, hospitalAvailability } from "@/components/bedlink/primitives";
import { HospitalDrawer } from "@/components/bedlink/HospitalDrawer";
import { useSim } from "@/lib/sim-store";
import { useNow } from "@/hooks/use-now";
import { RESOURCE_KEYS, TOGGLE_RESOURCES } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/hospitals")({
  head: () => ({
    meta: [
      { title: "Hospital network — BedLink" },
      { name: "description", content: "Search and filter every hospital in the network with a synced map and list view." },
      { property: "og:title", content: "Hospital network — BedLink" },
      { property: "og:description", content: "Search and filter every hospital with a synced map and list." },
    ],
  }),
  component: NetworkView,
});

const FILTERS = ["all", "available", "limited", "occupied", "stale"] as const;

function NetworkView() {
  const hospitals = useSim((s) => s.hospitals);
  const now = useNow(3000);
  const [q, setQ] = useState("");
  const [f, setF] = useState<(typeof FILTERS)[number]>("all");
  const [hover, setHover] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const list = hospitals
    .filter((h) => h.active)
    .filter((h) => (h.name + h.area).toLowerCase().includes(q.toLowerCase()))
    .filter((h) => f === "all" || hospitalAvailability(h, now) === f);
  const counts = Object.fromEntries(FILTERS.map((x) => [x, hospitals.filter((h) => h.active && (x === "all" || hospitalAvailability(h, now) === x)).length]));

  return (
    <div className="flex h-full flex-col p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Hospital Network</h1>
          <p className="text-sm text-muted-foreground">{list.length} of {counts["all"]} active hospitals</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search hospital or area" className="h-11 pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((x) => (
          <button
            key={x}
            onClick={() => setF(x)}
            className={cn("h-10 rounded-full border px-4 text-sm font-medium capitalize transition", f === x ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}
          >
            {x} <span className="ml-1 opacity-70 tnum">{counts[x]}</span>
          </button>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="relative h-[360px] overflow-hidden rounded-2xl border lg:h-auto">
          <LazyMap hospitals={list} highlightId={hover} onHover={setHover} onSelect={setOpen} fitKey={f + q} />
          <MapLegend className="absolute bottom-3 left-3 z-[400]" />
        </div>
        <div className="space-y-2 overflow-y-auto pr-1">
          {list.length === 0 && <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">No hospitals match these filters.</div>}
          {list.map((h) => (
            <button
              key={h.id}
              onMouseEnter={() => setHover(h.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => setOpen(h.id)}
              className={cn("relative w-full overflow-hidden rounded-2xl border bg-card p-4 text-left transition hover:shadow-lift", hover === h.id && "border-primary/40 shadow-lift")}
            >
              {hover === h.id && <span className="absolute inset-y-0 left-0 w-1 bg-primary" />}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{h.name}</div>
                  <div className="text-xs text-muted-foreground">{h.area}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={hospitalAvailability(h, now)} />
                  <FreshnessBadge updatedAt={h.updated_at} compact />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {RESOURCE_KEYS.map((k) => <ResourcePill key={k} k={k} count={h.resources[k].available} toggle={TOGGLE_RESOURCES.includes(k)} />)}
              </div>
              <div className="mt-3"><LoadBar pct={h.load_pct} /></div>
            </button>
          ))}
        </div>
      </div>
      <HospitalDrawer hospital={hospitals.find((h) => h.id === open) ?? null} match={null} open={!!open} onOpenChange={(o) => !o && setOpen(null)} />
    </div>
  );
}
