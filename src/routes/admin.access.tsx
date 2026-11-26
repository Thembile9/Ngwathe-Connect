import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listStaffAccounts, setUserRoles, linkPersonnelAccount } from "@/lib/admin-users.functions";
import { useStaff, roleLabel, type AppRole } from "@/lib/auth";
import { KeyRound, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/admin/access")({
  component: AccessControl,
  errorComponent: ({ error }) => (
    <div className="p-8 text-destructive">
      {error instanceof Error ? error.message : String(error)}
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

const allRoles: AppRole[] = ["admin", "switchboard", "supervisor", "technician"];

function AccessControl() {
  const { staff, loading } = useStaff();
  const qc = useQueryClient();
  const load = useServerFn(listStaffAccounts);
  const saveRoles = useServerFn(setUserRoles);
  const linkPerson = useServerFn(linkPersonnelAccount);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["staff-accounts"],
    enabled: !!staff?.isAdmin,
    queryFn: () => load(),
  });

  const { data: personnel = [] } = useQuery({
    queryKey: ["personnel", "all"],
    enabled: !!staff?.isAdmin,
    queryFn: async () =>
      (await supabase.from("personnel").select("id, full_name, department").order("full_name"))
        .data ?? [],
  });

  const rolesMutation = useMutation({
    mutationFn: (v: { user_id: string; roles: AppRole[] }) => saveRoles({ data: v }),
    onSuccess: () => {
      toast.success("Roles updated");
      qc.invalidateQueries({ queryKey: ["staff-accounts"] });
      qc.invalidateQueries({ queryKey: ["staff-identity"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const linkMutation = useMutation({
    mutationFn: (v: { user_id: string; personnel_id: string | null }) => linkPerson({ data: v }),
    onSuccess: () => {
      toast.success("Personnel link updated");
      qc.invalidateQueries({ queryKey: ["staff-accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!staff?.isAdmin) {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <ShieldAlert className="mx-auto h-9 w-9 text-warning-foreground" />
        <h1 className="mt-3 font-display text-lg font-bold">Administrators only</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Role assignment is restricted to municipal system administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <header>
        <h1 className="flex items-center gap-2 font-display text-3xl font-bold text-foreground">
          <KeyRound className="h-7 w-7 text-primary" /> Access control
        </h1>
        <p className="text-sm text-muted-foreground">
          Grant roles and link staff accounts to personnel records. Technicians only see job cards
          assigned to them; supervisors only see their own department.
        </p>
      </header>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <table className="min-w-full text-sm">
          <thead className="bg-secondary text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Staff member</th>
              <th className="px-4 py-3 text-left">Roles</th>
              <th className="px-4 py-3 text-left">Linked personnel record</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {accounts.map((a) => {
              const current = a.roles as AppRole[];
              return (
                <tr key={a.user_id}>
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-foreground">{a.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{a.email}</div>
                    {a.department && (
                      <div className="text-xs text-muted-foreground">{a.department}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-2">
                      {allRoles.map((r) => {
                        const on = current.includes(r);
                        return (
                          <button
                            key={r}
                            disabled={rolesMutation.isPending}
                            onClick={() =>
                              rolesMutation.mutate({
                                user_id: a.user_id,
                                roles: on ? current.filter((x) => x !== r) : [...current, r],
                              })
                            }
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                              on
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            {roleLabel[r]}
                          </button>
                        );
                      })}
                    </div>
                    {current.length === 0 && (
                      <div className="mt-1 text-[11px] text-warning-foreground">No access</div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <select
                      value={a.personnel?.id ?? ""}
                      onChange={(e) =>
                        linkMutation.mutate({
                          user_id: a.user_id,
                          personnel_id: e.target.value || null,
                        })
                      }
                      className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    >
                      <option value="">Not linked</option>
                      {personnel.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name} · {p.department}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
            {!isLoading && accounts.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-sm text-muted-foreground">
                  No staff accounts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
