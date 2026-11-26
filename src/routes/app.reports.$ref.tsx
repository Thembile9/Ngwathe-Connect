import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { residentReport } from "@/lib/resident.functions";
import { formatDate, statusLabel, statusStyles, priorityStyles } from "@/lib/format";
import { duration, jobStatusFlow, jobStatusLabel, jobStatusStyles, slaHours } from "@/lib/jobs";
import { ArrowLeft, CheckCircle2, Circle, Clock, HardHat, ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/app/reports/$ref")({
  component: ReportDetail,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">
      {error instanceof Error ? error.message : String(error)}
    </div>
  ),
  notFoundComponent: () => <div className="p-6 text-sm">Report not found.</div>,
});

function ReportDetail() {
  const { ref } = Route.useParams();
  const fetchReport = useServerFn(residentReport);
  const { data, isLoading } = useQuery({
    queryKey: ["app", "report", ref],
    queryFn: () => fetchReport({ data: { reference: ref } }),
  });

  if (isLoading)
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">Loading your report…</div>
    );
  if (!data) {
    return (
      <div className="p-8 text-center">
        <h1 className="font-display text-lg font-bold">We couldn't find {ref}</h1>
        <Link to="/app/reports" className="mt-3 inline-block text-sm font-semibold text-primary">
          ← Back to my reports
        </Link>
      </div>
    );
  }

  const { complaint: c, events, jobs, jobEvents } = data;

  return (
    <div className="space-y-3 p-4">
      <Link
        to="/app/reports"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> My reports
      </Link>

      <section className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[11px] text-muted-foreground">{c.reference}</div>
            <h1 className="font-display text-lg font-bold text-foreground">
              {c.categories?.name ?? "Service request"}
            </h1>
            <div className="text-[11px] text-muted-foreground">
              Logged {formatDate(c.created_at)}
              {c.wards ? ` · Ward ${c.wards.ward_number}` : ""}
              {c.towns ? ` · ${c.towns.name}` : ""}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${priorityStyles[c.priority]}`}
            >
              {c.priority}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyles[c.status]}`}
            >
              {statusLabel(c.status)}
            </span>
          </div>
        </div>
        <p className="mt-3 text-xs text-foreground">{c.description}</p>
        {c.assigned_department && (
          <div className="mt-3 rounded-lg bg-secondary p-2.5 text-[11px]">
            Handled by{" "}
            <span className="font-semibold text-foreground">{c.assigned_department}</span>
          </div>
        )}
      </section>

      {jobs.length === 0 && (
        <section className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center text-xs text-muted-foreground">
          The switchboard has received your report and will raise a job card for the responsible
          department.
        </section>
      )}

      {jobs.map((job) => {
        const target = slaHours[job.priority] ?? 72;
        const startedAt = job.complaint_received_at ?? job.created_at;
        const endMs = job.completed_at ? new Date(job.completed_at).getTime() : Date.now();
        const elapsedH = (endMs - new Date(startedAt).getTime()) / 3_600_000;
        const pct = Math.min(100, Math.round((elapsedH / target) * 100));
        const late = elapsedH > target;
        const currentIdx = jobStatusFlow.indexOf(job.status as (typeof jobStatusFlow)[number]);
        const evs = jobEvents.filter((e) => e.job_card_id === job.id);

        return (
          <section key={job.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <HardHat className="h-4 w-4" /> Job card {job.job_number}
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${jobStatusStyles[job.status]}`}
              >
                {jobStatusLabel[job.status]}
              </span>
            </div>

            <div className="mt-1 text-[11px] text-muted-foreground">
              {job.department}
              {job.personnel?.full_name ? ` · ${job.personnel.full_name}` : ""}
              {job.location_text ? ` · ${job.location_text}` : ""}
            </div>

            {/* Status flow */}
            <ol className="mt-3 space-y-2">
              {jobStatusFlow.map((s, i) => {
                const done = currentIdx >= 0 && i <= currentIdx;
                return (
                  <li key={s} className="flex items-center gap-2 text-[11px]">
                    {done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />
                    )}
                    <span
                      className={done ? "font-medium text-foreground" : "text-muted-foreground"}
                    >
                      {jobStatusLabel[s]}
                    </span>
                  </li>
                );
              })}
            </ol>

            {/* SLA progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">
                  {job.completed_at ? "Completed in" : "Elapsed"}{" "}
                  {duration(startedAt, job.completed_at)}
                </span>
                <span
                  className={late ? "font-semibold text-destructive" : "font-semibold text-success"}
                >
                  {target}h {job.priority} target{late ? " · exceeded" : ""}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${late ? "bg-destructive" : "bg-success"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {(job.completion_notes || job.outcome) && (
              <div className="mt-4 rounded-lg border border-success/30 bg-success/10 p-3">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-success">
                  <ClipboardCheck className="h-3.5 w-3.5" /> Resolution notes
                </div>
                {job.outcome && (
                  <div className="mt-1 text-[11px] font-medium text-foreground">
                    Outcome: {job.outcome}
                  </div>
                )}
                {job.completion_notes && (
                  <p className="mt-1 text-[11px] text-foreground">{job.completion_notes}</p>
                )}
                {job.completed_at && (
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    Completed {formatDate(job.completed_at)}
                  </div>
                )}
              </div>
            )}

            {evs.length > 0 && (
              <div className="mt-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Work timeline
                </div>
                <ol className="mt-2 space-y-2">
                  {evs.map((e) => (
                    <li key={e.id} className="flex gap-2">
                      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <div>
                        <div className="text-[11px] font-medium text-foreground">{e.message}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatDate(e.created_at)} · {e.actor ?? "Municipality"}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        );
      })}

      <section className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Report history
        </div>
        <ol className="mt-2 space-y-2">
          {events.map((e) => (
            <li key={e.id} className="flex gap-2">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <div>
                <div className="text-[11px] font-medium text-foreground">{e.message}</div>
                <div className="text-[10px] text-muted-foreground">
                  {formatDate(e.created_at)} · {e.actor ?? "System"}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
