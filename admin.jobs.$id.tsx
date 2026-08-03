import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { priorityStyles, formatDate } from "@/lib/format";
import { duration, jobStatusFlow, jobStatusLabel, jobStatusStyles, setJobStatus, slaState, type JobStatus } from "@/lib/jobs";
import { useDemoUser } from "@/lib/demo-session";
import { ArrowLeft, Clock, MapPin, Phone, User, CheckCircle2, XCircle } from "lucide-react";

const jobQuery = (id: string) => ({
  queryKey: ["admin", "job", id],
  queryFn: async () => {
    const { data: job } = await supabase
      .from("job_cards")
      .select("*, personnel:assigned_to(id, full_name, phone, department, role), complaints(reference, description, status), wards(ward_number, name), towns(name)")
      .eq("id", id)
      .maybeSingle();
    const { data: events } = await supabase
      .from("job_card_events")
      .select("id, event_type, actor, message, created_at")
      .eq("job_card_id", id)
      .order("created_at", { ascending: true });
    const { data: personnel } = await supabase.from("personnel").select("id, full_name, department, role").eq("active", true).order("full_name");
    return { job, events: events ?? [], personnel: personnel ?? [] };
  },
});

export const Route = createFileRoute("/admin/jobs/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(jobQuery(params.id)),
  component: JobDetail,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Job card not found</div>,
});

function JobDetail() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(jobQuery(id));
  const qc = useQueryClient();
  const router = useRouter();
  const [user] = useDemoUser();
  const [notes, setNotes] = useState("");
  const [materials, setMaterials] = useState("");
  const [busy, setBusy] = useState(false);

  const job = data.job;
  if (!job) return <div className="p-8 text-muted-foreground">Job card not found.</div>;

  const sla = slaState(job);
  const stageIndex = jobStatusFlow.indexOf(job.status as JobStatus);

  async function advance(status: JobStatus, extra?: Parameters<typeof setJobStatus>[3]) {
    setBusy(true);
    try {
      await setJobStatus({ id: job!.id, complaint_id: job!.complaint_id }, status, user.name, extra);
      toast.success(`Job marked ${jobStatusLabel[status].toLowerCase()}`);
      await qc.invalidateQueries();
      router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function reassign(personnelId: string) {
    const person = data.personnel.find((p) => p.id === personnelId);
    await supabase.from("job_cards").update({ assigned_to: personnelId || null, status: personnelId ? "assigned" : "registered" }).eq("id", job!.id);
    await supabase.from("job_card_events").insert({
      job_card_id: job!.id,
      event_type: "assigned",
      actor: user.name,
      message: person ? `Assigned to ${person.full_name} (${person.department})` : "Assignment cleared",
    });
    toast.success(person ? `Assigned to ${person.full_name}` : "Assignment cleared");
    await qc.invalidateQueries();
    router.invalidate();
  }

  const timeline = [
    { label: "Complaint received", at: job.complaint_received_at ?? job.created_at },
    { label: "Job card dispatched", at: job.dispatched_at },
    { label: "Accepted by worker", at: job.accepted_at },
    { label: "Work started", at: job.started_at },
    { label: "Target completion", at: job.due_at },
    { label: job.status === "not_completed" ? "Closed — not completed" : "Completed", at: job.completed_at },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <Link to="/admin/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to job register
      </Link>

      <header className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-foreground">{job.job_number}</h1>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${jobStatusStyles[job.status]}`}>{jobStatusLabel[job.status]}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${priorityStyles[job.priority]}`}>{job.priority}</span>
            </div>
            <p className="mt-1 text-base font-medium text-foreground">{job.title}</p>
            <p className="text-sm text-muted-foreground">{job.department}</p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Elapsed since complaint</div>
            <div className="text-2xl font-bold text-foreground">{duration(job.complaint_received_at ?? job.created_at, job.completed_at)}</div>
            <div className={`text-xs font-semibold ${sla.tone === "destructive" ? "text-destructive" : sla.tone === "warning" ? "text-warning-foreground" : sla.tone === "success" ? "text-success" : "text-muted-foreground"}`}>
              {sla.label}
            </div>
          </div>
        </div>

        {/* Progress rail */}
        <ol className="mt-5 grid gap-1 sm:grid-cols-6">
          {jobStatusFlow.map((s, i) => (
            <li key={s} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= stageIndex && stageIndex >= 0 ? "bg-primary" : "bg-muted"}`} />
              <div className={`mt-1.5 text-[10px] font-medium ${i <= stageIndex && stageIndex >= 0 ? "text-primary" : "text-muted-foreground"}`}>{jobStatusLabel[s]}</div>
            </li>
          ))}
        </ol>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <Card title="Work to be done">
            <p className="whitespace-pre-wrap text-sm text-foreground">{job.work_description}</p>
            {job.complaints && (
              <Link to="/track/$ref" params={{ ref: job.complaints.reference }} className="mt-3 inline-block font-mono text-xs text-primary hover:underline">
                Complaint {job.complaints.reference} →
              </Link>
            )}
          </Card>

          <Card title="Update this job card">
            {job.status !== "completed" && job.status !== "not_completed" ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {(["assigned", "accepted", "en_route", "in_progress"] as JobStatus[]).map((s) => (
                    <button key={s} disabled={busy} onClick={() => advance(s)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-50">
                      Mark {jobStatusLabel[s].toLowerCase()}
                    </button>
                  ))}
                </div>

                <div className="mt-4 space-y-2 rounded-lg border border-border bg-secondary p-3">
                  <div className="text-xs font-semibold text-foreground">Close the job</div>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="What was done on site?" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  <input value={materials} onChange={(e) => setMaterials(e.target.value)} placeholder="Materials used (optional)" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={busy}
                      onClick={() => advance("completed", { completion_notes: notes, materials_used: materials, outcome: "Resolved on site", note: notes || "Work completed" })}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-success px-4 py-2 text-xs font-semibold text-success-foreground disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark completed
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => advance("not_completed", { completion_notes: notes, materials_used: materials, outcome: "Could not complete", note: notes || "Work could not be completed" })}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Not completed
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2 text-sm">
                <div className={`font-semibold ${job.status === "completed" ? "text-success" : "text-destructive"}`}>
                  {job.status === "completed" ? "Job completed" : "Job closed without completion"} · {formatDate(job.completed_at)}
                </div>
                {job.completion_notes && <p className="text-muted-foreground">{job.completion_notes}</p>}
                {job.materials_used && <p className="text-xs text-muted-foreground">Materials: {job.materials_used}</p>}
                <button disabled={busy} onClick={() => advance("in_progress", { note: "Job re-opened" })} className="mt-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold">
                  Re-open job
                </button>
              </div>
            )}
          </Card>

          <Card title="Activity trail">
            <ol className="space-y-3">
              {data.events.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <div className="text-sm text-foreground">{e.message}</div>
                    <div className="text-[11px] text-muted-foreground">{e.actor} · {formatDate(e.created_at)}</div>
                  </div>
                </li>
              ))}
              {data.events.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
            </ol>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Assigned worker">
            {job.personnel ? (
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2 font-semibold text-foreground"><User className="h-4 w-4 text-muted-foreground" />{job.personnel.full_name}</div>
                <div className="text-xs text-muted-foreground">{job.personnel.department} · {job.personnel.role}</div>
                {job.personnel.phone && <a href={`tel:${job.personnel.phone}`} className="flex items-center gap-1.5 text-xs text-primary"><Phone className="h-3 w-3" />{job.personnel.phone}</a>}
              </div>
            ) : (
              <p className="text-sm text-warning-foreground">Not yet assigned to a person.</p>
            )}
            <select
              value={job.assigned_to ?? ""}
              onChange={(e) => reassign(e.target.value)}
              className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Unassigned —</option>
              {data.personnel.map((p) => <option key={p.id} value={p.id}>{p.full_name} · {p.department}</option>)}
            </select>
          </Card>

          <Card title="Resident & location">
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-foreground"><User className="h-4 w-4 text-muted-foreground" />{job.resident_name ?? "—"}</div>
              {job.resident_phone && <a href={`tel:${job.resident_phone}`} className="flex items-center gap-2 text-primary"><Phone className="h-4 w-4" />{job.resident_phone}</a>}
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {job.location_text ?? "No address given"}
                  {job.wards ? ` · Ward ${job.wards.ward_number}` : ""}
                  {job.towns ? ` · ${job.towns.name}` : ""}
                </span>
              </div>
              {job.latitude && job.longitude && (
                <a href={`https://www.google.com/maps?q=${job.latitude},${job.longitude}`} target="_blank" rel="noreferrer" className="block text-xs text-primary hover:underline">
                  Open in maps ({job.latitude.toFixed(4)}, {job.longitude.toFixed(4)})
                </a>
              )}
            </div>
          </Card>

          <Card title="Time record">
            <ol className="space-y-2.5">
              {timeline.map((t) => (
                <li key={t.label} className="flex items-start gap-2.5">
                  <Clock className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${t.at ? "text-primary" : "text-muted-foreground/40"}`} />
                  <div>
                    <div className={`text-xs font-medium ${t.at ? "text-foreground" : "text-muted-foreground"}`}>{t.label}</div>
                    <div className="text-[11px] text-muted-foreground">{t.at ? formatDate(t.at) : "Pending"}</div>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-3 rounded-lg bg-secondary p-2.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Received → dispatched</span><span className="font-semibold text-foreground">{duration(job.complaint_received_at ?? job.created_at, job.dispatched_at)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Dispatched → started</span><span className="font-semibold text-foreground">{duration(job.dispatched_at, job.started_at)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total turnaround</span><span className="font-semibold text-foreground">{duration(job.complaint_received_at ?? job.created_at, job.completed_at)}</span></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
