import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSim } from "@/lib/sim-store";
import { RESOURCE_KEYS } from "@/lib/types";
import { RESOURCE_META } from "@/components/bedlink/primitives";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — BedLink" },
      { name: "description", content: "Network capacity and reservation outcome analytics (simulated)." },
      { property: "og:title", content: "Analytics — BedLink" },
      { property: "og:description", content: "Network capacity and reservation outcomes." },
    ],
  }),
  component: Analytics,
});

function Analytics() {
  const hospitals = useSim((s) => s.hospitals);
  const reservations = useSim((s) => s.reservations);
  const capacity = RESOURCE_KEYS.filter((k) => k !== "cardiac" && k !== "burns").map((k) => ({
    name: RESOURCE_META[k].label,
    available: hospitals.reduce((t, h) => t + (h.active ? h.resources[k].available : 0), 0),
    occupied: hospitals.reduce((t, h) => t + (h.active ? h.resources[k].total - h.resources[k].available : 0), 0),
  }));
  const outcomes = ["HELD", "TIMEOUT", "REJECTED", "CANCELLED", "RELEASED"].map((s) => ({
    name: s.charAt(0) + s.slice(1).toLowerCase(),
    count: reservations.filter((r) => r.status === s).length,
  }));
  const load = [...hospitals].filter((h) => h.active).sort((a, b) => b.load_pct - a.load_pct).map((h) => ({ name: h.name.split(" ")[0], load: h.load_pct }));

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Simulated data · updates live</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Network capacity">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={capacity}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" fontSize={12} stroke="var(--muted-foreground)" />
              <YAxis fontSize={12} stroke="var(--muted-foreground)" />
              <Tooltip />
              <Bar dataKey="available" stackId="a" fill="var(--success)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="occupied" stackId="a" fill="var(--border)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Reservation outcomes">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={outcomes}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" fontSize={12} stroke="var(--muted-foreground)" />
              <YAxis allowDecimals={false} fontSize={12} stroke="var(--muted-foreground)" />
              <Tooltip />
              <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Hospital load %" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={load}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" fontSize={11} stroke="var(--muted-foreground)" />
              <YAxis domain={[0, 100]} fontSize={12} stroke="var(--muted-foreground)" />
              <Tooltip />
              <Bar dataKey="load" fill="var(--chart-4)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border bg-card p-4 ${className}`}>
      <h3 className="mb-3 font-semibold">{title}</h3>
      {children}
    </div>
  );
}
