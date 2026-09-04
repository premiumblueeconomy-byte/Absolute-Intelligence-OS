import { createFileRoute } from "@tanstack/react-router";
import SystemMapPage from "@/pages/SystemMapPage";

export const Route = createFileRoute("/maps/$mapId")({
  head: () => ({ meta: [{ title: "System Map — Absolute Intelligence OS" }] }),
  component: SystemMapPage,
});
