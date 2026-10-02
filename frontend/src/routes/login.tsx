import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Ambulance, Building2, Loader2, MonitorDot, ShieldCheck, Timer, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/bedlink/AppHeader";
import { DemoBadge } from "@/components/bedlink/primitives";
import { login } from "@/lib/api";
import { useAuth, ROLE_HOME } from "@/lib/auth-store";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — BedLink" },
      { name: "description", content: "Sign in to BedLink as a dispatcher, hospital nurse or command center admin." },
      { property: "og:title", content: "Sign in — BedLink" },
      { property: "og:description", content: "Sign in to BedLink as a dispatcher, hospital nurse or command center admin." },
    ],
  }),
  beforeLoad: () => {
    const u = useAuth.getState().user;
    if (u) throw redirect({ to: ROLE_HOME[u.role] });
  },
  component: LoginPage,
});

const ROLES: { role: Role; title: string; sub: string; icon: typeof Ambulance; user: string }[] = [
  { role: "dispatcher", title: "Ambulance / Dispatcher", sub: "Create requests, reserve beds", icon: Ambulance, user: "dispatcher1" },
  { role: "hospital", title: "Hospital / Nurse", sub: "Update availability, respond", icon: Building2, user: "nurse_bhayandar" },
  { role: "admin", title: "Admin / Command Center", sub: "Network oversight & analytics", icon: MonitorDot, user: "admin" },
];
const CHIPS = [
  "dispatcher1",
  "nurse_bhayandar",
  "nurse_wockhardt",
  "nurse_karuna",
  "nurse_holy_spirit",
  "nurse_kokilaben",
  "nurse_kem",
  "nurse_gt_churchgate",
  "admin",
];

function LoginPage() {
  const [role, setRole] = useState<Role>("dispatcher");
  const [username, setUsername] = useState("dispatcher1");
  const [password, setPassword] = useState("demo123");
  const [busy, setBusy] = useState(false);
  const setSession = useAuth((s) => s.setSession);
  const navigate = useNavigate();

  const doLogin = async (u = username, p = password) => {
    setBusy(true);
    try {
      const res = await login(u, p);
      setSession(res.access_token, res.user);
      toast.success(`Welcome, ${res.user.name}`);
      navigate({ to: ROLE_HOME[res.user.role], replace: true });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-gradient p-10 text-navy-foreground lg:flex lg:flex-col">
        <BrandMark light />
        <div className="my-auto max-w-lg">
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-5xl font-extrabold leading-[1.05] tracking-tight">
            Don't just find a hospital.
            <br />
            <span className="text-primary-foreground/70">Secure the right bed.</span>
          </motion.h1>
          <p className="mt-5 text-lg text-navy-foreground/75">
            Live capacity, explainable matching and a 2-minute reservation hold with automatic fallback — one console for ambulances, hospitals and command.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { icon: Zap, k: "Ranked", v: "in < 1s" },
              { icon: Timer, k: "Hold", v: "02:00" },
              { icon: ShieldCheck, k: "Fallback", v: "Automatic" },
            ].map((x) => (
              <div key={x.k} className="rounded-2xl border border-navy-foreground/15 bg-navy-foreground/5 p-4 backdrop-blur">
                <x.icon className="size-5 text-navy-foreground/70" />
                <div className="mt-3 text-xl font-bold">{x.v}</div>
                <div className="text-sm text-navy-foreground/60">{x.k}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-navy-foreground/50">Simulated data for demonstration. Operational coordination tool — not a clinical decision system.</p>
        <svg className="pointer-events-none absolute -right-24 -bottom-24 size-[480px] opacity-10" viewBox="0 0 200 200" fill="none" stroke="currentColor">
          {[30, 55, 80, 100].map((r) => <circle key={r} cx="100" cy="100" r={r} strokeWidth="1" />)}
        </svg>
      </aside>

      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <BrandMark />
          </div>
          <DemoBadge />
          <h2 className="mt-4 text-3xl font-bold tracking-tight">Sign in</h2>
          <p className="mt-1 text-muted-foreground">Choose your role to open the right console.</p>

          <div className="mt-6 space-y-2">
            {ROLES.map((r) => (
              <button
                key={r.role}
                type="button"
                onClick={() => {
                  setRole(r.role);
                  setUsername(r.user);
                }}
                className={cn(
                  "relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border bg-card p-3.5 text-left transition hover:shadow-lift",
                  role === r.role && "border-primary/50 shadow-lift",
                )}
              >
                {role === r.role && <span className="absolute inset-y-0 left-0 w-1 bg-primary" />}
                <span className={cn("grid size-11 place-items-center rounded-xl", role === r.role ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  <r.icon className="size-5" />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">{r.title}</span>
                  <span className="block text-sm text-muted-foreground">{r.sub}</span>
                </span>
                <span className={cn("size-4 rounded-full border-2", role === r.role ? "border-primary bg-primary ring-2 ring-primary/20 ring-offset-2 ring-offset-card" : "")} />
              </button>
            ))}
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void doLogin();
            }}
          >
            <div>
              <Label htmlFor="u" className="mb-1.5 block">Username, Email, or Mobile Phone</Label>
              <Input id="u" className="h-12" placeholder="e.g. nurse_priya or priya@example.com" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </div>
            <div>
              <Label htmlFor="p" className="mb-1.5 block">Password</Label>
              <Input id="p" type="password" className="h-12" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <Button type="submit" className="h-12 w-full text-base" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />} Sign in
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="font-semibold text-primary hover:underline">
              Create Account
            </Link>
          </div>

          <div className="mt-6">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick demo login</div>
            <div className="flex flex-wrap gap-2">
              {CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={busy}
                  onClick={() => void doLogin(c, "demo123")}
                  className="h-10 rounded-full border bg-card px-4 font-mono text-sm transition hover:border-primary hover:text-primary"
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">All demo passwords: <span className="font-mono">demo123</span>. Open two tabs to demo dispatcher and hospital side by side.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
