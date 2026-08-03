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

/* ---------- Resident side: remembered report references ---------- */

const REPORTS_KEY = "ngwathe.my.reports";

export function rememberReport(reference: string) {
  if (typeof window === "undefined") return;
  const list = readReports().filter((r) => r !== reference);
  list.unshift(reference);
  window.localStorage.setItem(REPORTS_KEY, JSON.stringify(list.slice(0, 50)));
}

export function readReports(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REPORTS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function useMyReports() {
  const [refs, setRefs] = useState<string[]>([]);
  useEffect(() => setRefs(readReports()), []);
  return refs;
}
