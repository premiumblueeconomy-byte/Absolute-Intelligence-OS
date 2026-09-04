import { createFileRoute } from "@tanstack/react-router";
import OpportunityDetail from "@/pages/OpportunityDetail";

export const Route = createFileRoute("/opportunities/$opportunityId")({
  head: () => ({ meta: [{ title: "Opportunity — Absolute Intelligence OS" }] }),
  component: OpportunityDetail,
});
