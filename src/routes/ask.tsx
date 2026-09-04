import { createFileRoute } from "@tanstack/react-router";
import Ask from "@/pages/Ask";

export const Route = createFileRoute("/ask")({
  head: () => ({ meta: [{ title: "Ask Absolute — Absolute Intelligence OS" }] }),
  component: Ask,
});
