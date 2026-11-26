import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "switchboard" | "supervisor" | "technician";

export const roleLabel: Record<AppRole, string> = {
  admin: "Administrator",
  switchboard: "Switchboard operator",
  supervisor: "Department supervisor",
  technician: "Field technician",
};

export type StaffIdentity = {
  userId: string;
  email: string | null;
  fullName: string;
  roles: AppRole[];
  department: string | null;
  personnelId: string | null;
  isAdmin: boolean;
  isControlRoom: boolean;
  isSupervisor: boolean;
  isTechnician: boolean;
  hasAccess: boolean;
};

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (active) setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, ready };
}

/** Signed-in staff identity: roles, department, and linked personnel record. */
export function useStaff() {
  const { session, ready } = useSession();
  const userId = session?.user.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["staff-identity", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<StaffIdentity> => {
      const [rolesRes, profileRes, personRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId!),
        supabase
          .from("profiles")
          .select("full_name, department, email")
          .eq("user_id", userId!)
          .maybeSingle(),
        supabase
          .from("personnel")
          .select("id, full_name, department")
          .eq("user_id", userId!)
          .maybeSingle(),
      ]);

      if (rolesRes.error) throw rolesRes.error;
      const roles = (rolesRes.data ?? []).map((r) => r.role as AppRole);
      const isAdmin = roles.includes("admin");
      const isControlRoom = isAdmin || roles.includes("switchboard");

      return {
        userId: userId!,
        email: session?.user.email ?? profileRes.data?.email ?? null,
        fullName:
          personRes.data?.full_name ||
          profileRes.data?.full_name ||
          session?.user.email ||
          "Staff member",
        roles,
        department: personRes.data?.department ?? profileRes.data?.department ?? null,
        personnelId: personRes.data?.id ?? null,
        isAdmin,
        isControlRoom,
        isSupervisor: roles.includes("supervisor"),
        isTechnician: roles.includes("technician"),
        hasAccess: roles.length > 0,
      };
    },
  });

  return { staff: data ?? null, session, loading: !ready || (!!userId && isLoading) };
}

export function useSignOut() {
  const qc = useQueryClient();
  return async () => {
    const { error } = await supabase.auth.signOut({
      scope: "local",
    });

    if (error) {
      window.alert("Unable to sign out. Please try again.");
      return;
    }

    await qc.cancelQueries();
    qc.clear();
    window.location.replace("/auth");
  };
}
