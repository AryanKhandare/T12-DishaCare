import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { MapViewProps } from "./MapView";
import { useTheme } from "@/lib/theme";

const MapView = lazy(() => import("./MapView"));

export function LazyMap(props: MapViewProps) {
  const dark = useTheme((s) => s.dark);
  const fallback = <div className="h-full w-full animate-pulse bg-muted" />;
  return (
    <ClientOnly fallback={fallback}>
      <Suspense fallback={fallback}>
        <MapView {...props} dark={dark} />
      </Suspense>
    </ClientOnly>
  );
}

export function MapLegend({ className = "" }: { className?: string }) {
  const items = [
    ["Eligible (Live)", "bg-emerald-500"],
    ["Stale / Unconfirmed", "bg-amber-500"],
    ["Requirements Unmet", "bg-rose-500"],
    ["Unavailable / Inactive", "bg-gray-400"],
  ];
  return (
    <div className={`flex flex-wrap gap-3 rounded-xl border bg-card/95 px-3 py-2 text-xs shadow-card backdrop-blur ${className}`}>
      {items.map(([l, c]) => (
        <span key={l} className="flex items-center gap-1.5">
          <span className={`size-2.5 rounded-full ${c}`} />
          {l}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-primary ring-2 ring-primary/30" /> Ambulance (GPS)
      </span>
    </div>
  );
}
