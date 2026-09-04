import { createFileRoute } from "@tanstack/react-router";
import Landing from "@/pages/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Absolute Intelligence OS" },
      {
        name: "description",
        content: "Give AIOS a resource, problem, technology, market, research finding or idea — it reveals what it connects to, what it could become, where the opportunities are, and what to do next.",
      },
    ],
  }),
  component: Landing,
});
