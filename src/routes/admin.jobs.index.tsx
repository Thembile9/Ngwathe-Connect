import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { priorityStyles, formatDate } from "@/lib/format";
import { duration, jobStatusLabel, jobStatusStyles, slaState, turnaroundHours } from "@/lib/jobs";
import { HardHat, Search, Download } from "lucide-react";

const jobsQuery = {
  queryKey: ["admin", "jobs"],
  queryFn: async () => {
    const { data } = await supabase
      .from("job_cards")
      .select("id, job_number, title, department, status, priority, location_text, complaint_received_at, dispatched_at, accepted_at, started_at, due_at, completed_at, created_at, resident_name, personnel:assigned_to(full_name), complaints(reference)")
      .order("created_at", { ascending: false })
      .limit(500);
    return data ?? [];
  },
};

export const Route = createFileRoute("/admin/jobs/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(jobsQuery),
  component: JobRegister,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function JobRegister() {
  const { data } = useSuspenseQuery(jobsQuery);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [dept, setDept] = useState("all");

  const departments = useMemo(() => Array.from(new Set(data.map((j) => j.department))).sort(), [data]);

  const filtered = data.filter((j) => {
    if (status !== "all" && j.status !== status) return false;
    if (dept !== "all" && j.department !== dept) return false;
    if (q && !`${j.job_number} ${j.title} ${j.resident_name ?? ""} ${j.personnel?.full_name ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const completed = data.filter((j) => j.status === "completed");
  const turnarounds = completed
    .map((j) => turnaroundHours(j.complaint_received_at ?? j.created_at, j.completed_at))
    .filter((v): v is number => v !== null);
  const avgTurnaround = turnarounds.length ? turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length : 0;
  const overdue = data.filter((j) => j.due_at && !j.completed_at && new Date(j.due_at) < new Date() && !["cancelled"].includes(j.status)).length;

  function exportCsv() {
    const rows = [
      ["Job number", "Complaint ref", "Title", "Department", "Assigned to", "Priority", "Status", "Received", "Dispatched", "Started", "Due", "Completed", "Turnaround (h)"],
      ...filtered.map((j) => [
        j.job_number,
        j.complaints?.reference ?? "",
        j.title,
        j.department,
        j.personnel?.full_name ?? "",
        j.priority,
        j.status,
        j.complaint_received_at ?? "",
        j.dispatched_at ?? "",
        j.started_at ?? "",
        j.due_at ?? "",
        j.completed_at ?? "",
        (turnaroundHours(j.complaint_received_at ?? j.created_at, j.completed_at) ?? "").toString(),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `ngwathe-job-cards-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-bold text-foreground">
            <HardHat className="h-7 w-7 text-primary" /> Job card register
          </h1>
          <p className="text-sm text-muted-foreground">
            {data.length} job cards · {overdue} overdue · average turnaround {avgTurnaround.toFixed(1)}h from complaint to completion
          </p>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </header>

      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-card sm:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job number, worker, resident" className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          {Object.keys(jobStatusLabel).map((s) => <option key={s} value={s}>{jobStatusLabel[s]}</option>)}
        </select>
        <select value={dept} onChange={(e) => setDept(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="all">All departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <table className="min-w-full text-sm">
          <thead className="bg-secondary text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Job</th>
              <th className="px-4 py-3 text-left">Work</th>
              <th className="px-4 py-3 text-left">Assigned to</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Received</th>
              <th className="px-4 py-3 text-left">Elapsed</th>
              <th className="px-4 py-3 text-left">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((j) => {
              const sla = slaState(j);
              return (
                <tr key={j.id} className="hover:bg-accent">
                  <td className="px-4 py-3 align-top">
                    <Link to="/admin/jobs/$id" params={{ id: j.id }} className="font-mono text-xs font-semibold text-primary hover:underline">{j.job_number}</Link>
                    <div className="mt-1"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${priorityStyles[j.priority]}`}>{j.priority}</span></div>
                  </td>
                  <td className="max-w-xs px-4 py-3 align-top">
                    <div className="truncate font-medium text-foreground">{j.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{j.department}{j.location_text ? ` · ${j.location_text}` : ""}</div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs">{j.personnel?.full_name ?? <span className="text-warning-foreground">Unassigned</span>}</td>
                  <td className="px-4 py-3 align-top">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${jobStatusStyles[j.status]}`}>{jobStatusLabel[j.status]}</span>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-muted-foreground">{formatDate(j.complaint_received_at ?? j.created_at)}</td>
                  <td className="px-4 py-3 align-top text-xs font-medium text-foreground">
                    {duration(j.complaint_received_at ?? j.created_at, j.completed_at)}
                  </td>
                  <td className="px-4 py-3 align-top text-xs">
                    <span className={
                      sla.tone === "destructive" ? "font-semibold text-destructive"
                      : sla.tone === "warning" ? "font-semibold text-warning-foreground"
                      : sla.tone === "success" ? "font-semibold text-success"
                      : "text-muted-foreground"
                    }>{sla.label}</span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">No job cards match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
