import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyReports } from "@/lib/demo-session";
import { formatDate, statusLabel, statusStyles, timeAgo } from "@/lib/format";
import { duration, jobStatusLabel, jobStatusStyles } from "@/lib/jobs";
import { ClipboardList, HardHat } from "lucide-react";

export const Route = createFileRoute("/app/reports/")({
  component: MyReports,
  errorComponent: ({ error }) => <div className="p-6 text-sm text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-6 text-sm">Not found</div>,
});

function MyReports() {
  const refs = useMyReports();

  const { data, isLoading } = useQuery({
    queryKey: ["app", "my-reports", refs],
    enabled: refs.length > 0,
    queryFn: async () => {
      const { data: complaints } = await supabase
        .from("complaints")
        .select("id, reference, description, status, priority, assigned_department, created_at, resolved_at, categories(name, color)")
        .in("reference", refs)
        .order("created_at", { ascending: false });

      const ids = (complaints ?? []).map((c) => c.id);
      const { data: jobs } = ids.length
        ? await supabase
            .from("job_cards")
            .select("id, job_number, complaint_id, status, department, dispatched_at, completed_at, due_at, personnel:assigned_to(full_name, department)")
            .in("complaint_id", ids)
        : { data: [] };

      return { complaints: complaints ?? [], jobs: jobs ?? [] };
    },
  });

  if (refs.length === 0) {
    return (
      <div className="p-8 text-center">
        <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-3 font-display text-lg font-bold text-foreground">No reports yet</h1>
        <p className="mt-1 text-sm text-muted-foreground">When you report a fault it will appear here with live progress.</p>
        <Link to="/app/report" className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
          Report a fault
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <header>
        <h1 className="font-display text-xl font-bold text-foreground">My reports</h1>
        <p className="text-xs text-muted-foreground">Follow each report from the moment we receive it until the job is finished.</p>
      </header>

      {isLoading && <div className="py-8 text-center text-sm text-muted-foreground">Loading your reports…</div>}

      {data?.complaints.map((c) => {
        const job = data.jobs.find((j) => j.complaint_id === c.id);
        return (
          <article key={c.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-[11px] text-muted-foreground">{c.reference}</div>
                <h2 className="mt-0.5 text-sm font-semibold text-foreground">{c.categories?.name ?? "Service request"}</h2>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyles[c.status]}`}>
                {statusLabel(c.status)}
              </span>
            </div>

            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>

            <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-secondary p-2.5 text-[11px]">
              <div>
                <div className="text-muted-foreground">Reported</div>
                <div className="font-medium text-foreground">{timeAgo(c.created_at)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">{c.resolved_at ? "Total time" : "Open for"}</div>
                <div className="font-medium text-foreground">{duration(c.created_at, c.resolved_at)}</div>
              </div>
            </div>

            {job ? (
              <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                    <HardHat className="h-3.5 w-3.5" /> Job card {job.job_number}
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${jobStatusStyles[job.status]}`}>
                    {jobStatusLabel[job.status]}
                  </span>
                </div>
                <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                  <div>Team: <span className="font-medium text-foreground">{job.personnel?.full_name ?? job.department}</span></div>
                  {job.dispatched_at && <div>Dispatched {formatDate(job.dispatched_at)}</div>}
                  {job.completed_at && <div>Completed {formatDate(job.completed_at)}</div>}
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-lg bg-muted p-2.5 text-[11px] text-muted-foreground">
                Waiting for the switchboard to raise a job card.
              </div>
            )}

            <Link to="/track/$ref" params={{ ref: c.reference }} className="mt-3 block text-center text-xs font-semibold text-primary">
              View full history →
            </Link>
          </article>
        );
      })}
    </div>
  );
}
