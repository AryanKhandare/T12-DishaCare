import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Moon, Settings2, Sun, Timer, RotateCcw, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, ROLE_LABEL } from "@/lib/auth-store";
import { logoutApi } from "@/lib/api";
import { useSim } from "@/lib/sim-store";
import { useTheme } from "@/lib/theme";
import { DemoBadge } from "./primitives";
import { cn } from "@/lib/utils";

export function BrandMark({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2 font-bold tracking-tight", className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
          <path d="M3 18h4l2-3 3 5 2-4h7" strokeWidth={1.6} opacity={0.6} />
        </svg>
      </span>
      <span className={cn("text-lg", light && "text-navy-foreground")}>
        Bed<span className="text-primary">Link</span>
      </span>
    </span>
  );
}

export function DemoTools() {
  const s = useSim();
  const pending = s.reservations.find((r) => r.status === "RESERVATION_REQUESTED");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Demo tools" className="size-10">
          <Settings2 className="size-4.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Demo tools</DropdownMenuLabel>
        <DropdownMenuItem
          disabled={!pending}
          onClick={() => {
            if (pending) s.expire(pending.id, "demo-tools");
            toast("Reservation timed out (simulated)");
          }}
        >
          <Clock className="size-4" /> Simulate timeout
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!pending}
          onClick={() => {
            if (pending) s.reject(pending.id, "demo-tools");
            toast("Hospital rejected (simulated)");
          }}
        >
          <XCircle className="size-4" /> Simulate reject
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => s.setSpeed(s.speed === 1 ? 6 : 1)}>
          <Timer className="size-4" /> {s.speed === 1 ? "Speed up timer (6×)" : "Normal timer speed"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => {
            s.reset();
            toast.success("Demo reset — fresh seeded data");
          }}
        >
          <RotateCcw className="size-4" /> Reset demo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle night mode" className="size-10">
      {dark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
    </Button>
  );
}

export function UserMenu({ compact }: { compact?: boolean }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <div className="flex items-center gap-2">
      <div className={cn("hidden text-right leading-tight", !compact && "sm:block")}>
        <div className="text-sm font-semibold">{user.name}</div>
        <div className="text-[11px] text-muted-foreground">{user.ambulance_id ?? user.username}</div>
      </div>
      <span className={cn("rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground", compact ? "inline" : "hidden md:inline")}>
        {ROLE_LABEL[user.role]}
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Log out"
        className="size-10"
        onClick={async () => {
          await logoutApi();
          navigate({ to: "/login", replace: true });
        }}
      >
        <LogOut className="size-4.5" />
      </Button>
    </div>
  );
}

export function AppHeader({ left, className }: { left?: ReactNode; className?: string }) {
  return (
    <header className={cn("flex h-14 shrink-0 items-center gap-3 border-b bg-card px-3 md:px-4", className)}>
      <Link to="/">
        <BrandMark />
      </Link>
      <DemoBadge className="hidden sm:inline-flex" />
      <div className="min-w-0 flex-1">{left}</div>
      <ThemeToggle />
      <DemoTools />
      <UserMenu />
    </header>
  );
}
