import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Inbox } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useSim } from "@/lib/sim-store";
import { clock } from "@/hooks/use-now";
import { StatusPill } from "./primitives";
import { TimelineDrawer } from "./TimelineDrawer";
import type { ReservationStatus } from "@/lib/types";

type Tab = "all" | "active" | "completed" | "timeouts";
const MATCH: Record<Tab, (s: ReservationStatus) => boolean> = {
  all: () => true,
  active: (s) => s === "RESERVATION_REQUESTED" || s === "HELD",
  completed: (s) => s === "HELD" || s === "RELEASED",
  timeouts: (s) => s === "TIMEOUT" || s === "REJECTED",
};

export function ReservationHistory({ title, subtitle, defaultTab = "all" }: { title: string; subtitle: string; defaultTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [open, setOpen] = useState<string | null>(null);
  const reservations = useSim((s) => s.reservations);
  const requests = useSim((s) => s.requests);
  const hospitals = useSim((s) => s.hospitals);
  const release = useSim((s) => s.release);
  const rows = reservations.filter((r) => MATCH[tab](r.status));
  const count = (t: Tab) => reservations.filter((r) => MATCH[t](r.status)).length;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="h-11">
          {(["all", "active", "completed", "timeouts"] as Tab[]).map((t) => (
            <TabsTrigger key={t} value={t} className="h-9 px-4 capitalize">
              {t} <span className="ml-1.5 text-xs opacity-60 tnum">{count(t)}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="rounded-2xl border bg-card">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Inbox className="size-10 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">Nothing here yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Run the demo scenario from the dispatch workspace to generate reservations and a full event trail.</p>
            <Button asChild variant="outline" className="mt-4"><Link to="/dispatch">Open dispatch</Link></Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Hospital</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const req = requests.find((x) => x.id === r.request_id);
                return (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpen(r.request_id)}>
                    <TableCell className="tnum">{clock(r.created_at)}</TableCell>
                    <TableCell className="font-medium">{hospitals.find((h) => h.id === r.hospital_id)?.name}</TableCell>
                    <TableCell><StatusPill status={r.status} /></TableCell>
                    <TableCell className="text-muted-foreground">
                      {req?.type} · {req?.ambulance_id} · attempt {r.attempt} · score {Math.round(r.score * 100)}%
                    </TableCell>
                    <TableCell>
                      {r.status === "HELD" ? (
                        <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); release(r.id, "admin"); }}>Release</Button>
                      ) : (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
      <TimelineDrawer requestId={open} onOpenChange={(o) => !o && setOpen(null)} />
    </div>
  );
}
