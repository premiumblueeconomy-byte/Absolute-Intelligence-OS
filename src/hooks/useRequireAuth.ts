import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";

/** Redirects to /login (or /onboarding if the profile isn't set up yet) once auth state resolves. */
export function useRequireAuth() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) { void navigate({ to: "/login" }); return; }
    if (profile && !profile.onboarded) { void navigate({ to: "/onboarding" }); }
  }, [loading, user, profile, navigate]);

  return { user, profile, ready: !loading && !!user && (!profile || profile.onboarded) };
}
