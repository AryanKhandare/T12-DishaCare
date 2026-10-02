import { useEffect, useState, type ReactNode } from "react";
import { useSim } from "@/lib/sim-store";
import { useTheme } from "@/lib/theme";
import { getHospitals } from "@/lib/api";
import { initSocket } from "@/lib/socket";

/** Hydrates the shared simulation store, runs the engine tick and syncs across tabs. */
export function SimProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    useTheme.getState().init();
    void useSim.persist.rehydrate();
    // Connect to backend API and real-time socket
    void getHospitals().catch(() => {});
    try { initSocket(); } catch {}
    const t = setInterval(() => useSim.getState().tick(), 500);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "bedlink-sim") void useSim.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    // BroadcastChannel nudges other tabs immediately after every local change.
    const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("bedlink-sim") : null;
    let remote = false;
    if (bc) bc.onmessage = () => { remote = true; void Promise.resolve(useSim.persist.rehydrate()).finally(() => { remote = false; }); };
    const unsub = useSim.subscribe(() => { if (!remote) bc?.postMessage("sync"); });
    return () => {
      unsub();
      bc?.close();
      clearInterval(t);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return <>{children}</>;
}

export function useSimHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => {
    setH(useSim.persist.hasHydrated());
    return useSim.persist.onFinishHydration(() => setH(true));
  }, []);
  return h;
}
