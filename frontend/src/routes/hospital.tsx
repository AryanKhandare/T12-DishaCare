import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, Ambulance, BellRing, Check, CheckCircle2, Clock, CloudOff, Copy, Loader2, MapPin, Phone,
  RotateCcw, Ban, Undo2, Users, X, XCircle, ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BrandMark, DemoTools, ThemeToggle, UserMenu } from "@/components/bedlink/AppHeader";
import { CountdownRing, DemoBadge, FreshnessBadge, RESOURCE_META, StepperControl } from "@/components/bedlink/primitives";
import { requireRole } from "@/lib/guards";
import { useSim } from "@/lib/sim-store";
import { useAuth } from "@/lib/auth-store";
import {
  acceptReservation,
  getHospital,
  getHospitalReservations,
  getMyEmergencies,
  getMyHospital,
  markArrived,
  patchAvailability,
  rejectReservation,
  releaseReservation,
} from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { createSeedHospitals, DECLINE_REASONS, getAmbulance, reasonLabel } from "@/lib/seed";
import { etaMinutes, haversineKm } from "@/lib/matching";
import { useNow, timeAgo, clock } from "@/hooks/use-now";
import type { EmergencyRequest, Hospital, Reservation, ResourceKey } from "@/lib/types";
import { RESOURCE_KEYS, TOGGLE_RESOURCES } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hospital")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Hospital availability — BedLink" },
      { name: "description", content: "Nurse console: update bed availability, accept or decline incoming ambulance requests, and track active holds." },
      { property: "og:title", content: "Hospital availability — BedLink" },
      { property: "og:description", content: "Update availability in seconds and respond to incoming requests." },
    ],
  }),
  beforeLoad: () => requireRole("hospital"),
  component: HospitalPage,
});

function HospitalPage() {
  const user = useAuth((s) => s.user);
  const hospitals = useSim((s) => s.hospitals);
  const reservations = useSim((s) => s.reservations);
  const requests = useSim((s) => s.requests);
  const [adminPick, setAdminPick] = useState("h-city");
  const hospitalId = user?.role === "admin" ? adminPick : user?.hospital_id ?? (user as any)?.hospitalId ?? "h-city";
  const [loadingHospital, setLoadingHospital] = useState(!hospitals.some((x) => x.id === hospitalId));
  const h = hospitals.find((x) => x.id === hospitalId);
  const now = useNow(500);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(true);
  const seen = useRef<Set<string>>(new Set());

  // 1. Join Socket.IO hospital room on connect/mount
  useEffect(() => {
    const socket = getSocket();
    if (socket && hospitalId) {
      socket.emit("JOIN_HOSPITAL_ROOM", { hospitalId });
    }
  }, [hospitalId]);

  // 2. Fetch and sync real hospital availability and reservations directly from PostgreSQL
  useEffect(() => {
    let cancelled = false;

    const syncFromDatabase = async () => {
      try {
        // Fetch real hospital profile & availability from DB
        const hospData = await getHospital(hospitalId).catch(() => null);
        if (hospData && !cancelled) {
          useSim.setState((s) => ({
            hospitals: [hospData, ...s.hospitals.filter((x) => x.id !== hospData.id)],
          }));
          setLoadingHospital(false);
        }

        // Fetch real pending and held reservations from PostgreSQL
        const resvs = await getHospitalReservations(hospitalId, "pending").catch(() => []);
        const heldResvs = await getHospitalReservations(hospitalId, "held").catch(() => []);
        const allResvs = [...(Array.isArray(resvs) ? resvs : []), ...(Array.isArray(heldResvs) ? heldResvs : [])];

        if (allResvs.length > 0 && !cancelled) {
          const newEmergencies: EmergencyRequest[] = [];
          allResvs.forEach((r: any) => {
            if (r.emergency) newEmergencies.push(r.emergency);
          });

          useSim.setState((s) => {
            const mergedResvs = [...s.reservations];
            allResvs.forEach((r: any) => {
              const idx = mergedResvs.findIndex((x) => x.id === r.id);
              if (idx >= 0) {
                mergedResvs[idx] = { ...mergedResvs[idx], ...r };
              } else {
                mergedResvs.unshift(r);
              }
            });
            const mergedRequests = [...s.requests];
            newEmergencies.forEach((e) => {
              if (!mergedRequests.some((x) => x.id === e.id)) {
                mergedRequests.unshift(e);
              }
            });
            return { reservations: mergedResvs, requests: mergedRequests };
          });
        }

        // Fetch broadcast emergency requests for this hospital
        const emergList = await getMyEmergencies().catch(() => []);
        if (Array.isArray(emergList) && emergList.length > 0 && !cancelled) {
          useSim.setState((s) => ({
            requests: [
              ...emergList.filter((e) => !s.requests.some((x) => x.id === e.id)),
              ...s.requests,
            ],
          }));
        }
      } catch (err) {
        console.warn("[Hospital Sync] Database sync warning:", err);
      } finally {
        if (!cancelled) setLoadingHospital(false);
      }
    };

    syncFromDatabase();
    const interval = setInterval(syncFromDatabase, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [hospitalId]);

  const pending = reservations
    .filter((r) => r.hospital_id === hospitalId && r.status === "RESERVATION_REQUESTED" && now >= r.starts_at)
    .sort((a, b) => a.starts_at - b.starts_at);
  const holds = reservations
    .filter((r) => r.hospital_id === hospitalId && r.status === "HELD" && !r.arrived_at)
    .sort((a, b) => (b.resolved_at ?? 0) - (a.resolved_at ?? 0));
  const recent = reservations
    .filter((r) => r.hospital_id === hospitalId && ["HELD", "REJECTED", "TIMEOUT", "RELEASED"].includes(r.status) && (r.status !== "HELD" || r.arrived_at))
    .sort((a, b) => (b.resolved_at ?? b.created_at) - (a.resolved_at ?? a.created_at))
    .slice(0, 8);

  const reqOf = (r: Reservation): EmergencyRequest => {
    const found = requests.find((q) => q.id === r.request_id);
    if (found) return found;
    if ((r as any).emergency) return (r as any).emergency;
    return {
      id: r.request_id,
      type: "Trauma",
      severity: "Critical",
      ambulance_id: "A12",
      resources: (r.held && Object.keys(r.held).length > 0 ? Object.keys(r.held) : ["icu", "ventilator"]) as any,
      location: { lat: h?.lat || 19.0178, lng: h?.lng || 72.8478, label: "Emergency Location" },
      status: r.status === "HELD" ? "held" : "reserving",
      created_at: r.created_at,
      reservation_ids: [r.id],
    };
  };

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => { setOnline(true); toast.success("Back online — queued updates synced"); };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Alert on newly arrived requests: vibration + toast if scrolled away
  const pendingKey = pending.map((p) => p.id).join(",");
  useEffect(() => {
    const fresh = pending.filter((p) => !seen.current.has(p.id));
    fresh.forEach((p) => seen.current.add(p.id));
    if (!fresh.length) return;
    try { navigator.vibrate?.([200, 100, 200]); } catch { /* unsupported */ }
    if (window.scrollY > 120) {
      toast.error("New emergency request", {
        description: "Scroll up to respond",
        action: { label: "View", onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingKey]);

  if (!h && loadingHospital) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-semibold text-muted-foreground">Connecting to hospital portal & database...</p>
        </div>
      </div>
    );
  }

  if (!h) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertTriangle className="size-8 text-amber-500" />
          <p className="text-sm font-semibold text-foreground">Hospital record not found in database ({hospitalId})</p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const save = (patch: Partial<Record<ResourceKey, number>>) => {
    setSaving(true);
    void patchAvailability(h.id, patch).then(() => {
      setSavedAt(Date.now());
      setTimeout(() => setSaving(false), 250);
    });
  };

  return (
    <div className="min-h-screen bg-muted/50">
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-background shadow-lift">
        <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
          <div className="flex h-14 items-center gap-1 px-3">
            <BrandMark className="flex-1" />
            {pending.length > 0 && (
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="relative mr-1 grid size-10 place-items-center rounded-lg text-destructive"
                aria-label={`${pending.length} pending requests`}
              >
                <BellRing className="size-5" />
                <span className="absolute right-0.5 top-0.5 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground tnum">
                  {pending.length}
                </span>
              </button>
            )}
            <ThemeToggle />
            <DemoTools />
            <UserMenu compact />
          </div>
          <div className="px-4 pb-3">
            {user?.role === "admin" ? (
              <select value={adminPick} onChange={(e) => setAdminPick(e.target.value)} className="h-11 w-full rounded-lg border bg-card px-2 text-lg font-bold">
                {hospitals.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            ) : (
              <h1 className="text-xl font-bold">{h.name}</h1>
            )}
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground tnum">Updated {timeAgo(h.updated_at, now)}</span>
              <DemoBadge />
              <span className={cn("flex items-center gap-1.5 text-xs font-medium", saving ? "text-primary" : "text-success")}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                {saving ? "Saving…" : savedAt ? `Saved ${now - savedAt < 5000 ? "just now" : timeAgo(savedAt, now)}` : "Auto-save on"}
              </span>
            </div>
          </div>
          <AnimatePresence>
            {!online && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden bg-warning text-warning-foreground">
                <div className="flex items-center gap-2 px-4 py-2 text-sm font-semibold">
                  <CloudOff className="size-4" /> Offline — updates queued
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        <main className="flex-1 space-y-5 p-4">
          {/* Incoming requests queue (oldest first) */}
          <AnimatePresence initial={false}>
            {pending.map((r, i) => {
              const req = reqOf(r);
              return req ? <IncomingCard key={r.id} res={r} req={req} hospital={h} queuePos={i} queueLen={pending.length} /> : null;
            })}
          </AnimatePresence>

          {holds.length > 0 && (
            <section className="space-y-3">
              <SectionTitle icon={ShieldCheck} tone="text-success">Active holds · {holds.length}</SectionTitle>
              <AnimatePresence initial={false}>
                {holds.map((r) => {
                  const req = reqOf(r);
                  return req ? <HoldCard key={r.id} res={r} req={req} hospital={h} /> : null;
                })}
              </AnimatePresence>
            </section>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionTitle>Availability</SectionTitle>
              <FreshnessBadge updatedAt={h.updated_at} />
            </div>
            {RESOURCE_KEYS.map((k) => {
              const M = RESOURCE_META[k];
              const r = h.resources[k];
              const toggle = TOGGLE_RESOURCES.includes(k);
              return (
                <div key={k} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
                  <div className={cn("grid size-11 place-items-center rounded-xl", r.available > 0 ? "bg-success/10 text-success" : "bg-muted text-muted-foreground")}>
                    <M.icon className="size-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{M.label}</div>
                    <div className={cn("text-xs font-medium", r.available > 0 ? "text-success" : "text-destructive")}>
                      {toggle ? (r.available > 0 ? "Accepting" : "Unavailable") : r.available > 0 ? `${r.available} available` : "Full"}
                    </div>
                  </div>
                  {toggle ? (
                    <Switch className="scale-125" checked={r.available > 0} onCheckedChange={(c) => save({ [k]: c ? 1 : 0 })} aria-label={M.label} />
                  ) : (
                    <StepperControl value={r.available} max={r.total} onChange={(v) => save({ [k]: v })} />
                  )}
                </div>
              );
            })}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-12 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => { save(Object.fromEntries(RESOURCE_KEYS.map((k) => [k, 0]))); toast("All resources marked full"); }}
              >
                <Ban className="size-4" /> All full
              </Button>
              <Button
                variant="outline"
                className="h-12"
                onClick={() => {
                  const seed = createSeedHospitals(0).find((x) => x.id === h.id);
                  if (seed) save(Object.fromEntries(RESOURCE_KEYS.map((k) => [k, seed.resources[k].available])));
                  toast("Reset to baseline");
                }}
              >
                <RotateCcw className="size-4" /> Reset
              </Button>
            </div>
          </section>

          <section className="space-y-2 pb-4">
            <SectionTitle>Recent decisions</SectionTitle>
            {recent.length === 0 ? (
              <p className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">No decisions yet.</p>
            ) : (
              recent.map((r) => <DecisionRow key={r.id} res={r} req={reqOf(r)} now={now} />)
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function SectionTitle({ children, icon: Icon, tone }: { children: React.ReactNode; icon?: typeof Check; tone?: string }) {
  return (
    <h2 className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground", tone)}>
      {Icon && <Icon className="size-4" />} {children}
    </h2>
  );
}

function etaFor(req: EmergencyRequest, h: Hospital) {
  return Math.max(1, Math.round(etaMinutes(haversineKm(req.location, h))));
}

function IncomingCard({ res, req, hospital, queuePos, queueLen }: { res: Reservation; req: EmergencyRequest; hospital: Hospital; queuePos: number; queueLen: number }) {
  const user = useAuth((s) => s.user);
  const [busy, setBusy] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const eta = etaFor(req, hospital);

  useEffect(() => {
    useSim.getState().markViewed(res.id, user?.name ?? "nurse");
  }, [res.id, user?.name]);

  const accept = async () => {
    if (busy) return;
    setBusy(true);
    await acceptReservation(res.id);
    toast.success("Bed held — ambulance details unlocked");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="overflow-hidden rounded-2xl border-2 border-destructive/60 bg-card shadow-lift"
    >
      <div className="relative bg-destructive px-4 py-3 text-destructive-foreground">
        <motion.div className="absolute inset-0 bg-destructive-foreground/10" animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.8 }} />
        <div className="relative flex items-center justify-between text-sm font-semibold uppercase tracking-wide">
          <span className="flex items-center gap-2">
            <motion.span animate={{ rotate: [0, -15, 15, -10, 0] }} transition={{ repeat: Infinity, duration: 1.2, repeatDelay: 0.8 }}>
              <BellRing className="size-5" />
            </motion.span>
            New Emergency Request
          </span>
          {queueLen > 1 && <span className="rounded-full bg-destructive-foreground/20 px-2 py-0.5 text-xs tnum">{queuePos + 1} of {queueLen}</span>}
        </div>
      </div>
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold">{req.type} Emergency</h3>
            <span className={cn(
              "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
              req.severity === "Critical" ? "bg-destructive/10 text-destructive" : req.severity === "Serious" ? "bg-warning/15 text-warning-foreground dark:text-warning" : "bg-success/10 text-success",
            )}>
              <AlertTriangle className="size-3" /> {req.severity}
            </span>
            <div className="mt-3 space-y-1 text-sm">
              <div className="flex items-center gap-1.5"><Ambulance className="size-4 text-primary" /> Ambulance <b className="tnum">{req.ambulance_id}</b></div>
              <div className="flex items-center gap-1.5"><Clock className="size-4 text-muted-foreground" /> ETA <b className="tnum">{eta} min</b></div>
              <div className="text-xs text-muted-foreground tnum">Received {clock(res.starts_at)}</div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-[11px] font-medium text-muted-foreground">Respond within</div>
            <CountdownRing startsAt={res.starts_at} expiresAt={res.expires_at} size={112} />
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Required resources</div>
          <div className="flex flex-wrap gap-2">
            {req.resources.length === 0 && <span className="text-sm text-muted-foreground">General bed</span>}
            {req.resources.map((k) => {
              const M = RESOURCE_META[k];
              const ok = hospital.resources[k].available > 0;
              return (
                <span key={k} className={cn("inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium", ok ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10")}>
                  <M.icon className="size-4" /> {M.label}
                  {ok ? <CheckCircle2 className="size-4 text-success" aria-label="available" /> : <AlertTriangle className="size-4 text-destructive" aria-label="not available" />}
                  <span className="sr-only">{ok ? "available" : "not available"}</span>
                </span>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-[1fr_2fr] gap-2">
          <Button
            variant="outline"
            className="h-12 border-destructive/50 text-base text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={busy}
            onClick={() => setDeclineOpen(true)}
          >
            <X className="size-5" /> Decline
          </Button>
          <Button className="h-12 bg-success text-base text-success-foreground hover:bg-success/90" disabled={busy} onClick={accept}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-5" />} Accept & Hold Bed
          </Button>
        </div>
      </div>
      <DeclineSheet open={declineOpen} onOpenChange={setDeclineOpen} res={res} hospital={hospital} />
    </motion.div>
  );
}

function DeclineSheet({ open, onOpenChange, res, hospital }: { open: boolean; onOpenChange: (o: boolean) => void; res: Reservation; hospital: Hospital }) {
  const [sel, setSel] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [zeroOut, setZeroOut] = useState(true);
  const [busy, setBusy] = useState(false);
  const live = useSim((s) => s.reservations.find((r) => r.id === res.id)?.status === "RESERVATION_REQUESTED");
  const resourceKeys = DECLINE_REASONS.filter((r) => sel.includes(r.id) && r.resource).map((r) => r.resource!) as ResourceKey[];
  const valid = sel.length > 0 && (!sel.includes("other") || note.trim().length > 0);

  useEffect(() => {
    if (open && !live) { onOpenChange(false); toast("Request timed out while declining"); }
  }, [open, live, onOpenChange]);

  const confirm = async () => {
    if (!valid || busy) return;
    setBusy(true);
    if (zeroOut && resourceKeys.length) await patchAvailability(hospital.id, Object.fromEntries(resourceKeys.map((k) => [k, 0])));
    await rejectReservation(res.id, { reasons: sel, note: sel.includes("other") ? note.trim() : undefined });
    toast("Request declined. Dispatcher notified.");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <SheetContent side="bottom" className="mx-auto max-h-[90vh] max-w-[480px] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Why are you declining?</SheetTitle>
          <SheetDescription>Select all that apply. The countdown keeps running.</SheetDescription>
        </SheetHeader>
        <div className="mt-2 flex justify-center"><CountdownRing startsAt={res.starts_at} expiresAt={res.expires_at} size={72} /></div>
        <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Decline reasons">
          {DECLINE_REASONS.map((r) => {
            const on = sel.includes(r.id);
            const Icon = r.resource ? RESOURCE_META[r.resource].icon : r.id === "other" ? AlertTriangle : r.id === "specialist" ? Users : Ban;
            return (
              <button
                key={r.id}
                type="button"
                aria-pressed={on}
                onClick={() => setSel((s) => (on ? s.filter((x) => x !== r.id) : [...s, r.id]))}
                className={cn(
                  "flex min-h-14 items-center gap-2 rounded-xl border p-3 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  on ? "border-destructive bg-destructive/10 text-destructive" : "bg-card hover:bg-muted",
                )}
              >
                <Icon className="size-4 shrink-0" /> <span className="flex-1">{r.label}</span>
                {on && <Check className="size-4 shrink-0" />}
              </button>
            );
          })}
        </div>
        {sel.includes("other") && (
          <div className="mt-3">
            <Textarea value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} placeholder="Short reason (required)" aria-label="Other reason" />
            <div className="mt-1 text-right text-xs text-muted-foreground tnum">{note.length}/140</div>
          </div>
        )}
        {resourceKeys.length > 0 && (
          <label className="mt-3 flex min-h-12 items-center gap-3 rounded-xl border bg-muted/40 p-3 text-sm">
            <Checkbox checked={zeroOut} onCheckedChange={(c) => setZeroOut(!!c)} />
            Also mark {resourceKeys.map((k) => RESOURCE_META[k].label).join(", ")} as 0 available
          </label>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2 pb-2">
          <Button variant="outline" className="h-12" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" className="h-12" disabled={!valid || busy} onClick={confirm}>
            {busy && <Loader2 className="size-4 animate-spin" />} Confirm Decline
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const HOLD_MS = 15 * 60_000;

function HoldCard({ res, req, hospital }: { res: Reservation; req: EmergencyRequest; hospital: Hospital }) {
  const now = useNow(1000);
  const amb = getAmbulance(req.ambulance_id);
  const [busy, setBusy] = useState<"arrive" | "release" | null>(null);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const accepted = res.resolved_at ?? now;
  const totalEta = etaFor(req, hospital);
  const remainingEta = Math.max(0, Math.ceil(totalEta - (now - accepted) / 60_000));
  const holdLeft = Math.max(0, accepted + HOLD_MS - now);

  const copy = (v: string) => { void navigator.clipboard?.writeText(v); toast.success("Number copied"); };

  return (
    <motion.div layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} className="overflow-hidden rounded-2xl border-2 border-success/50 bg-card">
      <div className="flex items-center justify-between bg-success px-4 py-2.5 text-success-foreground">
        <span className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-5" /> Accepted — Bed Held</span>
        <span className="text-sm font-semibold tnum">{remainingEta > 0 ? `Arriving in ${remainingEta} min` : "Arriving now"}</span>
      </div>
      <div className="space-y-3 p-4 text-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-lg font-bold tnum">{amb.vehicle_number}</div>
            <div className="text-muted-foreground">Ambulance {req.ambulance_id} · {amb.operator_name}</div>
          </div>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium"><Users className="mr-1 inline size-3" />Crew {amb.crew_size}</span>
        </div>
        <Contact role="Driver" name={amb.driver_name} phone={amb.driver_phone} onCopy={copy} />
        <Contact role="Paramedic lead" name={amb.paramedic_name} phone={amb.paramedic_phone} onCopy={copy} />
        <div className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="size-4" /> {req.location.label}</div>
        <div className="rounded-xl bg-muted/50 p-3">
          <div className="font-semibold">{req.type} · {req.severity}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {req.resources.map((k) => {
              const M = RESOURCE_META[k];
              return <span key={k} className="inline-flex items-center gap-1 rounded-lg border bg-card px-2 py-1 text-xs"><M.icon className="size-3.5" />{M.label}</span>;
            })}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Held: {Object.keys(res.held).map((k) => RESOURCE_META[k as ResourceKey].label).join(", ") || "unit reserved"} · Hold expires if ambulance doesn't arrive (<span className="tnum">{Math.ceil(holdLeft / 60000)} min</span> left)
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button asChild variant="outline" className="h-12">
            <a href={`tel:${amb.driver_phone.replace(/\s/g, "")}`}><Phone className="size-4" /> Call</a>
          </Button>
          <Button
            className="h-12 bg-success text-success-foreground hover:bg-success/90"
            disabled={!!busy}
            onClick={async () => { setBusy("arrive"); await markArrived(res.id); toast.success("Arrival logged — bed now occupied"); }}
          >
            {busy === "arrive" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Arrived
          </Button>
          <Button variant="outline" className="h-12" disabled={!!busy} onClick={() => setReleaseOpen(true)}>
            <Undo2 className="size-4" /> Release
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Names and numbers are simulated demo data.</p>
      </div>
      <ReleaseSheet
        open={releaseOpen}
        onOpenChange={setReleaseOpen}
        onConfirm={async (reason) => { setBusy("release"); await releaseReservation(res.id, reason); toast("Hold released — resources returned"); }}
      />
    </motion.div>
  );
}

function Contact({ role, name, phone, onCopy }: { role: string; name: string; phone: string; onCopy: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border p-2 pl-3">
      <div className="flex-1">
        <div className="text-xs text-muted-foreground">{role}</div>
        <div className="font-semibold">{name}</div>
        <div className="text-xs tnum">{phone}</div>
      </div>
      <Button asChild variant="ghost" size="icon" className="size-11" aria-label={`Call ${role}`}>
        <a href={`tel:${phone.replace(/\s/g, "")}`}><Phone className="size-4" /></a>
      </Button>
      <Button variant="ghost" size="icon" className="size-11" aria-label={`Copy ${role} number`} onClick={() => onCopy(phone)}>
        <Copy className="size-4" />
      </Button>
    </div>
  );
}

const RELEASE_REASONS = ["Ambulance cancelled", "Patient diverted", "Other"];

function ReleaseSheet({ open, onOpenChange, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; onConfirm: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Sheet open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <SheetContent side="bottom" className="mx-auto max-w-[480px] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Release this hold?</SheetTitle>
          <SheetDescription>Held resources go back into availability.</SheetDescription>
        </SheetHeader>
        <div className="mt-3 grid gap-2">
          {RELEASE_REASONS.map((r) => (
            <button key={r} type="button" aria-pressed={reason === r} onClick={() => setReason(r)}
              className={cn("flex min-h-12 items-center justify-between rounded-xl border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", reason === r ? "border-primary bg-primary/10 text-primary" : "bg-card hover:bg-muted")}>
              {r} {reason === r && <Check className="size-4" />}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 pb-2">
          <Button variant="outline" className="h-12" disabled={busy} onClick={() => onOpenChange(false)}>Keep hold</Button>
          <Button variant="destructive" className="h-12" disabled={!reason || busy}
            onClick={async () => { setBusy(true); await onConfirm(reason!); setBusy(false); onOpenChange(false); }}>
            {busy && <Loader2 className="size-4 animate-spin" />} Release Hold
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DecisionRow({ res, req, now }: { res: Reservation; req?: EmergencyRequest | undefined; now: number }) {
  const map = {
    HELD: { icon: ShieldCheck, txt: "Arrived", cls: "text-success bg-success/10" },
    RELEASED: { icon: Undo2, txt: "Released", cls: "text-muted-foreground bg-muted" },
    REJECTED: { icon: XCircle, txt: "Declined", cls: "text-destructive bg-destructive/10" },
    TIMEOUT: { icon: Clock, txt: "Missed", cls: "text-destructive bg-destructive/10" },
  } as const;
  const s = map[res.status as keyof typeof map];
  if (!s) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-3 text-sm">
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", s.cls)}><s.icon className="size-4" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-2">
          <span className="font-semibold">{s.txt} · {req?.type ?? "Request"} ({req?.ambulance_id})</span>
          <span className="shrink-0 text-xs text-muted-foreground tnum">{timeAgo(res.resolved_at ?? res.created_at, now)}</span>
        </div>
        {res.status === "REJECTED" && (
          <div className="text-xs text-muted-foreground">
            {res.reject_reasons?.map(reasonLabel).join(", ") || "No reason"}{res.reject_note ? ` — “${res.reject_note}”` : ""}
          </div>
        )}
        {res.status === "RELEASED" && res.release_reason && <div className="text-xs text-muted-foreground">{res.release_reason}</div>}
      </div>
    </div>
  );
}
