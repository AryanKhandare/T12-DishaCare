import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSim } from "@/lib/sim-store";
import { EventTimelineItem, RESOURCE_META, StatusPill } from "./primitives";

export function TimelineDrawer({ requestId, onOpenChange }: { requestId: string | null; onOpenChange: (o: boolean) => void }) {
  const req = useSim((s) => s.requests.find((r) => r.id === requestId));
  const allEvents = useSim((s) => s.events);
  const events = allEvents.filter((e) => e.request_id === requestId).sort((a, b) => a.ts - b.ts);
  return (
    <Sheet open={!!requestId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle>Request timeline</SheetTitle>
          <SheetDescription className="font-mono text-xs">{requestId}</SheetDescription>
        </SheetHeader>
        {req && (
          <div className="mx-4 mb-4 space-y-2 rounded-xl border bg-muted/50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {req.type} · {req.severity}
              </span>
              <StatusPill status={req.status} />
            </div>
            <div className="text-muted-foreground">Ambulance {req.ambulance_id} · {req.location.label}</div>
            <div className="flex flex-wrap gap-1">
              {req.resources.map((k) => (
                <span key={k} className="rounded-md bg-card px-1.5 py-0.5 text-xs">{RESOURCE_META[k].label}</span>
              ))}
            </div>
          </div>
        )}
        <div className="px-4 pb-6">
          {events.length === 0 && <p className="text-sm text-muted-foreground">No events recorded.</p>}
          {events.map((e, i) => (
            <EventTimelineItem key={e.id} event={e} last={i === events.length - 1} />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
