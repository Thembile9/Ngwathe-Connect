import { useSession } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export type DemoRole = "switchboard" | "supervisor" | "technician";

export type DemoUser = {
  role: DemoRole;
  /** personnel.id — only set for supervisor / technician */
  personnelId: string | null;
  name: string;
  department: string | null;
};

const KEY = "ngwathe.demo.user";

export const defaultDemoUser: DemoUser = {
  role: "switchboard",
  personnelId: null,
  name: "Switchboard Operator",
  department: "Switchboard",
};

function read(): DemoUser {
  if (typeof window === "undefined") return defaultDemoUser;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...defaultDemoUser, ...JSON.parse(raw) } : defaultDemoUser;
  } catch {
    return defaultDemoUser;
  }
}

const listeners = new Set<(u: DemoUser) => void>();

export function setDemoUser(user: DemoUser) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(user));
  listeners.forEach((fn) => fn(user));
}

/** Reads the demo staff identity after hydration so SSR and client agree. */
export function useDemoUser() {
  const [user, setUser] = useState<DemoUser>(defaultDemoUser);

  useEffect(() => {
    setUser(read());
    const fn = (u: DemoUser) => setUser(u);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  return [user, setDemoUser] as const;
}

export function useMyReports() {
  const { session } = useSession();
  const id = session?.user.id;
  const { data } = useQuery({ queryKey: ["resident-references", id], enabled: !!id, queryFn: async () => {
    const result = await supabase.from("complaints").select("reference").eq("resident_user_id", id!);
    if (result.error) throw result.error;
    return result.data.map(row => row.reference);
  }, staleTime: 0, refetchOnMount: "always" });
  return data ?? [];
}
