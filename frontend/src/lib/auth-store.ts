import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Role, User } from "./types";

interface AuthState {
  token: string | null;
  user: User | null;
  setSession: (token: string, user: User) => void;
  logout: () => void;
}

const noopStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: "bedlink-auth",
      storage: createJSONStorage(() => (typeof window === "undefined" ? noopStorage : sessionStorage)),
    },
  ),
);

export const ROLE_HOME: Record<Role, "/dispatch" | "/hospital" | "/admin"> = {
  dispatcher: "/dispatch",
  hospital: "/hospital",
  admin: "/admin",
};

export const ROLE_LABEL: Record<Role, string> = {
  dispatcher: "Dispatcher",
  hospital: "Hospital / Nurse",
  admin: "Command Center",
};

export function canAccess(role: Role | undefined, area: Role) {
  return role === "admin" || role === area;
}
