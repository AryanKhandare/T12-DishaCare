import { Map as MapIcon, Navigation, Clock, Gauge, Route as RouteIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import hospitalImg from "@/assets/hospital.jpg";
import type { Hospital, MatchResult } from "@/lib/types";
import { RESOURCE_KEYS, TOGGLE_RESOURCES } from "@/lib/types";
import { FreshnessBadge, LoadBar, RESOURCE_META, ScoreBreakdownBar, ScoreRing } from "./primitives";
import { ReasonList } from "./HospitalCard";
import { cn } from "@/lib/utils";

export function HospitalDrawer({
  hospital, match, open, onOpenChange, onRequest, onViewMap, canRequest,
}: {
  hospital: Hospital | null;
  match: MatchResult | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onRequest?: (() => void) | undefined;
  onViewMap?: () => void;
  canRequest?: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-md">
        {hospital && (
          <>
            <div className="relative h-44">
              <img src={hospitalImg} alt="" className="h-full w-full object-cover" width={1088} height={608} loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/80 to-transparent" />
              <span className="absolute bottom-3 left-4 rounded bg-card/90 px-2 py-0.5 text-[11px] font-medium">Illustrative image</span>
            </div>
            <div className="space-y-5 p-5">
              <SheetHeader className="p-0 text-left">
                <SheetTitle className="text-xl">{hospital.name}</SheetTitle>
                <SheetDescription>
                  {hospital.area}, Mumbai · {hospital.specialties.join(", ")}
                </SheetDescription>
              </SheetHeader>
              <div className="flex items-center gap-4">
                {match && <ScoreRing value={match.total_score} size={96} stroke={8} label="Match Score" />}
                <div className="grid flex-1 grid-cols-2 gap-3 text-sm">
                  {match && (
                    <>
                      <Stat icon={Navigation} label="ETA" value={`${Math.round(match.eta_min)} min`} />
                      <Stat icon={RouteIcon} label="Distance" value={`${match.distance_km.toFixed(1)} km`} />
                    </>
                  )}
                  <Stat icon={Gauge} label="Load" value={`${hospital.load_pct}%`} />
                  <div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" /> Last updated
                    </div>
                    <FreshnessBadge updatedAt={hospital.updated_at} />
                  </div>
                </div>
              </div>
              <LoadBar pct={hospital.load_pct} />
              <div>
                <h4 className="mb-2 text-sm font-semibold">Resources</h4>
                <div className="grid grid-cols-2 gap-2">
                  {RESOURCE_KEYS.map((k) => {
                    const r = hospital.resources[k];
                    const M = RESOURCE_META[k];
                    const ok = r.available > 0;
                    return (
                      <div key={k} className={cn("flex items-center gap-2 rounded-xl border p-2.5", !ok && "opacity-60")}>
                        <M.icon className={cn("size-4", ok ? "text-success" : "text-muted-foreground")} />
                        <span className="flex-1 text-sm">{M.label}</span>
                        <span className="text-sm font-semibold tnum">
                          {TOGGLE_RESOURCES.includes(k) ? (ok ? "Yes" : "No") : `${r.available}/${r.total}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {match && (
                <div className="space-y-3 rounded-xl bg-muted/60 p-3">
                  <h4 className="text-sm font-semibold">Why this hospital?</h4>
                  <ReasonList match={match} />
                  <ScoreBreakdownBar components={match.components} />
                </div>
              )}
              <div className="flex gap-2">
                {onRequest && (
                  <Button className="h-12 flex-1" disabled={!canRequest} onClick={onRequest}>
                    Request Bed
                  </Button>
                )}
                {onViewMap && (
                  <Button variant="outline" className="h-12" onClick={onViewMap}>
                    <MapIcon className="size-4" /> View on Map
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="size-3" /> {label}
      </div>
      <div className="text-lg font-bold tnum">{value}</div>
    </div>
  );
}
