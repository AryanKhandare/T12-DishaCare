import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Ambulance, Check, History, Navigation, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import { useSim } from "@/lib/sim-store";
import { rankHospitals } from "@/lib/matching";
import { reasonLabel } from "@/lib/seed";
import type { EmergencyRequest, Reservation } from "@/lib/types";
import { AttemptChain, CountdownRing, RESOURCE_META, ReservationStepper, type AttemptItem } from "./primitives";

export function ReservationPanel({
  request, onCancel, onTimeline, onDirections, onNew,
}: {
  request: EmergencyRequest;
  onCancel: () => void;
  onTimeline: () => void;
  onDirections: (hospitalId: string) => void;
  onNew: () => void;
}) {
  const now = useNow(250);
  const allRes = useSim((s) => s.reservations);
  const hospitals = useSim((s) => s.hospitals);
  const reservations = allRes.filter((r) => r.request_id === request.id).sort((a, b) => a.attempt - b.attempt);
  const current = reservations[reservations.length - 1];
  const name = (id: string) => hospitals.find((h) => h.id === id)?.name ?? id;
  if (!current) return null;

  const transitioning = current.status === "RESERVATION_REQUESTED" && now < current.starts_at;
  const chain = buildChain(reservations, request, hospitals, name);

  let view: "pending" | "fallback" | "success" | "failed" = "pending";
  if (request.status === "held" || request.status === "completed") view = "success";
  else if (request.status === "failed") view = "failed";
  else if (transitioning) view = "fallback";

  return (
    <div className="flex h-full flex-col">
      <AnimatePresence mode="wait">
        <motion.div
          key={view + current.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.25 }}
          className="flex-1 overflow-y-auto p-5"
        >
          {view === "pending" && (
            <Pending request={request} res={current} hospitalName={name(current.hospital_id)} chain={reservations.length > 1 ? chain : null} onCancel={onCancel} />
          )}
          {view === "fallback" && <Fallback chain={chain} prevStatus={reservations[reservations.length - 2]?.status} prevReasons={reservations[reservations.length - 2]?.reject_reasons?.map(reasonLabel).join(", ")} />}
          {view === "success" && (
            <Success
              request={request}
              hospitalName={name(current.hospital_id)}
              res={current}
              onTimeline={onTimeline}
              onDirections={() => onDirections(current.hospital_id)}
              onNew={onNew}
            />
          )}
          {view === "failed" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-7" />
              </div>
              <h3 className="text-xl font-bold">No eligible hospitals remain</h3>
              <p className="text-sm text-muted-foreground">Escalate via phone to the control room. Every attempt is in the timeline.</p>
              <AttemptChain items={chain} />
              <div className="flex gap-2">
                <Button variant="outline" className="h-11 flex-1" onClick={onTimeline}>View Timeline</Button>
                <Button className="h-11 flex-1" onClick={onNew}>New Request</Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function buildChain(
  reservations: Reservation[], request: EmergencyRequest, hospitals: ReturnType<typeof useSim.getState>["hospitals"], name: (id: string) => string,
): AttemptItem[] {
  const items: AttemptItem[] = reservations.map((r) => ({
    name: name(r.hospital_id),
    state:
      r.status === "TIMEOUT" ? "timeout" : r.status === "REJECTED" ? "rejected" : r.status === "HELD" || r.status === "RELEASED" ? "held" : "pending",
    detail:
      r.status === "REJECTED"
        ? `declined: ${r.reject_reasons?.length ? r.reject_reasons.map(reasonLabel).join(", ") : "no reason"}${r.reject_note ? ` — “${r.reject_note}”` : ""}`
        : r.status === "TIMEOUT"
          ? "no response in 2:00"
          : r.status === "RESERVATION_REQUESTED"
            ? r.viewed_at ? "hospital viewing" : "sent"
            : undefined,
  }));
  const last = reservations[reservations.length - 1];
  if (last?.status === "RESERVATION_REQUESTED") {
    const next = rankHospitals(request, hospitals, Date.now(), reservations.map((r) => r.hospital_id))[0];
    if (next) items.push({ name: name(next.hospital_id), state: "queued" });
  }
  return items;
}

function Pending({
  request, res, hospitalName, chain, onCancel,
}: { request: EmergencyRequest; res: Reservation; hospitalName: string; chain: AttemptItem[] | null; onCancel: () => void }) {
  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-primary">Reservation in progress · attempt {res.attempt}</div>
        <h3 className="mt-1 text-xl font-bold">{hospitalName}</h3>
        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span>{request.type} emergency</span>·
          <span className="flex items-center gap-1"><Ambulance className="size-3.5" /> {request.ambulance_id}</span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-3 rounded-2xl border bg-muted/40 py-6">
        <CountdownRing startsAt={res.starts_at} expiresAt={res.expires_at} />
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          {res.viewed_at ? "Hospital viewing your request…" : "Sent — awaiting hospital response…"}
        </div>
      </div>
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Required resources</div>
        <div className="flex flex-wrap gap-1.5">
          {request.resources.map((k) => {
            const M = RESOURCE_META[k];
            return (
              <span key={k} className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 text-sm">
                <M.icon className="size-4 text-primary" /> {M.label}
              </span>
            );
          })}
        </div>
      </div>
      <ReservationStepper step={1} />
      {chain && (
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attempt chain</div>
          <AttemptChain items={chain} />
        </div>
      )}
      <Button variant="outline" className="h-11 w-full" onClick={onCancel}>Cancel Request</Button>
    </div>
  );
}

function Fallback({ chain, prevStatus, prevReasons }: { chain: AttemptItem[]; prevStatus?: string | undefined; prevReasons?: string | undefined }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-full bg-destructive text-destructive-foreground">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-destructive">
              {prevStatus === "REJECTED" ? `Hospital declined${prevReasons ? `: ${prevReasons}` : " the request"}` : "Hospital did not respond"}
            </h3>
            <p className="text-sm text-muted-foreground">Automatic fallback engaged — no action needed.</p>
          </div>
        </div>
      </div>
      <AttemptChain items={chain} />
      <div className="flex items-center justify-center gap-2 rounded-xl bg-muted py-3 text-sm font-medium">
        <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="size-4 rounded-full border-2 border-primary border-t-transparent" />
        Requesting bed at next best match…
      </div>
      <ReservationStepper step={1} failed />
    </div>
  );
}

function Success({
  request, hospitalName, res, onTimeline, onDirections, onNew,
}: { request: EmergencyRequest; hospitalName: string; res: Reservation; onTimeline: () => void; onDirections: () => void; onNew: () => void }) {
  return (
    <div className="space-y-5 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        className="mx-auto grid size-20 place-items-center rounded-full bg-success text-success-foreground shadow-lift"
      >
        <motion.svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.25, duration: 0.45 }} />
        </motion.svg>
      </motion.div>
      <div>
        <h3 className="text-2xl font-bold text-success">Bed Reserved Successfully!</h3>
        <p className="text-sm font-medium text-success">Bed held at {hospitalName}{res.arrived_at ? " · ambulance arrived" : ""}</p>
        <p className="mt-1 text-lg font-semibold">{hospitalName}</p>
        <p className="text-sm text-muted-foreground">Attempt {res.attempt} · {request.ambulance_id}</p>
      </div>
      <div className="rounded-2xl border border-success/25 bg-success/10 p-4 text-left">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-success">Confirmed resources</div>
        <div className="space-y-1.5">
          {request.resources.map((k) => {
            const M = RESOURCE_META[k];
            return (
              <div key={k} className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-success" /> <M.icon className="size-4 text-muted-foreground" /> {M.label}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-success/20 pt-3 text-sm font-medium">
          <ShieldCheck className="size-4 text-success" /> Hospital is holding the bed for your ambulance
        </div>
      </div>
      <ReservationStepper step={3} />
      <div className="grid grid-cols-2 gap-2">
        <Button className="h-11" onClick={onDirections}><Navigation className="size-4" /> View Directions</Button>
        <Button variant="outline" className="h-11" onClick={onTimeline}><History className="size-4" /> View Timeline</Button>
      </div>
      <Button variant="ghost" className="h-11 w-full" onClick={onNew}><Plus className="size-4" /> New emergency request</Button>
    </div>
  );
}
