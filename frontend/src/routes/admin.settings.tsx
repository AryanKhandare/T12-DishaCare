import { createFileRoute } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { MATCH_CONFIG, SCORE_WEIGHTS } from "@/lib/matching";
import { RESERVATION_MS } from "@/lib/sim-store";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings — BedLink" },
      { name: "description", content: "Matching weights, freshness windows and reservation hold configuration." },
      { property: "og:title", content: "Settings — BedLink" },
      { property: "og:description", content: "Matching weights and reservation configuration." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { dark, toggle } = useTheme();
  return (
    <div className="max-w-3xl space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <section className="rounded-2xl border bg-card p-5">
        <h3 className="font-semibold">Matching weights</h3>
        <p className="mb-4 text-sm text-muted-foreground">Deterministic scoring. The explanation layer never changes ranking.</p>
        <div className="space-y-3">
          {Object.entries(SCORE_WEIGHTS).map(([k, v]) => (
            <div key={k} className="flex items-center gap-3">
              <span className="w-24 text-sm capitalize">{k}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${v * 100 / 0.35}%` }} />
              </div>
              <span className="w-12 text-right font-mono text-sm tnum">{v.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="grid gap-3 rounded-2xl border bg-card p-5 sm:grid-cols-3">
        <Stat label="Fresh window" value={`< ${MATCH_CONFIG.freshSeconds}s`} />
        <Stat label="Stale after" value={`${MATCH_CONFIG.staleSeconds / 60} min`} />
        <Stat label="Reservation hold" value={`${RESERVATION_MS / 60000}:00`} />
      </section>
      <section className="flex items-center justify-between rounded-2xl border bg-card p-5">
        <div>
          <h3 className="font-semibold">Night dispatch mode</h3>
          <p className="text-sm text-muted-foreground">Dark theme for low-light control rooms.</p>
        </div>
        <Switch checked={dark} onCheckedChange={toggle} />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold tnum">{value}</div>
    </div>
  );
}
