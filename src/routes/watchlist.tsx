import { createFileRoute } from "@tanstack/react-router";
import Watchlist from "@/pages/Watchlist";

export const Route = createFileRoute("/watchlist")({
  head: () => ({ meta: [{ title: "Watchlist — Absolute Intelligence OS" }] }),
  component: Watchlist,
});
