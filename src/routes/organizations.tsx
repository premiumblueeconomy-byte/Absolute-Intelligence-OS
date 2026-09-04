import { createFileRoute } from "@tanstack/react-router";
import Organizations from "@/pages/Organizations";

export const Route = createFileRoute("/organizations")({
  head: () => ({ meta: [{ title: "Organizations — Absolute Intelligence OS" }] }),
  component: Organizations,
});
