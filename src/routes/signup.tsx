import { createFileRoute } from "@tanstack/react-router";
import Signup from "@/pages/Signup";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create an account — Absolute Intelligence OS" }] }),
  component: Signup,
});
