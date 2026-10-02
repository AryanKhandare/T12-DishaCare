import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Building2, CalendarClock, LayoutDashboard, Settings, Siren, Users, ExternalLink } from "lucide-react";
import { AppHeader, BrandMark } from "@/components/bedlink/AppHeader";
import { requireRole } from "@/lib/guards";
import { useSim } from "@/lib/sim-store";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: () => requireRole("admin"),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/hospitals", label: "Hospitals", icon: Building2 },
  { to: "/admin/requests", label: "Active Requests", icon: Siren },
  { to: "/admin/reservations", label: "Reservations", icon: CalendarClock },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

function AdminLayout() {
  const active = useSim((s) => s.requests.filter((r) => r.status === "matching" || r.status === "reserving").length);
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-14 items-center px-4">
          <BrandMark light />
        </div>
        <div className="px-4 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">Command Center</div>
        <nav className="flex-1 space-y-0.5 px-2">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: "exact" in n }}
              className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/75 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
            >
              <n.icon className="size-4" />
              <span className="flex-1">{n.label}</span>
              {n.to === "/admin/requests" && active > 0 && (
                <span className="rounded-full bg-sidebar-primary px-1.5 text-xs font-bold text-sidebar-primary-foreground tnum">{active}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="space-y-1 border-t border-sidebar-border p-3 text-sm">
          <Link to="/dispatch" className="flex h-10 items-center gap-2 rounded-lg px-3 text-sidebar-foreground/75 hover:bg-sidebar-accent">
            <ExternalLink className="size-4" /> Dispatch view
          </Link>
          <Link to="/hospital" className="flex h-10 items-center gap-2 rounded-lg px-3 text-sidebar-foreground/75 hover:bg-sidebar-accent">
            <ExternalLink className="size-4" /> Nurse view
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader className="lg:[&>a]:hidden" />
        <nav className="flex gap-1 overflow-x-auto border-b bg-card px-2 py-1.5 lg:hidden">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: "exact" in n }} className="whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted-foreground" activeProps={{ className: "bg-accent text-accent-foreground" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
