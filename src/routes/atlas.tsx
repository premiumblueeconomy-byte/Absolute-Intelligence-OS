import { createFileRoute } from "@tanstack/react-router";
import Atlas from "@/pages/Atlas";

export const Route = createFileRoute("/atlas")({
  head: () => ({ meta: [{ title: "Global Opportunity Atlas — Absolute Intelligence OS" }] }),
  component: Atlas,
});
