import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { priorityStyles, statusLabel, statusStyles } from "@/lib/format";
import { TimeAgo } from "@/components/TimeAgo";
import { AlertTriangle, CheckCircle2, ListChecks, Clock, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line, CartesianGrid } from "recharts";

const overviewQuery = {
  queryKey: ["admin", "overview"],
  queryFn: async () => {
    const [all, categories] = await Promise.all([
      supabase.from("complaints").select("id, status, priority, assigned_department, created_at, resolved_at, reference, description, categories(name, color), wards(ward_number)").order("created_at", { ascending: false }),
      supabase.from("categories").select("slug, name, color, department"),
    ]);
    return { complaints: all.data ?? [], categories: categories.data ?? [] };
  },
};

export const Route = createFileRoute("/admin/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(overviewQuery),
  component: AdminOverview,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function AdminOverview() {
  const { data } = useSuspenseQuery(overviewQuery);
  const total = data.complaints.length;
  const open = data.complaints.filter((c) => !["resolved", "closed"].includes(c.status)).length;
  const closed = data.complaints.filter((c) => ["resolved", "closed"].includes(c.status)).length;
  const critical = data.complaints.filter((c) => c.priority === "critical" && !["resolved", "closed"].includes(c.status)).length;

  const resolvedWithTime = data.complaints.filter((c) => c.resolved_at);
  const avgResolutionHrs =
    resolvedWithTime.length === 0
      ? 0
      : resolvedWithTime.reduce((sum, c) => sum + (new Date(c.resolved_at!).getTime() - new Date(c.created_at).getTime()), 0) /
        resolvedWithTime.length /
        3_600_000;

  // Complaints by department (name)
  const byDept = Object.entries(
    data.complaints.reduce<Record<string, number>>((acc, c) => {
      const d = c.assigned_department ?? "Unassigned";
      acc[d] = (acc[d] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Complaints by day (last 14 days)
  const byDay = (() => {
    const map = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    data.complaints.forEach((c) => {
      const k = c.created_at.slice(0, 10);
      if (map.has(k)) map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([date, value]) => ({ date: date.slice(5), value }));
  })();

  const recent = data.complaints.slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground">Real-time view of service delivery across Ngwathe.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total complaints" value={total} icon={ListChecks} tone="primary" />
        <StatCard label="Open cases" value={open} icon={Clock} tone="warning" />
        <StatCard label="Critical open" value={critical} icon={AlertTriangle} tone="destructive" />
        <StatCard label="Resolved" value={closed} icon={CheckCircle2} tone="success" sub={`Avg ${avgResolutionHrs.toFixed(1)}h`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Complaints trend — last 14 days" icon={TrendingUp} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.015 240)" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="value" stroke="oklch(0.28 0.12 260)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="By department">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byDept} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" fontSize={11} allowDecimals={false} />
              <YAxis dataKey="name" type="category" fontSize={11} width={130} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="oklch(0.78 0.13 85)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <section className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-semibold text-foreground">Recent complaints</h2>
          <Link to="/admin/complaints" className="text-sm font-medium text-primary hover:underline">View all →</Link>
        </div>
        <div className="divide-y divide-border">
          {recent.map((c) => (
            <Link key={c.id} to="/admin/complaints/$id" params={{ id: c.id }} className="flex items-start justify-between gap-4 p-4 hover:bg-accent">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{c.reference}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${priorityStyles[c.priority]}`}>{c.priority}</span>
                </div>
                <div className="mt-1 text-sm font-medium text-foreground">
                  {c.categories?.name ?? "Complaint"} {c.wards ? `· Ward ${c.wards.ward_number}` : ""}
                </div>
                <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{c.description}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyles[c.status]}`}>{statusLabel(c.status)}</span>
                <span className="text-[10px] text-muted-foreground">{<TimeAgo value={c.created_at} />}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, tone, sub,
}: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; tone: "primary" | "warning" | "destructive" | "success"; sub?: string }) {
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/20 text-warning-foreground",
    destructive: "bg-destructive/15 text-destructive",
    success: "bg-success/15 text-success",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
        <div className={`grid h-9 w-9 place-items-center rounded-lg ${toneMap[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-3xl font-bold text-foreground">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children, icon: Icon, className = "" }: { title: string; children: React.ReactNode; icon?: React.ComponentType<{ className?: string }>; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 shadow-card ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}
