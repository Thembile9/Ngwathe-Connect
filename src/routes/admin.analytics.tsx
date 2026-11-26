import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";

const analyticsQuery = {
  queryKey: ["admin", "analytics"],
  queryFn: async () => {
    const { data } = await supabase
      .from("complaints")
      .select("id, priority, status, created_at, resolved_at, assigned_department, categories(name, color), wards(ward_number)")
      .limit(2000);
    return data ?? [];
  },
};

export const Route = createFileRoute("/admin/analytics")({
  loader: ({ context }) => context.queryClient.ensureQueryData(analyticsQuery),
  component: AnalyticsPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function AnalyticsPage() {
  const { data } = useSuspenseQuery(analyticsQuery);

  const byCategory = Object.entries(
    data.reduce<Record<string, { count: number; color: string }>>((acc, c) => {
      const name = c.categories?.name ?? "Other";
      acc[name] = { count: (acc[name]?.count ?? 0) + 1, color: c.categories?.color ?? "#888" };
      return acc;
    }, {})
  ).map(([name, v]) => ({ name, value: v.count, color: v.color }));

  const byWard = Object.entries(
    data.reduce<Record<string, number>>((acc, c) => {
      if (!c.wards) return acc;
      const k = `W${c.wards.ward_number}`;
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => Number(a.name.slice(1)) - Number(b.name.slice(1)));

  const byPriority = ["critical", "high", "medium", "low"].map((p) => ({
    name: p.charAt(0).toUpperCase() + p.slice(1),
    value: data.filter((c) => c.priority === p).length,
  }));

  const byDept = Object.entries(
    data.reduce<Record<string, { total: number; resolved: number; sumTime: number; resolvedCount: number }>>((acc, c) => {
      const k = c.assigned_department ?? "Unassigned";
      const cur = acc[k] ?? { total: 0, resolved: 0, sumTime: 0, resolvedCount: 0 };
      cur.total += 1;
      if (c.resolved_at) {
        cur.resolved += 1;
        cur.resolvedCount += 1;
        cur.sumTime += new Date(c.resolved_at).getTime() - new Date(c.created_at).getTime();
      }
      acc[k] = cur;
      return acc;
    }, {})
  ).map(([name, v]) => ({
    name,
    total: v.total,
    resolved: v.resolved,
    avg_hrs: v.resolvedCount ? +(v.sumTime / v.resolvedCount / 3_600_000).toFixed(1) : 0,
    resolution_rate: v.total ? Math.round((v.resolved / v.total) * 100) : 0,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Executive reporting on service delivery performance.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Complaints by category">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={100} paddingAngle={2}>
                {byCategory.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Complaints by ward">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byWard}>
              <XAxis dataKey="name" fontSize={10} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="oklch(0.28 0.12 260)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Priority distribution">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byPriority}>
              <XAxis dataKey="name" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="oklch(0.78 0.13 85)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Department performance">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 text-left">Department</th>
                  <th className="py-2 text-right">Total</th>
                  <th className="py-2 text-right">Resolved</th>
                  <th className="py-2 text-right">Avg (hrs)</th>
                  <th className="py-2 text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {byDept.map((d) => (
                  <tr key={d.name}>
                    <td className="py-2 font-medium text-foreground">{d.name}</td>
                    <td className="py-2 text-right">{d.total}</td>
                    <td className="py-2 text-right">{d.resolved}</td>
                    <td className="py-2 text-right">{d.avg_hrs || "—"}</td>
                    <td className="py-2 text-right">
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${d.resolution_rate >= 60 ? "bg-success/15 text-success" : d.resolution_rate >= 30 ? "bg-warning/20 text-warning-foreground" : "bg-destructive/15 text-destructive"}`}>
                        {d.resolution_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}
