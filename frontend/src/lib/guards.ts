import { redirect } from "@tanstack/react-router";
import { useAuth, canAccess, ROLE_HOME } from "./auth-store";
import type { Role } from "./types";

/** Client-side role gate (routes using it set ssr: false). Real enforcement belongs to the backend. */
export function requireRole(area: Role) {
  const { user, token } = useAuth.getState();
  if (!user || !token) throw redirect({ to: "/login" });
  if (!canAccess(user.role, area)) throw redirect({ to: ROLE_HOME[user.role] });
}
