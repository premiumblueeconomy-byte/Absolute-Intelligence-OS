import { createFileRoute } from "@tanstack/react-router";
import IntelligenceGraph from "@/pages/IntelligenceGraph";

export const Route = createFileRoute("/graph")({
  head: () => ({ meta: [{ title: "Intelligence Graph — Absolute Intelligence OS" }] }),
  component: IntelligenceGraph,
});
