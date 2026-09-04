import { createFileRoute } from "@tanstack/react-router";
import Prompts from "@/pages/Prompts";

export const Route = createFileRoute("/prompts")({
  head: () => ({ meta: [{ title: "Prompt Library — Absolute Intelligence OS" }] }),
  component: Prompts,
});
