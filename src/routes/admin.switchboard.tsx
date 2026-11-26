import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { priorityStyles, statusLabel, statusStyles, formatDate } from "@/lib/format";
import { TimeAgo } from "@/components/TimeAgo";
import { defaultDueAt, duration, jobStatusLabel, jobStatusStyles, logJobEvent } from "@/lib/jobs";
import { useStaff as useVerifiedStaff } from "@/lib/auth";
import { Headset, Send, Inbox, HardHat, X } from "lucide-react";

const switchboardQuery = {
  queryKey: ["admin", "switchboard"],
  queryFn: async () => {
    const [complaints, jobs, personnel] = await Promise.all([
      supabase
        .from("complaints")
        .select("id, reference, description, ai_summary, priority, status, assigned_department, resident_name, resident_phone, street_address, latitude, longitude, ward_id, town_id, created_at, categories(name, color, department), wards(ward_number), towns(name)")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("job_cards").select("id, job_number, complaint_id, status, department, assigned_to, dispatched_at, created_at, personnel:assigned_to(full_name)").order("created_at", { ascending: false }).limit(200),
      supabase.from("personnel").select("id, full_name, department, role, active").eq("active", true).order("full_name"),
    ]);
    return { complaints: complaints.data ?? [], jobs: jobs.data ?? [], personnel: personnel.data ?? [] };
  },
};

export const Route = createFileRoute("/admin/switchboard")({
  loader: ({ context }) => context.queryClient.ensureQueryData(switchboardQuery),
  component: Switchboard,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

type Complaint = Awaited<ReturnType<typeof switchboardQuery.queryFn>>["complaints"][number];

function Switchboard() {
  const { data } = useSuspenseQuery(switchboardQuery);
  const [dispatching, setDispatching] = useState<Complaint | null>(null);

  const jobByComplaint = useMemo(() => {
    const m = new Map<string, (typeof data.jobs)[number]>();
    data.jobs.forEach((j) => j.complaint_id && m.set(j.complaint_id, j));
    return m;
  }, [data.jobs]);

  const pending = data.complaints.filter((c) => !jobByComplaint.has(c.id));
  const dispatched = data.complaints.filter((c) => jobByComplaint.has(c.id));

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-3xl font-bold text-foreground">
            <Headset className="h-7 w-7 text-primary" /> Switchboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Every complaint that reaches the municipality lands here. Raise a job card and send it to the responsible team.
          </p>
        </div>
        <div className="flex gap-3">
          <Metric label="Awaiting dispatch" value={pending.length} tone="warning" />
          <Metric label="Job cards raised" value={data.jobs.length} tone="primary" />
        </div>
      </header>

      <section className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <Inbox className="h-4 w-4 text-warning-foreground" />
          <h2 className="font-semibold text-foreground">Awaiting dispatch</h2>
          <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs font-semibold text-warning-foreground">{pending.length}</span>
        </div>
        <div className="divide-y divide-border">
          {pending.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Every complaint has a job card. Well done.</p>}
          {pending.map((c) => (
            <div key={c.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{c.reference}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${priorityStyles[c.priority]}`}>{c.priority}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyles[c.status]}`}>{statusLabel(c.status)}</span>
                  <span className="text-[11px] text-muted-foreground">waiting {duration(c.created_at)}</span>
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {c.categories?.name ?? "Service request"}
                  {c.wards ? ` · Ward ${c.wards.ward_number}` : ""}
                  {c.towns ? ` · ${c.towns.name}` : ""}
                </div>
                <p className="mt-0.5 line-clamp-2 max-w-3xl text-xs text-muted-foreground">{c.ai_summary ?? c.description}</p>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {c.resident_name} · {c.resident_phone}{c.street_address ? ` · ${c.street_address}` : ""}
                </div>
              </div>
              <button
                onClick={() => setDispatching(c)}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <Send className="h-4 w-4" /> Raise job card
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-center gap-2 border-b border-border p-4">
          <HardHat className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-foreground">Dispatched</h2>
        </div>
        <div className="divide-y divide-border">
          {dispatched.slice(0, 15).map((c) => {
            const job = jobByComplaint.get(c.id)!;
            return (
              <Link key={c.id} to="/admin/jobs/$id" params={{ id: job.id }} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-accent">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-primary">{job.job_number}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{c.reference}</span>
                  </div>
                  <div className="mt-0.5 text-sm font-medium text-foreground">{c.categories?.name} · {job.department}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {job.personnel?.full_name ?? "Unassigned"} · dispatched {job.dispatched_at ? formatDate(job.dispatched_at) : "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${jobStatusStyles[job.status]}`}>{jobStatusLabel[job.status]}</span>
                  <span className="text-[11px] text-muted-foreground">{<TimeAgo value={job.created_at} />}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {dispatching && <DispatchDialog complaint={dispatching} personnel={data.personnel} onClose={() => setDispatching(null)} />}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "primary" | "warning" }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-2 text-center shadow-card">
      <div className={`text-2xl font-bold ${tone === "warning" ? "text-warning-foreground" : "text-primary"}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function DispatchDialog({
  complaint,
  personnel,
  onClose,
}: {
  complaint: Complaint;
  personnel: { id: string; full_name: string; department: string; role: string }[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { staff: verifiedStaff } = useVerifiedStaff();
  const user = { name: verifiedStaff?.fullName ?? "Municipal staff" };
  const departments = useMemo(
    () => Array.from(new Set(personnel.map((p) => p.department))).sort(),
    [personnel],
  );

  const [department, setDepartment] = useState(
    departments.find((d) => d === complaint.assigned_department) ?? complaint.categories?.department ?? departments[0] ?? "",
  );
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState(complaint.priority);
  const [title, setTitle] = useState(`${complaint.categories?.name ?? "Service fault"} — ${complaint.street_address ?? complaint.towns?.name ?? "Ngwathe"}`);
  const [work, setWork] = useState(complaint.ai_summary ?? complaint.description);
  const [dueAt, setDueAt] = useState(() => defaultDueAt(complaint.priority).slice(0, 16));
  const [busy, setBusy] = useState(false);

  const options = personnel.filter((p) => p.department === department);

  async function dispatch(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const { data: job, error } = await supabase
        .from("job_cards")
        .insert({
          complaint_id: complaint.id,
          department,
          assigned_to: assignedTo || null,
          dispatched_by: user.name,
          priority,
          status: assignedTo ? "assigned" : "registered",
          title: title.trim(),
          work_description: work.trim(),
          location_text: complaint.street_address ?? complaint.towns?.name ?? null,
          latitude: complaint.latitude,
          longitude: complaint.longitude,
          ward_id: complaint.ward_id,
          town_id: complaint.town_id,
          resident_name: complaint.resident_name,
          resident_phone: complaint.resident_phone,
          complaint_received_at: complaint.created_at,
          dispatched_at: now,
          due_at: new Date(dueAt).toISOString(),
        })
        .select("id, job_number")
        .single();
      if (error) throw new Error(error.message);

      await logJobEvent(
        job.id,
        "created",
        user.name,
        assignedTo
          ? `Job card raised and assigned to ${options.find((p) => p.id === assignedTo)?.full_name}`
          : "Job card raised, awaiting assignment",
      );

      await supabase
        .from("complaints")
        .update({
          status: assignedTo ? "assigned" : "acknowledged",
          assigned_department: department,
          assigned_official: options.find((p) => p.id === assignedTo)?.full_name ?? null,
        })
        .eq("id", complaint.id);

      await supabase.from("complaint_events").insert({
        complaint_id: complaint.id,
        event_type: "assigned",
        actor: user.name,
        message: `Job card ${job.job_number} raised for ${department}`,
      });

      toast.success(`Job card ${job.job_number} created`);
      qc.invalidateQueries();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not raise the job card");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      <form onSubmit={dispatch} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-card-lg">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Raise job card</h2>
            <p className="text-xs text-muted-foreground">From complaint {complaint.reference}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3">
          <L label="Job title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className={inp} />
          </L>
          <L label="Work to be done">
            <textarea value={work} onChange={(e) => setWork(e.target.value)} required rows={3} className={inp} />
          </L>
          <div className="grid grid-cols-2 gap-3">
            <L label="Department">
              <select value={department} onChange={(e) => { setDepartment(e.target.value); setAssignedTo(""); }} className={inp}>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </L>
            <L label="Assign to">
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={inp}>
                <option value="">Leave for supervisor</option>
                {options.map((p) => <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>)}
              </select>
            </L>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <L label="Priority">
              <select value={priority} onChange={(e) => { const p = e.target.value as typeof priority; setPriority(p); setDueAt(defaultDueAt(p).slice(0, 16)); }} className={inp}>
                {["critical", "high", "medium", "low"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </L>
            <L label="Target completion">
              <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} required className={inp} />
            </L>
          </div>

          <div className="rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
            <div><strong className="text-foreground">Resident:</strong> {complaint.resident_name} · {complaint.resident_phone}</div>
            <div><strong className="text-foreground">Location:</strong> {complaint.street_address ?? "—"} {complaint.wards ? `· Ward ${complaint.wards.ward_number}` : ""}</div>
            <div><strong className="text-foreground">Received:</strong> {formatDate(complaint.created_at)} ({duration(complaint.created_at)} ago)</div>
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground">Cancel</button>
          <button disabled={busy} className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {busy ? "Dispatching…" : "Dispatch job card"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inp = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}
