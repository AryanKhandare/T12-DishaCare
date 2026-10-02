import { Crosshair, Loader2, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { DEMO_AMBULANCE } from "@/lib/seed";
import { haversineKm } from "@/lib/matching";
import type { EmergencyRequestInput, EmergencyType, ResourceKey, Severity } from "@/lib/types";
import { RESOURCE_KEYS } from "@/lib/types";
import { ResourceChip } from "./primitives";

export const EMERGENCY_TYPES: EmergencyType[] = ["Trauma", "Cardiac", "Respiratory", "Burns", "Other"];
const SEVERITIES: { v: Severity; cls: string }[] = [
  { v: "Critical", cls: "data-[on=true]:bg-destructive data-[on=true]:text-destructive-foreground" },
  { v: "Serious", cls: "data-[on=true]:bg-warning data-[on=true]:text-warning-foreground" },
  { v: "Stable", cls: "data-[on=true]:bg-success data-[on=true]:text-success-foreground" },
];

export function RequestForm({
  value, onChange, onSubmit, submitting,
}: {
  value: EmergencyRequestInput;
  onChange: (v: EmergencyRequestInput) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const set = <K extends keyof EmergencyRequestInput>(k: K, v: EmergencyRequestInput[K]) => onChange({ ...value, [k]: v });
  const toggleRes = (k: ResourceKey) =>
    set("resources", value.resources.includes(k) ? value.resources.filter((x) => x !== k) : [...value.resources, k]);

  const useCurrent = () => {
    if (!navigator.geolocation) return set("location", DEMO_AMBULANCE);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pt = { lat: p.coords.latitude, lng: p.coords.longitude, label: "Current location" };
        if (haversineKm(pt, DEMO_AMBULANCE) > 55) {
          toast("Outside the Mumbai corridor area — using default central ambulance location");
          set("location", DEMO_AMBULANCE);
        } else set("location", pt);
      },
      () => {
        toast("Location unavailable — using demo ambulance location");
        set("location", DEMO_AMBULANCE);
      },
      { timeout: 5000 },
    );
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div>
        <Label className="mb-2 block">Emergency type</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {EMERGENCY_TYPES.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => set("type", t)}
              className={cn(
                "h-11 rounded-xl border text-sm font-medium transition",
                value.type === t ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="age" className="mb-1.5 block">Age <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Input id="age" type="number" min={0} max={120} className="h-11" value={value.age ?? ""} onChange={(e) => set("age", e.target.value ? Number(e.target.value) : undefined)} />
        </div>
        <div>
          <Label htmlFor="gender" className="mb-1.5 block">Gender <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <select
            id="gender"
            className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
            value={value.gender ?? ""}
            onChange={(e) => set("gender", e.target.value || undefined)}
          >
            <option value="">—</option>
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
          </select>
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Required resources</Label>
        <div className="flex flex-wrap gap-1.5">
          {RESOURCE_KEYS.map((k) => (
            <ResourceChip key={k} k={k} selected={value.resources.includes(k)} onClick={() => toggleRes(k)} />
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Severity</Label>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          {SEVERITIES.map((s) => (
            <button
              type="button"
              key={s.v}
              data-on={value.severity === s.v}
              onClick={() => set("severity", s.v)}
              className={cn("h-10 rounded-lg text-sm font-semibold text-muted-foreground transition", s.cls)}
            >
              {s.v}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="loc" className="mb-1.5 block">Current location</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="loc" className="h-11 pl-9" value={value.location.label} onChange={(e) => set("location", { ...value.location, label: e.target.value })} />
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" className="h-9 px-2 text-primary" onClick={useCurrent}>
            <Crosshair className="size-4" /> Use Current Location
          </Button>
          <span className="text-xs text-muted-foreground">or click the map</span>
        </div>
      </div>

      <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Finding nearby hospitals...
          </>
        ) : (
          <>
            <Search className="mr-2 size-4" />
            Find Available Hospitals
          </>
        )}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">Operational coordination only — no patient identifiers are stored.</p>
    </form>
  );
}
