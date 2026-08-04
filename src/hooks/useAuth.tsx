import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
  refreshRole: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRole = async (uid: string | undefined) => {
    if (!uid) {
      setIsAdmin(false);
      return;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
      setTimeout(() => void loadRole(newSession?.user?.id), 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      void loadRole(data.session?.user?.id);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    user,
    session,
    isAdmin,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
      setIsAdmin(false);
    },
    refreshRole: async () => loadRole(user?.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
