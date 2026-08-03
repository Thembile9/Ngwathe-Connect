import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { CheckCircle2, Clock, ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { trackComplaint } from "@/lib/complaints.functions";
import { formatDate, priorityStyles, statusLabel, statusStyles } from "@/lib/format";

const trackQueryOpts = (ref: string) =>
  queryOptions({
    queryKey: ["track", ref],
    queryFn: () => trackComplaint({ data: { reference: ref } }),
  });

export const Route = createFileRoute("/track/$ref")({
  head: ({ params }) => ({
    meta: [
      { title: `Track ${params.ref} — Ngwathe Municipality` },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(trackQueryOpts(params.ref)),
  component: TrackDetail,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Reference not found.</div>,
});

function TrackDetail() {
  const { ref } = Route.useParams();
  const { data: c } = useSuspenseQuery(trackQueryOpts(ref));

  if (!c) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <main className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="text-xl font-semibold">We couldn't find that reference.</h1>
          <p className="mt-2 text-muted-foreground">Check the reference number and try again.</p>
          <Link to="/track" className="mt-4 inline-block text-primary hover:underline">← Try another reference</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link to="/track" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> New search
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{c.reference}</div>
              <h1 className="mt-1 font-display text-2xl font-bold text-foreground">
                {c.categories?.name ?? "Complaint"}
                {c.subcategories?.name ? ` — ${c.subcategories.name}` : ""}
              </h1>
              <div className="mt-1 text-sm text-muted-foreground">
                Logged {formatDate(c.created_at)} · {c.wards ? `Ward ${c.wards.ward_number}` : ""} {c.towns ? `· ${c.towns.name}` : ""}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${priorityStyles[c.priority]}`}>
                {c.priority}
              </span>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[c.status]}`}>
                {statusLabel(c.status)}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Assigned department" value={c.assigned_department ?? "—"} />
            <Field label="Assigned official" value={c.assigned_official ?? "Awaiting assignment"} />
            <Field label="Street address" value={c.street_address ?? "—"} />
            <Field label="Reported by" value={c.resident_name} />
          </div>

          {c.ai_summary && (
            <div className="mt-6 rounded-lg border border-border bg-secondary p-4">
              <div className="text-xs font-semibold uppercase text-muted-foreground">AI Summary</div>
              <div className="mt-1 text-sm text-foreground">{c.ai_summary}</div>
            </div>
          )}

          <div className="mt-6">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Description</div>
            <p className="mt-1 text-sm text-foreground">{c.description}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Progress timeline</h2>
          <ol className="space-y-4">
            {c.events.map((e) => (
              <li key={e.id} className="flex gap-3">
                <div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  {e.event_type === "status_changed" ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{e.message}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(e.created_at)} · {e.actor ?? "System"}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </main>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm text-foreground">{value}</div>
    </div>
  );
}
