import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Users, Plus, Phone, Circle } from "lucide-react";

const personnelQuery = {
  queryKey: ["admin", "personnel"],
  queryFn: async () => {
    const [people, jobs] = await Promise.all([
      supabase.from("personnel").select("*").order("department").order("full_name"),
      supabase.from("job_cards").select("assigned_to, status"),
    ]);
    return { people: people.data ?? [], jobs: jobs.data ?? [] };
  },
};

export const Route = createFileRoute("/admin/personnel")({
  loader: ({ context }) => context.queryClient.ensureQueryData(personnelQuery),
  component: PersonnelPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function PersonnelPage() {
  const { data } = useSuspenseQuery(personnelQuery);
  const qc = useQueryClient();
  const [form, setForm] = useState({ full_name: "", phone: "", department: "", role: "technician" });
  const [busy, setBusy] = useState(false);

  const openByPerson = new Map<string, number>();
  data.jobs.forEach((j) => {
    if (!j.assigned_to) return;
    if (["completed", "not_completed", "cancelled"].includes(j.status)) return;
    openByPerson.set(j.assigned_to, (openByPerson.get(j.assigned_to) ?? 0) + 1);
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("personnel").insert({
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      department: form.department.trim(),
      role: form.role as "admin" | "switchboard" | "supervisor" | "technician",
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Personnel added");
    setForm({ full_name: "", phone: "", department: "", role: "technician" });
    qc.invalidateQueries();
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from("personnel").update({ active: !active }).eq("id", id);
    qc.invalidateQueries();
  }

  const grouped = data.people.reduce<Record<string, typeof data.people>>((acc, p) => {
    (acc[p.department] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <header>
        <h1 className="flex items-center gap-2 font-display text-3xl font-bold text-foreground">
          <Users className="h-7 w-7 text-primary" /> Departments & personnel
        </h1>
        <p className="text-sm text-muted-foreground">The people the switchboard can send job cards to.</p>
      </header>

      <form onSubmit={add} className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-card sm:grid-cols-5">
        <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required placeholder="Full name" className={inp} />
        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className={inp} />
        <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required placeholder="Department" list="depts" className={inp} />
        <datalist id="depts">{Object.keys(grouped).map((d) => <option key={d} value={d} />)}</datalist>
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inp}>
          {["technician", "supervisor", "switchboard", "admin"].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <button disabled={busy} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          <Plus className="h-4 w-4" /> Add
        </button>
      </form>

      {Object.entries(grouped).map(([dept, people]) => (
        <section key={dept} className="rounded-xl border border-border bg-card shadow-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">{dept}</h2>
          </div>
          <div className="divide-y divide-border">
            {people.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Circle className={`h-2 w-2 ${p.active ? "fill-success text-success" : "fill-muted-foreground text-muted-foreground"}`} />
                    <span className="text-sm font-medium text-foreground">{p.full_name}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase text-secondary-foreground">{p.role}</span>
                  </div>
                  {p.phone && <a href={`tel:${p.phone}`} className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{p.phone}</a>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-lg font-bold text-foreground">{openByPerson.get(p.id) ?? 0}</div>
                    <div className="text-[10px] uppercase text-muted-foreground">open jobs</div>
                  </div>
                  <button onClick={() => toggleActive(p.id, p.active)} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent">
                    {p.active ? "Set off duty" : "Set on duty"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const inp = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
