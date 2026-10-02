import { createFileRoute } from "@tanstack/react-router";
import { ReservationHistory } from "@/components/bedlink/ReservationHistory";

export const Route = createFileRoute("/admin/reservations")({
  head: () => ({
    meta: [
      { title: "Reservation history — DishaCare" },
      { name: "description", content: "Every bed reservation with status and a full request event timeline." },
      { property: "og:title", content: "Reservation history — DishaCare" },
      { property: "og:description", content: "Every bed reservation with a full event timeline." },
    ],
  }),
  component: () => <ReservationHistory title="Reservation History" subtitle="Click a row to open the request's event timeline." />,
});
