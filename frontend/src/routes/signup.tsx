import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ambulance,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Timer,
  Zap,
  Phone,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/bedlink/AppHeader";
import { DemoBadge } from "@/components/bedlink/primitives";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { signup, sendOtp, getHospitals } from "@/lib/api";
import { useAuth, ROLE_HOME } from "@/lib/auth-store";
import type { Hospital } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Create Account — BedLink" },
      { name: "description", content: "Register for BedLink as a dispatcher or hospital nurse." },
      { property: "og:title", content: "Create Account — BedLink" },
      { property: "og:description", content: "Register for BedLink as a dispatcher or hospital nurse." },
    ],
  }),
  beforeLoad: () => {
    const u = useAuth.getState().user;
    if (u) throw redirect({ to: ROLE_HOME[u.role] });
  },
  component: SignupPage,
});

type PublicRole = "DISPATCHER" | "HOSPITAL_NURSE";

const PUBLIC_ROLES: {
  role: PublicRole;
  title: string;
  sub: string;
  icon: typeof Ambulance;
}[] = [
  {
    role: "DISPATCHER",
    title: "Ambulance / Dispatcher",
    sub: "Coordinate patient routing and bed holds",
    icon: Ambulance,
  },
  {
    role: "HOSPITAL_NURSE",
    title: "Hospital Nurse",
    sub: "Manage ward capacity and accept patient holds",
    icon: Building2,
  },
];

function getPasswordStrength(p: string) {
  if (!p) return { score: 0, label: "Empty", color: "bg-muted" };
  let s = 0;
  if (p.length >= 8) s += 1;
  if (/[A-Z]/.test(p)) s += 1;
  if (/[a-z]/.test(p)) s += 1;
  if (/\d/.test(p)) s += 1;

  if (s <= 2) return { score: s, label: "Weak", color: "bg-destructive text-destructive" };
  if (s === 3) return { score: s, label: "Medium", color: "bg-amber-500 text-amber-500" };
  return { score: 4, label: "Strong", color: "bg-emerald-500 text-emerald-500" };
}

function SignupPage() {
  const [step, setStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+91 98000 00012");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<PublicRole>("DISPATCHER");
  const [hospitalId, setHospitalId] = useState("");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);

  // OTP state
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const setSession = useAuth((s) => s.setSession);
  const navigate = useNavigate();

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Load active hospitals immediately on mount and cache
  useEffect(() => {
    let mounted = true;
    setLoadingHospitals(true);
    getHospitals()
      .then((data) => {
        if (!mounted) return;
        const activeOnly = (data || []).filter(
          (h) => h.active !== false && (h as any).is_active !== false
        );
        setHospitals(activeOnly);
        const firstHosp = activeOnly[0];
        if (firstHosp && !hospitalId) {
          setHospitalId(firstHosp.id);
        }
      })
      .catch((err) => {
        console.error("Failed to load hospitals:", err);
      })
      .finally(() => {
        if (mounted) setLoadingHospitals(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // When role changes to HOSPITAL_NURSE, set first hospital if none selected
  useEffect(() => {
    const first = hospitals[0];
    if (role === "HOSPITAL_NURSE" && !hospitalId && first) {
      setHospitalId(first.id);
    }
  }, [role, hospitalId, hospitals]);

  const strength = getPasswordStrength(password);

  // Step 1: Validate form and dispatch OTP
  const handleProceedToOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Full name is required.");
      return;
    }

    if (!username.trim()) {
      toast.error("Username is required.");
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
      toast.error("Username must be between 3 and 30 characters (letters, numbers, or _).");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }

    const cleanPhone = phone.replace(/[\s\-()]/g, "").trim();
    if (!cleanPhone || cleanPhone.length < 8) {
      toast.error("Please enter a valid phone number with country code.");
      return;
    }

    const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!pwdRegex.test(password)) {
      toast.error(
        "Password must be at least 8 characters and include uppercase, lowercase, and a number."
      );
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (role === "HOSPITAL_NURSE" && !hospitalId) {
      toast.error("Please select the hospital where you work.");
      return;
    }

    setBusy(true);
    try {
      const res = await sendOtp(cleanPhone);
      toast.success(res.message);
      if (res.devOtp) {
        setDevOtp(res.devOtp);
      }
      setCooldown(60);
      setStep("otp");
    } catch (err: any) {
      toast.error(err.message || "Failed to send verification code.");
    } finally {
      setBusy(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (cooldown > 0 || busy) return;
    const cleanPhone = phone.replace(/[\s\-()]/g, "").trim();
    setBusy(true);
    try {
      const res = await sendOtp(cleanPhone);
      toast.success(res.message);
      if (res.devOtp) setDevOtp(res.devOtp);
      setCooldown(60);
    } catch (err: any) {
      toast.error(err.message || "Failed to resend verification code.");
    } finally {
      setBusy(false);
    }
  };

  // Step 2: Submit OTP and register account
  const handleVerifyAndSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.trim().length !== 6) {
      toast.error("Please enter the complete 6-digit verification code.");
      return;
    }

    setBusy(true);
    try {
      const cleanPhone = phone.replace(/[\s\-()]/g, "").trim();
      const res = await signup({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        phone: cleanPhone,
        password,
        confirmPassword,
        role,
        hospital_id: role === "HOSPITAL_NURSE" ? hospitalId : null,
        hospitalId: role === "HOSPITAL_NURSE" ? hospitalId : null,
        otp: otp.trim(),
      });

      setSession(res.access_token, res.user);
      toast.success(res.message || `Welcome to BedLink, ${res.user.name}!`);
      navigate({ to: ROLE_HOME[res.user.role], replace: true });
    } catch (err: any) {
      toast.error(err.message || "Verification failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Left branding aside */}
      <aside className="relative hidden overflow-hidden bg-brand-gradient p-10 text-navy-foreground lg:flex lg:flex-col">
        <BrandMark light />
        <div className="my-auto max-w-lg">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-extrabold leading-[1.05] tracking-tight"
          >
            Join the BedLink
            <br />
            <span className="text-primary-foreground/70">Emergency Network.</span>
          </motion.h1>
          <p className="mt-5 text-lg text-navy-foreground/75">
            Real-time ambulance dispatching, instant hospital bed reservations, and explainable
            resource matching across municipal health systems.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { icon: Zap, k: "Network", v: "Live Sync" },
              { icon: Timer, k: "Hold Time", v: "02:00" },
              { icon: ShieldCheck, k: "Security", v: "OTP + JWT" },
            ].map((x) => (
              <div
                key={x.k}
                className="rounded-2xl border border-navy-foreground/15 bg-navy-foreground/5 p-4 backdrop-blur"
              >
                <x.icon className="size-5 text-navy-foreground/70" />
                <div className="mt-3 text-xl font-bold">{x.v}</div>
                <div className="text-sm text-navy-foreground/60">{x.k}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-navy-foreground/50">
          BedLink Operational Coordination Platform. Role authorization enforced at database level.
        </p>
        <svg
          className="pointer-events-none absolute -right-24 -bottom-24 size-[480px] opacity-10"
          viewBox="0 0 200 200"
          fill="none"
          stroke="currentColor"
        >
          {[30, 55, 80, 100].map((r) => (
            <circle key={r} cx="100" cy="100" r={r} strokeWidth="1" />
          ))}
        </svg>
      </aside>

      {/* Main signup form */}
      <main className="flex items-center justify-center p-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <BrandMark />
          </div>
          <DemoBadge />

          <AnimatePresence mode="wait">
            {step === "form" ? (
              <motion.div
                key="step-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="mt-4 text-3xl font-bold tracking-tight">Create your account</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sign up as an emergency dispatcher or hospital nurse.
                </p>

                <form className="mt-6 space-y-4" onSubmit={handleProceedToOtp}>
                  {/* Full Name */}
                  <div>
                    <Label htmlFor="name" className="mb-1.5 block">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      className="h-11"
                      placeholder="e.g. Priya Shah"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      required
                    />
                  </div>

                  {/* Username */}
                  <div>
                    <Label htmlFor="username" className="mb-1.5 block">
                      Username
                    </Label>
                    <div className="relative">
                      <Input
                        id="username"
                        className="h-11 pl-10 font-mono text-sm"
                        placeholder="e.g. nurse_priya (letters, numbers, _)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                        autoComplete="username"
                        required
                      />
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      You can use this username and password to sign in to your BedLink account.
                    </p>
                  </div>

                  {/* Email */}
                  <div>
                    <Label htmlFor="email" className="mb-1.5 block">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      className="h-11"
                      placeholder="e.g. priya@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <Label htmlFor="phone" className="mb-1.5 block">
                      Mobile Phone (for SMS OTP)
                    </Label>
                    <div className="relative">
                      <Input
                        id="phone"
                        type="tel"
                        className="h-11 pl-10"
                        placeholder="+91 98000 00012"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        autoComplete="tel"
                        required
                      />
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      A 6-digit verification code will be sent via SMS.
                    </p>
                  </div>

                  {/* Password */}
                  <div>
                    <Label htmlFor="pwd" className="mb-1.5 block">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="pwd"
                        type={showPassword ? "text" : "password"}
                        className="h-11 pr-10"
                        placeholder="Min 8 chars (upper, lower, number)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>

                    {/* Password strength visual */}
                    {password && (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Strength:</span>
                          <span className="font-semibold">{strength.label}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {[1, 2, 3, 4].map((s) => (
                            <div
                              key={s}
                              className={cn(
                                "h-1.5 rounded-full transition-all duration-300",
                                s <= strength.score ? strength.color : "bg-muted"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <Label htmlFor="confirmPwd" className="mb-1.5 block">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPwd"
                        type={showConfirmPassword ? "text" : "password"}
                        className="h-11 pr-10"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle className="size-3" /> Passwords do not match
                      </p>
                    )}
                  </div>

                  {/* Role Selection */}
                  <div>
                    <Label className="mb-1.5 block">Account Type</Label>
                    <div className="space-y-2">
                      {PUBLIC_ROLES.map((r) => (
                        <button
                          key={r.role}
                          type="button"
                          onClick={() => setRole(r.role)}
                          className={cn(
                            "relative flex w-full items-center gap-3 overflow-hidden rounded-xl border bg-card p-3 text-left transition hover:shadow-lift",
                            role === r.role && "border-primary/60 shadow-lift"
                          )}
                        >
                          {role === r.role && (
                            <span className="absolute inset-y-0 left-0 w-1 bg-primary" />
                          )}
                          <span
                            className={cn(
                              "grid size-10 place-items-center rounded-lg",
                              role === r.role ? "bg-primary text-primary-foreground" : "bg-muted"
                            )}
                          >
                            <r.icon className="size-4" />
                          </span>
                          <span className="flex-1">
                            <span className="block text-sm font-semibold">{r.title}</span>
                            <span className="block text-xs text-muted-foreground">{r.sub}</span>
                          </span>
                          <span
                            className={cn(
                              "size-4 rounded-full border-2",
                              role === r.role
                                ? "border-primary bg-primary ring-2 ring-primary/20 ring-offset-2 ring-offset-card"
                                : ""
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hospital Selection (Only if Hospital Nurse) */}
                  {role === "HOSPITAL_NURSE" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5"
                    >
                      <Label htmlFor="hospital-select" className="mb-1.5 block">
                        Select Hospital <span className="text-destructive">*</span>
                      </Label>
                      {loadingHospitals && hospitals.length === 0 ? (
                        <div className="flex h-11 items-center gap-2 rounded-md border bg-muted/30 px-3 text-sm text-muted-foreground">
                          <Loader2 className="size-4 animate-spin text-primary" /> Loading active hospitals...
                        </div>
                      ) : (
                        <select
                          id="hospital-select"
                          value={hospitalId}
                          onChange={(e) => setHospitalId(e.target.value)}
                          className="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                          required
                        >
                          <option value="" disabled>
                            -- Select Hospital --
                          </option>
                          {hospitals.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.name} {h.area ? `(${h.area})` : ""}
                            </option>
                          ))}
                        </select>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Hospital nurses are permanently linked to their designated hospital.
                      </p>
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <Button type="submit" className="h-11 w-full text-base" disabled={busy}>
                    {busy ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" /> Sending verification code...
                      </>
                    ) : (
                      "Continue & Send OTP"
                    )}
                  </Button>
                </form>

                {/* Already have an account */}
                <div className="mt-6 text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link to="/login" className="font-semibold text-primary hover:underline">
                    Sign In
                  </Link>
                </div>
              </motion.div>
            ) : (
              /* Step 2: OTP Verification */
              <motion.div
                key="step-otp"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <button
                    type="button"
                    onClick={() => setStep("form")}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="size-3.5" /> Back to details
                  </button>
                  <h2 className="mt-3 text-3xl font-bold tracking-tight">Verify your phone</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enter the 6-digit OTP code sent to{" "}
                    <span className="font-semibold text-foreground">{phone}</span>
                  </p>
                </div>

                {devOtp && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-primary">
                    <span className="font-semibold">Dev Mode Hint:</span> Verification code is{" "}
                    <button
                      type="button"
                      onClick={() => setOtp(devOtp)}
                      className="font-mono font-bold underline"
                    >
                      {devOtp}
                    </button>{" "}
                    (click to autofill)
                  </div>
                )}

                <form onSubmit={handleVerifyAndSignup} className="space-y-6">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <InputOTP maxLength={6} value={otp} onChange={(val) => setOtp(val)}>
                      <InputOTPGroup className="gap-2">
                        <InputOTPSlot index={0} className="h-12 w-11 rounded-lg border text-lg font-bold" />
                        <InputOTPSlot index={1} className="h-12 w-11 rounded-lg border text-lg font-bold" />
                        <InputOTPSlot index={2} className="h-12 w-11 rounded-lg border text-lg font-bold" />
                        <InputOTPSlot index={3} className="h-12 w-11 rounded-lg border text-lg font-bold" />
                        <InputOTPSlot index={4} className="h-12 w-11 rounded-lg border text-lg font-bold" />
                        <InputOTPSlot index={5} className="h-12 w-11 rounded-lg border text-lg font-bold" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <Button type="submit" className="h-12 w-full text-base" disabled={busy || otp.length !== 6}>
                    {busy ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" /> Verifying & Creating Account...
                      </>
                    ) : (
                      "Verify & Create Account"
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Didn't receive code?</span>
                    <button
                      type="button"
                      disabled={cooldown > 0 || busy}
                      onClick={handleResendOtp}
                      className={cn(
                        "font-semibold transition",
                        cooldown > 0 ? "text-muted-foreground/60 cursor-not-allowed" : "text-primary hover:underline"
                      )}
                    >
                      {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
