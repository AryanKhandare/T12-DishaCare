import { createFileRoute } from "@tanstack/react-router";
import { ReservationHistory } from "@/components/bedlink/ReservationHistory";

export const Route = createFileRoute("/admin/requests")({
  head: () => ({
    meta: [
      { title: "Active requests — DishaCare" },
      { name: "description", content: "Live emergency requests awaiting hospital response or holding a bed." },
      { property: "og:title", content: "Active requests — DishaCare" },
      { property: "og:description", content: "Live emergency requests and held beds." },
    ],
  }),
  component: () => <ReservationHistory title="Active Requests" subtitle="Pending reservations and beds currently held." defaultTab="active" />,
});
