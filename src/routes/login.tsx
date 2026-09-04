import { createFileRoute } from "@tanstack/react-router";
import Login from "@/pages/Login";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Absolute Intelligence OS" }] }),
  component: Login,
});
