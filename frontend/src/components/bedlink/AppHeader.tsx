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
    <span className={cn("flex items-center gap-2.5 font-bold tracking-tight font-heading", className)}>
      <img
        src="/logo.png"
        alt="DishaCare"
        className="size-8 object-contain shrink-0"
      />
      <span className={cn("text-xl font-heading font-extrabold tracking-tight", light ? "text-white" : "text-foreground")}>
        Disha<span className="text-emerald-500">Care</span>
      </span>
    </span>
  );
}

export function DemoTools() {
  return null;
}

export function ThemeToggle() {
  return null;
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

export function AppHeader({
  left,
  className,
  hideDemoBadge,
}: {
  left?: ReactNode;
  className?: string;
  hideDemoBadge?: boolean;
  hideDemoTools?: boolean;
}) {
  return (
    <header className={cn("flex h-14 shrink-0 items-center gap-3 border-b bg-card px-3 md:px-4", className)}>
      <Link to="/">
        <BrandMark />
      </Link>
      {!hideDemoBadge && <DemoBadge className="hidden sm:inline-flex" />}
      <div className="min-w-0 flex-1">{left}</div>
      <UserMenu />
    </header>
  );
}
