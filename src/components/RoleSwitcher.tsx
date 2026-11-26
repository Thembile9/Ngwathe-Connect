import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useDemoUser, type DemoUser } from "@/lib/demo-session";
import { UserCog } from "lucide-react";

export function RoleSwitcher() {
  const [user, setUser] = useDemoUser();
  const { data: people = [] } = useQuery({
    queryKey: ["personnel", "active"],
    queryFn: async () =>
      (
        await supabase
          .from("personnel")
          .select("id, full_name, department, role")
          .eq("active", true)
          .order("full_name")
      ).data ?? [],
  });

  const value = user.personnelId ?? "switchboard";

  function change(v: string) {
    if (v === "switchboard") {
      setUser({
        role: "switchboard",
        personnelId: null,
        name: "Switchboard Operator",
        department: "Switchboard",
      });
      return;
    }
    const p = people.find((x) => x.id === v);
    if (!p) return;
    const next: DemoUser = {
      role: p.role === "supervisor" ? "supervisor" : "technician",
      personnelId: p.id,
      name: p.full_name,
      department: p.department,
    };
    setUser(next);
  }

  return (
    <div className="rounded-md bg-sidebar-accent/60 p-2">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/70">
        <UserCog className="h-3 w-3" /> Signed in as (demo)
      </div>
      <select
        value={value}
        onChange={(e) => change(e.target.value)}
        className="w-full rounded-md border border-sidebar-border bg-sidebar px-2 py-1.5 text-xs text-sidebar-foreground"
      >
        <option value="switchboard">Switchboard Operator</option>
        {people
          .filter((p) => p.role !== "switchboard")
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name} · {p.department}
            </option>
          ))}
      </select>
    </div>
  );
}
