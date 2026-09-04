import { createFileRoute } from "@tanstack/react-router";
import OrganizationDetail from "@/pages/OrganizationDetail";

export const Route = createFileRoute("/organizations/$orgId")({
  head: () => ({ meta: [{ title: "Organization — Absolute Intelligence OS" }] }),
  component: OrganizationDetail,
});
