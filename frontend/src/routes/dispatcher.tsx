import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dispatcher")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/dispatch" });
  },
  component: () => null,
});
