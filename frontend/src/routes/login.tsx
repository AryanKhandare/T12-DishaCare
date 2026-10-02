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
      { title: "Sign in — DishaCare" },
      { name: "description", content: "Sign in to DishaCare as a dispatcher, hospital nurse or command center admin." },
      { property: "og:title", content: "Sign in — DishaCare" },
      { property: "og:description", content: "Sign in to DishaCare as a dispatcher, hospital nurse or command center admin." },
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
    <div className="relative min-h-screen w-full overflow-hidden font-sans">
      {/* Full page background image */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: "url('/Login_bg2.png')" }}
      />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
        {/* Left side branding with very subtle transparent gradient only behind text for high readability */}
        <aside className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex bg-gradient-to-r from-slate-950/80 via-slate-950/40 to-transparent">
          <BrandMark light />
          <div className="my-auto max-w-lg py-8">
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-extrabold leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
            >
              Don't just find a hospital.
              <br />
              <span className="text-emerald-400">Secure the right bed.</span>
            </motion.h1>
            <p className="mt-5 text-lg text-slate-100 leading-relaxed drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
              Live capacity, explainable matching and a 2-minute reservation hold with automatic fallback — one console for ambulances, hospitals and command.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                { icon: Zap, k: "Ranked", v: "in < 1s" },
                { icon: Timer, k: "Hold", v: "02:00" },
                { icon: ShieldCheck, k: "Fallback", v: "Automatic" },
              ].map((x) => (
                <div key={x.k} className="rounded-2xl border border-emerald-500/25 bg-slate-900/90 p-4 shadow-xl">
                  <x.icon className="size-5 text-emerald-400" />
                  <div className="mt-3 text-xl font-bold tracking-tight text-white">{x.v}</div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">{x.k}</div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs font-medium text-slate-200/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
            Simulated data for demonstration. Operational coordination tool — not a clinical decision system.
          </p>
          <svg className="pointer-events-none absolute -right-24 -bottom-24 size-[480px] text-white opacity-5" viewBox="0 0 200 200" fill="none" stroke="currentColor">
            {[30, 55, 80, 100].map((r) => <circle key={r} cx="100" cy="100" r={r} strokeWidth="1" />)}
          </svg>
        </aside>

        {/* Right side form */}
        <main className="relative flex items-center justify-center lg:justify-start p-4 sm:p-6 lg:p-10 lg:pl-16">
          {/* Form component: wider card with rich twilight navy colors matching background ambiance */}
          <div className="relative z-10 w-full max-w-[660px] rounded-3xl border border-slate-700/60 bg-slate-900/92 p-7 sm:p-9 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <BrandMark light />
            </div>
            <DemoBadge />
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white">Sign in</h2>
            <p className="mt-1.5 text-sm text-slate-300">Choose your role to open the right console.</p>

            <div className="mt-6 space-y-2.5">
              {ROLES.map((r) => (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => {
                    setRole(r.role);
                    setUsername(r.user);
                  }}
                  className={cn(
                    "relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl border p-3.5 text-left transition-all",
                    role === r.role
                      ? "border-emerald-500 bg-emerald-950/50 text-white shadow-sm ring-1 ring-emerald-500/40"
                      : "border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700 hover:bg-slate-800/40",
                  )}
                >
                  {role === r.role && <span className="absolute inset-y-0 left-0 w-1.5 bg-emerald-500" />}
                  <span className={cn("grid size-11 place-items-center rounded-xl", role === r.role ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-800/90 text-slate-300")}>
                    <r.icon className="size-5" />
                  </span>
                  <span className="flex-1">
                    <span className="block font-bold text-white">{r.title}</span>
                    <span className={cn("block text-xs font-medium", role === r.role ? "text-emerald-300" : "text-slate-400")}>{r.sub}</span>
                  </span>
                  <span className={cn("size-4 rounded-full border-2", role === r.role ? "border-emerald-500 bg-emerald-500 ring-2 ring-emerald-500/30 ring-offset-2 ring-offset-slate-900" : "border-slate-700 bg-slate-900")} />
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
                <Label htmlFor="u" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-200">
                  Username, Email, or Mobile Phone
                </Label>
                <Input
                  id="u"
                  className="h-12 border-slate-700/80 bg-slate-950/60 text-white placeholder:text-slate-500 focus:bg-slate-950/90 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/25 transition-all"
                  placeholder="e.g. nurse_priya or priya@example.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div>
                <Label htmlFor="p" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-200">
                  Password
                </Label>
                <Input
                  id="p"
                  type="password"
                  className="h-12 border-slate-700/80 bg-slate-950/60 text-white focus:bg-slate-950/90 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/25 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="h-12 w-full text-base font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.99]" disabled={busy}>
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Sign in
              </Button>
            </form>

            <div className="mt-5 text-center text-sm font-medium text-slate-300">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="font-bold text-emerald-400 hover:text-emerald-300 hover:underline">
                Create Account
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
