import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
  profileError: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  profileError: false,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileVersion, setProfileVersion] = useState(0);
  const currentUserId = useRef<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextId = session?.user.id ?? null;
      if (currentUserId.current !== nextId) {
        currentUserId.current = nextId;
        queryClient.clear();
        setProfile(null);
        setProfileLoading(!!nextId);
        setProfileError(false);
      }
      if (_event === "TOKEN_REFRESHED") setProfileVersion(v => v + 1);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    // INITIAL_SESSION is delivered by the subscription; a second getSession
    // request can race with sign-out and restore stale account state.
    return () => subscription.unsubscribe();
  }, [queryClient]);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) { setProfileLoading(false); return; }
    setProfileLoading(true);
    setProfileError(false);
    void (async () => {
      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (!cancelled) {
          setProfile(data ?? null);
          setProfileError(!!error || !data);
        }
      } catch {
        if (!cancelled) { setProfile(null); setProfileError(true); }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, profileVersion]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const refreshProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileVersion((version) => version + 1);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading: loading || (!!user && profileLoading), profile, profileError, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
