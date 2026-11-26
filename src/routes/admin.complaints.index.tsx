import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { priorityStyles, statusLabel, statusStyles } from "@/lib/format";
import { TimeAgo } from "@/components/TimeAgo";
import { Search, Download } from "lucide-react";

const listQuery = {
  queryKey: ["admin", "complaints", "list"],
  queryFn: async () => {
    const { data } = await supabase
      .from("complaints")
      .select(
        "id, reference, description, priority, status, assigned_department, created_at, resident_name, categories(name, color, slug), wards(ward_number), towns(name)",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    return data ?? [];
  },
};

export const Route = createFileRoute("/admin/complaints/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(listQuery),
  component: ComplaintsList,
  errorComponent: ({ error }) => (
    <div className="p-8 text-destructive">
      {error instanceof Error ? error.message : String(error)}
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function ComplaintsList() {
  const { data } = useSuspenseQuery(listQuery);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [dept, setDept] = useState<string>("all");

  const depts = useMemo(() => {
    const s = new Set<string>();
    data.forEach((c) => c.assigned_department && s.add(c.assigned_department));
    return Array.from(s).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return data.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (priority !== "all" && c.priority !== priority) return false;
      if (dept !== "all" && c.assigned_department !== dept) return false;
      if (
        term &&
        !`${c.reference} ${c.description} ${c.resident_name}`.toLowerCase().includes(term)
      )
        return false;
      return true;
    });
  }, [data, q, status, priority, dept]);

  function exportCsv() {
    const rows = [
      [
        "Reference",
        "Category",
        "Priority",
        "Status",
        "Department",
        "Ward",
        "Town",
        "Resident",
        "Description",
        "Created",
      ],
      ...filtered.map((c) => [
        c.reference,
        c.categories?.name ?? "",
        c.priority,
        c.status,
        c.assigned_department ?? "",
        c.wards?.ward_number ?? "",
        c.towns?.name ?? "",
        c.resident_name,
        c.description.replace(/"/g, '""'),
        c.created_at,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ngwathe-complaints-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Complaints</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {data.length} complaints
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </header>

      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-card sm:grid-cols-2 md:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search reference, name, keyword"
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          {["new", "acknowledged", "assigned", "in_progress", "on_hold", "resolved", "closed"].map(
            (s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ),
          )}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All priorities</option>
          {["critical", "high", "medium", "low"].map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="all">All departments</option>
          {depts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <table className="min-w-full text-sm">
          <thead className="bg-secondary text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Reference</th>
              <th className="px-4 py-3 text-left">Issue</th>
              <th className="px-4 py-3 text-left">Priority</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Department</th>
              <th className="px-4 py-3 text-left">Ward</th>
              <th className="px-4 py-3 text-left">Logged</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((c) => (
              <tr key={c.id} className="cursor-pointer hover:bg-accent">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link
                    to="/admin/complaints/$id"
                    params={{ id: c.id }}
                    className="text-primary hover:underline"
                  >
                    {c.reference}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: c.categories?.color ?? "#888" }}
                    />
                    <div>
                      <div className="font-medium text-foreground">{c.categories?.name}</div>
                      <div className="line-clamp-1 max-w-md text-xs text-muted-foreground">
                        {c.description}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${priorityStyles[c.priority]}`}
                  >
                    {c.priority}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyles[c.status]}`}
                  >
                    {statusLabel(c.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {c.assigned_department ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs">{c.wards?.ward_number ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {<TimeAgo value={c.created_at} />}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                  No complaints match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
