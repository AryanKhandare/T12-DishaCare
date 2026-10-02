import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import {
  BedDouble,
  Box,
  CheckCircle2,
  Columns2,
  Loader2,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RESOURCE_META } from "@/components/bedlink/primitives";
import type { Hospital, Reservation, ResourceKey } from "@/lib/types";
import { RESOURCE_KEYS } from "@/lib/types";
import { cn } from "@/lib/utils";

export type WardId = ResourceKey;
export type BedStatus = "free" | "occupied" | "held";

export interface WardBed {
  id: string;
  bedNumber: number;
  wardId: WardId;
  wardLabel: string;
  status: BedStatus;
  heldByAmbulance?: string | undefined;
}

export interface WardInfo {
  id: WardId;
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string }>;
  total: number;
  available: number;
  held: number;
  occupied: number;
  beds: WardBed[];
  occupancyPct: number;
  statusChip: "Available" | "Limited" | "Full";
}

export interface HospitalWardsSectionProps {
  hospital: Hospital;
  holds: Reservation[];
  onUpdateAvailability: (key: ResourceKey, newAvailable: number) => void;
  className?: string;
}

function isWebGLSupported(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

// 2D Bed Map Component
const Ward2DMap: React.FC<{
  beds: WardBed[];
  onToggleBed: (bed: WardBed) => void;
}> = ({ beds, onToggleBed }) => {
  if (beds.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-sm text-muted-foreground">
        <BedDouble className="mb-2 size-8 text-slate-400" />
        No beds configured for this ward.
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      role="grid"
      aria-label="Ward Bed Map"
    >
      {beds.map((bed) => {
        const isFree = bed.status === "free";
        const isHeld = bed.status === "held";
        const isOccupied = bed.status === "occupied";

        return (
          <button
            key={bed.id}
            type="button"
            onClick={() => onToggleBed(bed)}
            disabled={isHeld}
            title={
              isHeld
                ? `Bed ${bed.bedNumber} is currently held for an incoming ambulance`
                : isFree
                  ? `Bed ${bed.bedNumber} is Free. Tap to mark as Occupied.`
                  : `Bed ${bed.bedNumber} is Occupied. Tap to mark as Free.`
            }
            className={cn(
              "group relative flex min-h-[72px] flex-col justify-between rounded-xl border p-2.5 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none",
              isFree &&
                "border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100 hover:border-emerald-400 active:scale-[0.98]",
              isOccupied &&
                "border-rose-200 bg-rose-50/60 hover:bg-rose-100/80 hover:border-rose-300 active:scale-[0.98]",
              isHeld &&
                "cursor-not-allowed border-blue-300 bg-blue-50/90 shadow-sm opacity-95",
            )}
          >
            {/* Top Row: Bed Icon + Number + Status Icon */}
            <div className="flex items-center justify-between gap-1.5">
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-md text-xs font-bold",
                  isFree && "bg-emerald-200/80 text-emerald-800",
                  isOccupied && "bg-rose-200/80 text-rose-800",
                  isHeld && "bg-blue-200/80 text-blue-800",
                )}
              >
                <BedDouble className="size-3.5" />
              </span>

              <span className="font-mono text-xs font-bold text-foreground">
                Bed {String(bed.bedNumber).padStart(2, "0")}
              </span>

              <span className="ml-auto">
                {isFree && <CheckCircle2 className="size-4 text-emerald-600" />}
                {isOccupied && <XCircle className="size-4 text-rose-500" />}
                {isHeld && <ShieldAlert className="size-4 text-blue-600 animate-pulse" />}
              </span>
            </div>

            {/* Bottom Row: Status Text */}
            <div className="mt-2 flex items-center justify-between gap-1 text-[11px] font-semibold leading-none">
              <span
                className={cn(
                  "inline-block rounded-md px-1.5 py-0.5 uppercase tracking-wider text-[10px]",
                  isFree && "bg-emerald-200/60 text-emerald-900 font-bold",
                  isOccupied && "bg-rose-200/60 text-rose-900 font-bold",
                  isHeld && "bg-blue-200/60 text-blue-900 font-bold",
                )}
              >
                {isFree ? "Free" : isOccupied ? "Occupied" : "Held"}
              </span>

              <span className="text-[10px] text-muted-foreground font-normal">
                {isHeld
                  ? bed.heldByAmbulance ? `Amb ${bed.heldByAmbulance}` : "Reserved"
                  : isFree
                    ? "Tap to occupy"
                    : "Tap to free"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

// 3D Canvas Scene
const Lazy3DCanvas = lazy(async () => {
  const [{ Canvas }, { OrbitControls, Html }] = await Promise.all([
    import("@react-three/fiber"),
    import("@react-three/drei"),
  ]);

  const Bed3D: React.FC<{
    bed: WardBed;
    position: [number, number, number];
    rotation: number;
    onToggle: (bed: WardBed) => void;
  }> = ({ bed, position, rotation, onToggle }) => {
    const [hovered, setHovered] = useState(false);
    const isFree = bed.status === "free";
    const isHeld = bed.status === "held";

    const color = isFree ? "#16a34a" : isHeld ? "#2563eb" : "#dc2626";
    const glowColor = isFree ? "#4ade80" : isHeld ? "#60a5fa" : "#f87171";

    return (
      <group
        position={position}
        rotation={[0, rotation, 0]}
        onClick={(e) => {
          e.stopPropagation();
          if (!isHeld) onToggle(bed);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          if (typeof document !== "undefined") {
            document.body.style.cursor = isHeld ? "not-allowed" : "pointer";
          }
        }}
        onPointerOut={() => {
          setHovered(false);
          if (typeof document !== "undefined") {
            document.body.style.cursor = "auto";
          }
        }}
      >
        {hovered && (
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.5, 2.7]} />
            <meshBasicMaterial color={glowColor} transparent opacity={0.35} />
          </mesh>
        )}

        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[1.1, 0.15, 2.3]} />
          <meshStandardMaterial color="#64748b" roughness={0.3} metalness={0.4} />
        </mesh>

        {([
          [-0.48, 0.1, -1.05],
          [0.48, 0.1, -1.05],
          [-0.48, 0.1, 1.05],
          [0.48, 0.1, 1.05],
        ] as const).map(([lx, ly, lz], idx) => (
          <mesh key={idx} position={[lx, ly, lz]}>
            <boxGeometry args={[0.08, 0.2, 0.08]} />
            <meshStandardMaterial color="#475569" roughness={0.4} />
          </mesh>
        ))}

        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[1.05, 0.18, 2.25]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </mesh>

        <mesh position={[0, 0.37, 0.25]}>
          <boxGeometry args={[1.06, 0.19, 1.55]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
        </mesh>

        <mesh position={[0, 0.46, -0.8]}>
          <boxGeometry args={[0.75, 0.1, 0.4]} />
          <meshStandardMaterial color="#ffffff" roughness={0.7} />
        </mesh>

        <mesh position={[0, 0.5, -1.15]}>
          <boxGeometry args={[1.15, 0.55, 0.08]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
        </mesh>

        <mesh position={[0, 0.38, 1.15]}>
          <boxGeometry args={[1.15, 0.35, 0.08]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
        </mesh>

        <mesh position={[-0.7, 0.6, -0.8]}>
          <boxGeometry args={[0.05, 1.2, 0.05]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        <mesh position={[-0.7, 1.15, -0.8]}>
          <boxGeometry args={[0.25, 0.2, 0.1]} />
          <meshStandardMaterial color={isFree ? "#0f172a" : "#1e293b"} />
        </mesh>

        {hovered && (
          <Html position={[0, 1.4, 0]} center distanceFactor={14}>
            <div className="flex pointer-events-none flex-col items-center gap-1 rounded-xl bg-slate-900/95 px-3 py-1.5 text-white shadow-xl backdrop-blur-md border border-slate-700 whitespace-nowrap text-xs">
              <div className="flex items-center gap-1.5 font-bold">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span>
                  {bed.wardLabel} Bed {String(bed.bedNumber).padStart(2, "0")}
                </span>
                <span className="text-slate-400">·</span>
                <span className="capitalize">{bed.status}</span>
              </div>
              <div className="text-[10px] text-slate-300 font-normal">
                {isHeld
                  ? bed.heldByAmbulance ? `Held by Ambulance ${bed.heldByAmbulance}` : "Held by Dispatch"
                  : isFree
                    ? "Tap to mark Occupied"
                    : "Tap to mark Free"}
              </div>
            </div>
          </Html>
        )}
      </group>
    );
  };

  const CanvasScene: React.FC<{
    beds: WardBed[];
    onToggleBed: (bed: WardBed) => void;
  }> = ({ beds, onToggleBed }) => {
    const total = beds.length;
    const half = Math.max(1, Math.ceil(total / 2));
    const spacing = total <= 6 ? 2.8 : 2.3;
    const floorWidth = Math.max(14, half * spacing + 5);
    const floorDepth = 12;

    const bedLayouts = beds.map((bed, idx) => {
      let x = 0;
      let z = 0;
      let rot = 0;

      if (idx < half) {
        x = (idx - (half - 1) / 2) * spacing;
        z = -2.6;
        rot = 0;
      } else {
        const row1Count = total - half;
        const col = idx - half;
        x = (col - (row1Count - 1) / 2) * spacing;
        z = 2.6;
        rot = Math.PI;
      }

      return { bed, position: [x, 0, z] as [number, number, number], rotation: rot };
    });

    return (
      <div className="relative size-full select-none">
        <Canvas
          camera={{ position: [half * 1.4 + 9, 13, 16], fov: 38 }}
          frameloop="demand"
          dpr={Math.min(1.5, typeof window !== "undefined" ? window.devicePixelRatio : 1)}
          gl={{
            antialias: typeof window !== "undefined" && window.innerWidth >= 1024,
            powerPreference: "high-performance",
          }}
        >
          <ambientLight intensity={1.2} />
          <hemisphereLight color="#f0f9ff" groundColor="#cbd5e1" intensity={0.6} />
          <directionalLight position={[18, 28, 16]} intensity={1.1} color="#ffffff" />

          <OrbitControls
            makeDefault
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={0.5}
            zoomSpeed={0.7}
            minDistance={10}
            maxDistance={38}
            minPolarAngle={Math.PI / 8}
            maxPolarAngle={Math.PI / 2.2}
          />

          <mesh position={[0, -0.2, 0]}>
            <boxGeometry args={[floorWidth, 0.4, floorDepth]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
          </mesh>

          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[floorWidth - 0.4, floorDepth - 0.4]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.05} />
          </mesh>

          <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[floorWidth - 0.4, 2.2]} />
            <meshStandardMaterial color="#e0f2fe" roughness={0.3} />
          </mesh>

          <mesh position={[0, 0.8, -floorDepth / 2 + 0.2]}>
            <boxGeometry args={[floorWidth, 1.6, 0.3]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
          </mesh>
          <mesh position={[0, 1.62, -floorDepth / 2 + 0.2]}>
            <boxGeometry args={[floorWidth, 0.08, 0.35]} />
            <meshBasicMaterial color="#0284c7" />
          </mesh>

          <mesh position={[floorWidth / 2 - 0.2, 0.8, 0]}>
            <boxGeometry args={[0.3, 1.6, floorDepth]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
          </mesh>
          <mesh position={[-floorWidth / 2 + 0.2, 0.8, 0]}>
            <boxGeometry args={[0.3, 1.6, floorDepth]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
          </mesh>

          {bedLayouts.map(({ bed, position, rotation }) => (
            <Bed3D
              key={bed.id}
              bed={bed}
              position={position}
              rotation={rotation}
              onToggle={onToggleBed}
            />
          ))}
        </Canvas>

        <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-lg bg-background/85 px-2.5 py-1 text-[11px] font-medium text-foreground backdrop-blur-md shadow-sm border border-border">
          <span className="size-2 rounded-full bg-primary" />
          <span>Rotate / Zoom to inspect</span>
          <span className="text-muted-foreground">•</span>
          <span className="font-semibold text-primary">Tap bed to toggle</span>
        </div>
      </div>
    );
  };

  return { default: CanvasScene };
});

export const HospitalWardsSection: React.FC<HospitalWardsSectionProps> = ({
  hospital,
  holds,
  onUpdateAvailability,
  className,
}) => {
  const [activeWardId, setActiveWardId] = useState<WardId>("icu");
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [webglOk, setWebglOk] = useState(true);

  useEffect(() => {
    const supported = isWebGLSupported();
    setWebglOk(supported);

    const isMobile = window.innerWidth < 768;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!supported || isMobile || prefersReducedMotion) {
      setViewMode("2d");
    } else {
      setViewMode("3d");
    }
  }, []);

  // Compute active held beds per resource
  const heldCountsByResource = useMemo(() => {
    const counts: Record<ResourceKey, { count: number; ambulanceIds: string[] }> = {
      icu: { count: 0, ambulanceIds: [] },
      ventilator: { count: 0, ambulanceIds: [] },
      cardiac: { count: 0, ambulanceIds: [] },
      burns: { count: 0, ambulanceIds: [] },
      oxygen: { count: 0, ambulanceIds: [] },
    };

    holds.forEach((r) => {
      const ambId = (r as any).emergency?.ambulance_id ?? "A12";
      if (r.held && Object.keys(r.held).length > 0) {
        Object.entries(r.held).forEach(([k, amt]) => {
          const rKey = k as ResourceKey;
          if (counts[rKey]) {
            counts[rKey].count += typeof amt === "number" ? amt : 1;
            counts[rKey].ambulanceIds.push(ambId);
          }
        });
      } else {
        counts.icu.count += 1;
        counts.icu.ambulanceIds.push(ambId);
      }
    });

    return counts;
  }, [holds]);

  // Derive all wards from hospital.resources
  const wards = useMemo<WardInfo[]>(() => {
    return RESOURCE_KEYS.filter((k) => !!hospital.resources[k]).map((k) => {
      const r = hospital.resources[k];
      const M = RESOURCE_META[k];
      const total = Math.max(1, r.total || (k === "cardiac" ? 4 : k === "burns" ? 3 : 10));
      const available = Math.min(total, Math.max(0, r.available));
      const heldInfo = heldCountsByResource[k] ?? { count: 0, ambulanceIds: [] };
      const held = Math.min(total - available, Math.max(0, heldInfo.count));
      const occupied = Math.max(0, total - available - held);
      const occupancyPct = Math.round(((total - available) / total) * 100);

      const statusChip: "Available" | "Limited" | "Full" =
        available === 0
          ? "Full"
          : available / total <= 0.3
            ? "Limited"
            : "Available";

      const beds: WardBed[] = [];
      let ambIdx = 0;

      for (let i = 0; i < held; i++) {
        beds.push({
          id: `${k}-bed-${i + 1}`,
          bedNumber: i + 1,
          wardId: k,
          wardLabel: M.label,
          status: "held",
          heldByAmbulance: heldInfo.ambulanceIds[ambIdx++] ?? "A12",
        });
      }

      for (let i = 0; i < available; i++) {
        const bedNum = held + i + 1;
        beds.push({
          id: `${k}-bed-${bedNum}`,
          bedNumber: bedNum,
          wardId: k,
          wardLabel: M.label,
          status: "free",
        });
      }

      for (let i = 0; i < occupied; i++) {
        const bedNum = held + available + i + 1;
        beds.push({
          id: `${k}-bed-${bedNum}`,
          bedNumber: bedNum,
          wardId: k,
          wardLabel: M.label,
          status: "occupied",
        });
      }

      return {
        id: k,
        label: `${M.label} Ward`,
        short: M.short,
        icon: M.icon,
        total,
        available,
        held,
        occupied,
        beds,
        occupancyPct,
        statusChip,
      };
    });
  }, [hospital.resources, heldCountsByResource]);

  useEffect(() => {
    if (!wards.some((w) => w.id === activeWardId) && wards.length > 0) {
      setActiveWardId(wards[0]!.id);
    }
  }, [wards, activeWardId]);

  const activeWard = wards.find((w) => w.id === activeWardId) ?? wards[0];

  const handleToggleBed = (bed: WardBed) => {
    if (bed.status === "held") {
      toast.info(`Bed ${bed.bedNumber} is currently held for an incoming ambulance`, {
        description: "Held beds cannot be toggled manually until arrived or released.",
      });
      return;
    }

    if (!activeWard) return;

    if (bed.status === "free") {
      const nextAvailable = Math.max(0, activeWard.available - 1);
      onUpdateAvailability(activeWard.id, nextAvailable);
      toast(`Bed ${bed.bedNumber} marked occupied`, {
        description: `${activeWard.label}: ${nextAvailable} of ${activeWard.total} free`,
      });
    } else if (bed.status === "occupied") {
      const nextAvailable = Math.min(activeWard.total, activeWard.available + 1);
      onUpdateAvailability(activeWard.id, nextAvailable);
      toast.success(`Bed ${bed.bedNumber} marked free`, {
        description: `${activeWard.label}: ${nextAvailable} of ${activeWard.total} free`,
      });
    }
  };

  if (!activeWard) return null;

  return (
    <section className={cn("space-y-4", className)}>
      {/* Section Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground font-heading">
            Ward overview
          </h2>
          <p className="text-xs text-muted-foreground">
            Tap a bed to mark it free/occupied
          </p>
        </div>

        {/* 2D / 3D Mode Toggle Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {webglOk && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode((m) => (m === "3d" ? "2d" : "3d"))}
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              {viewMode === "3d" ? (
                <>
                  <Columns2 className="size-3.5 text-primary" />
                  <span>View 2D Map</span>
                </>
              ) : (
                <>
                  <Box className="size-3.5 text-primary" />
                  <span>View 3D</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Ward Selector Tabs/Chips */}
      <div
        className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
        role="tablist"
        aria-label="Wards"
      >
        {wards.map((w) => {
          const isActive = w.id === activeWardId;
          const Icon = w.icon;
          return (
            <button
              key={w.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveWardId(w.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              <Icon className="size-3.5" />
              <span>{w.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 text-[10px] font-bold tnum",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {w.available}/{w.total} free
              </span>
            </button>
          );
        })}
      </div>

      {/* Responsive Two-Column Layout (Web >= 1024px: 60% Left, 40% Right; Mobile: Stacked) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
        {/* Left Column (60% on desktop): Viewer Card */}
        <div className="lg:col-span-7">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-slate-100 shadow-sm md:aspect-[16/9] dark:bg-slate-900">
            {viewMode === "3d" && webglOk ? (
              <Suspense
                fallback={
                  <div className="flex size-full flex-col items-center justify-center gap-2 bg-slate-50 text-muted-foreground dark:bg-slate-900">
                    <Loader2 className="size-7 animate-spin text-primary" />
                    <span className="text-xs font-semibold">
                      Rendering 3D Ward Model...
                    </span>
                  </div>
                }
              >
                <Lazy3DCanvas
                  beds={activeWard.beds}
                  onToggleBed={handleToggleBed}
                />
              </Suspense>
            ) : (
              <div className="size-full overflow-y-auto p-4 bg-card/60 backdrop-blur-sm">
                <Ward2DMap
                  beds={activeWard.beds}
                  onToggleBed={handleToggleBed}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column (40% on desktop): Ward List & Legend */}
        <div className="space-y-4 lg:col-span-5">
          {/* Ward Status & Capacity List */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-1 border-b text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>All Wards Capacity</span>
              <span>Available / Total</span>
            </div>

            <div className="space-y-2.5">
              {wards.map((w) => {
                const isSelected = w.id === activeWardId;
                const Icon = w.icon;

                return (
                  <button
                    key={w.id}
                    onClick={() => setActiveWardId(w.id)}
                    className={cn(
                      "w-full rounded-xl border p-2.5 text-left transition-all hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isSelected
                        ? "border-primary/60 bg-primary/5 shadow-xs"
                        : "border-border bg-card",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "grid size-6 place-items-center rounded-md text-xs font-bold",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Icon className="size-3.5" />
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          {w.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold tnum">
                          {w.available}{" "}
                          <span className="font-normal text-muted-foreground">
                            / {w.total}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                            w.statusChip === "Available" &&
                              "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
                            w.statusChip === "Limited" &&
                              "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
                            w.statusChip === "Full" &&
                              "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
                          )}
                        >
                          {w.statusChip}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <Progress
                        value={w.occupancyPct}
                        className={cn(
                          "h-1.5 flex-1",
                          w.occupancyPct > 85 ? "[&>div]:bg-rose-500" : "[&>div]:bg-primary",
                        )}
                      />
                      <span className="text-[10px] font-medium text-muted-foreground tnum w-8 text-right">
                        {w.occupancyPct}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Legend */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Bed Status Legend
            </div>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200/80 bg-emerald-50/60 p-2 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                <span className="size-3 rounded-full bg-emerald-500 ring-2 ring-emerald-300" />
                <span className="font-bold">Free</span>
                <span className="text-muted-foreground text-[11px]">
                  — Ready for patient (Tap to occupy)
                </span>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg border border-rose-200/80 bg-rose-50/60 p-2 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                <span className="size-3 rounded-full bg-rose-500 ring-2 ring-rose-300" />
                <span className="font-bold">Occupied</span>
                <span className="text-muted-foreground text-[11px]">
                  — Patient admitted (Tap to mark free)
                </span>
              </div>

              <div className="flex items-center gap-2.5 rounded-lg border border-blue-200/80 bg-blue-50/60 p-2 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
                <span className="size-3 rounded-full bg-blue-500 ring-2 ring-blue-300" />
                <span className="font-bold">Held</span>
                <span className="text-muted-foreground text-[11px]">
                  — Reserved for incoming ambulance
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HospitalWardsSection;
