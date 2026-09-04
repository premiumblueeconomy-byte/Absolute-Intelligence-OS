import { createFileRoute } from "@tanstack/react-router";
import Aiq from "@/pages/Aiq";

export const Route = createFileRoute("/aiq")({
  head: () => ({ meta: [{ title: "AIQ — Absolute Intelligence OS" }] }),
  component: Aiq,
});
