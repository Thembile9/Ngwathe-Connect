import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { exportCsv, exportPdf, type ReportColumn } from "@/lib/report-export";
import { ScrollText, Download, FileText, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/admin/audit")({
  component: AuditLogs,
  errorComponent: ({ error }) => (
    <div className="p-8 text-destructive">
      {error instanceof Error ? error.message : String(error)}
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

const columns: ReportColumn[] = [
  { key: "created_at", label: "Date & time" },
  { key: "entity_type", label: "Record" },
  { key: "entity_ref", label: "Reference" },
  { key: "action", label: "Action" },
  { key: "actor_name", label: "Actor" },
  { key: "department", label: "Department" },
  { key: "ward", label: "Ward" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "detail", label: "Change detail" },
];

function describe(changes: Record<string, unknown> | null): string {
  if (!changes) return "";
  return Object.entries(changes)
    .map(([k, v]) => {
      const label = k.replace(/_/g, " ");
      if (Array.isArray(v)) return `${label}: ${v[0] ?? "—"} → ${v[1] ?? "—"}`;
      return `${label}: ${String(v ?? "—")}`;
    })
    .join("; ");
}

function AuditLogs() {
  const { staff, loading } = useStaff();
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [entity, setEntity] = useState("all");
  const [dept, setDept] = useState("all");
  const [ward, setWard] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");

  const { data: wards = [] } = useQuery({
    queryKey: ["wards"],
    queryFn: async () =>
      (await supabase.from("wards").select("id, ward_number, name").order("ward_number")).data ??
      [],
  });

  const { data = [], isLoading } = useQuery({
    queryKey: ["audit", from, to],
    enabled: !!staff?.isControlRoom,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("audit_logs")
        .select(
          "id, entity_type, entity_id, entity_ref, action, actor_name, department, ward_id, status, priority, changes, created_at",
        )
        .gte("created_at", `${from}T00:00:00Z`)
        .lte("created_at", `${to}T23:59:59Z`)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw new Error(error.message);
      return rows ?? [];
    },
  });

  const wardName = useMemo(() => {
    const map = new Map(
      wards.map((w) => [w.id, `Ward ${w.ward_number}${w.name ? ` — ${w.name}` : ""}`]),
    );
    return (id: string | null) => (id ? (map.get(id) ?? "—") : "—");
  }, [wards]);

  const departments = useMemo(
    () => Array.from(new Set(data.map((r) => r.department).filter(Boolean) as string[])).sort(),
    [data],
  );
  const statuses = useMemo(
    () => Array.from(new Set(data.map((r) => r.status).filter(Boolean) as string[])).sort(),
    [data],
  );

  const filtered = data.filter((r) => {
    if (entity !== "all" && r.entity_type !== entity) return false;
    if (dept !== "all" && r.department !== dept) return false;
    if (ward !== "all" && r.ward_id !== ward) return false;
    if (status !== "all" && r.status !== status) return false;
    if (
      q &&
      !`${r.entity_ref ?? ""} ${r.actor_name ?? ""} ${describe(r.changes as never)}`
        .toLowerCase()
        .includes(q.toLowerCase())
    )
      return false;
    return true;
  });

  const rows = filtered.map((r) => ({
    created_at: formatDate(r.created_at),
    entity_type: r.entity_type === "job_card" ? "Job card" : "Complaint",
    entity_ref: r.entity_ref ?? "—",
    action: r.action,
    actor_name: r.actor_name ?? "System",
    department: r.department ?? "—",
    ward: wardName(r.ward_id),
    status: r.status ?? "—",
    priority: r.priority ?? "—",
    detail: describe(r.changes as never),
  }));

  const filterChips = [
    { label: "Period", value: `${from} to ${to}` },
    {
      label: "Record type",
      value: entity === "all" ? "All" : entity === "job_card" ? "Job cards" : "Complaints",
    },
    { label: "Department", value: dept === "all" ? "All departments" : dept },
    { label: "Ward", value: ward === "all" ? "All wards" : wardName(ward) },
    { label: "Status", value: status === "all" ? "All statuses" : status },
  ];

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!staff?.isControlRoom) {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <ShieldAlert className="mx-auto h-9 w-9 text-warning-foreground" />
        <h1 className="mt-3 font-display text-lg font-bold">Audit logs are restricted</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Only administrators and switchboard operators may view the audit trail.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-bold text-foreground">
            <ScrollText className="h-7 w-7 text-primary" /> Audit logs
          </h1>
          <p className="text-sm text-muted-foreground">
            Every complaint and job card creation and change, recorded automatically.{" "}
            {filtered.length} of {data.length} entries shown.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportCsv(`ngwathe-audit-${from}_${to}.csv`, columns, rows)}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
          <button
            onClick={() =>
              exportPdf({
                title: "Service Delivery Audit Trail",
                subtitle: "Complaints and job cards — automatic system record",
                filters: filterChips,
                columns,
                rows,
              })
            }
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <FileText className="h-4 w-4" /> PDF report
          </button>
        </div>
      </header>

      <div className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-card sm:grid-cols-3 lg:grid-cols-6">
        <label className="text-xs font-medium text-muted-foreground">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Record
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
          >
            <option value="all">All records</option>
            <option value="complaint">Complaints</option>
            <option value="job_card">Job cards</option>
          </select>
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Department
          <select
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
          >
            <option value="all">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Ward
          <select
            value={ward}
            onChange={(e) => setWard(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
          >
            <option value="all">All wards</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                Ward {w.ward_number}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
          >
            <option value="all">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search reference, actor or change"
          className="rounded-md border border-input bg-background px-3 py-2 text-sm sm:col-span-3 lg:col-span-6"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
        <table className="min-w-full text-sm">
          <thead className="bg-secondary text-xs uppercase text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-3 py-3 text-left">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, i) => (
              <tr key={filtered[i].id} className="hover:bg-accent">
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                  {r.created_at}
                </td>
                <td className="px-3 py-2 text-xs">{r.entity_type}</td>
                <td className="px-3 py-2 font-mono text-xs font-semibold text-primary">
                  {r.entity_ref}
                </td>
                <td className="px-3 py-2 text-xs capitalize">{r.action}</td>
                <td className="px-3 py-2 text-xs">{r.actor_name}</td>
                <td className="px-3 py-2 text-xs">{r.department}</td>
                <td className="px-3 py-2 text-xs">{r.ward}</td>
                <td className="px-3 py-2 text-xs capitalize">{r.status.replace(/_/g, " ")}</td>
                <td className="px-3 py-2 text-xs capitalize">{r.priority}</td>
                <td className="max-w-sm px-3 py-2 text-xs text-muted-foreground">{r.detail}</td>
              </tr>
            ))}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="p-8 text-center text-sm text-muted-foreground"
                >
                  No audit entries match these filters.
                </td>
              </tr>
            )}
            {isLoading && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="p-8 text-center text-sm text-muted-foreground"
                >
                  Loading audit trail…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
