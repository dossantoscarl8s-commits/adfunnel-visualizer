import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "user";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [username, setUsername] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) {
        setRole(null);
        setLoading(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    (async () => {
      const [{ data: roleRow }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("profiles").select("username, full_name").eq("id", session.user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setRole(((roleRow?.role as AppRole) ?? "user") as AppRole);
      setUsername(profile?.username ?? session.user.email?.split("@")[0] ?? "");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  return { session, role, username, loading, isAdmin: role === "admin" };
}

export function useRequireAuth(adminOnly = false) {
  const auth = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (auth.loading) return;
    if (!auth.session) navigate({ to: "/auth" });
    else if (adminOnly && auth.role !== "admin") navigate({ to: "/" });
  }, [auth.loading, auth.session, auth.role, adminOnly, navigate]);
  return auth;
}
