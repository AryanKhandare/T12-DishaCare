import { createFileRoute, redirect } from "@tanstack/react-router";
import { useAuth, ROLE_HOME } from "@/lib/auth-store";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "DishaCare — Secure the right bed" },
      { name: "description", content: "Real-time emergency hospital and bed allocation platform." },
      { property: "og:title", content: "DishaCare — Secure the right bed" },
      { property: "og:description", content: "Real-time emergency hospital and bed allocation platform." },
    ],
  }),
  beforeLoad: () => {
    const u = useAuth.getState().user;
    throw redirect({ to: u ? ROLE_HOME[u.role] : "/login" });
  },
  component: () => null,
});
