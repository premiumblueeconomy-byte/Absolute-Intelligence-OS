import { createFileRoute } from "@tanstack/react-router";
import ProjectWorkspace from "@/pages/ProjectWorkspace";

export const Route = createFileRoute("/projects/$projectId")({
  head: () => ({ meta: [{ title: "Project — Absolute Intelligence OS" }] }),
  component: ProjectWorkspace,
});
