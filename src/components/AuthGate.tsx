import type { ReactNode } from "react";
import { toast } from "sonner";
import { Navigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";

// Page content never mounts until the session and profile have resolved.
// Supabase RLS remains the authority for access to data.
export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { user, profile, loading, profileError, refreshProfile, signOut } = useAuth();
  if (["/", "/login", "/signup"].includes(pathname)) return children;
  if (loading) return <p role="status" className="p-8 text-center">Checking your session…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (profileError || !profile) return (
    <div role="alert" className="p-8 text-center space-y-4">
      <p>We couldn't load your account. Please try again.</p>
      <button onClick={() => void refreshProfile()}>Try again</button>{" "}
      <button onClick={() => void signOut().catch(() => toast.error("Unable to sign out. Please try again."))}>Sign out</button>
    </div>
  );
  if (!profile.onboarded && pathname !== "/onboarding") return <Navigate to="/onboarding" replace />;
  if (pathname === "/admin" && !profile.is_platform_admin) return <p role="alert" className="p-8">You don't have access to this page.</p>;
  return children;
}

