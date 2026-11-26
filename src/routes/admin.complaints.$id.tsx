import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { addComplaintNote, updateComplaintStatus } from "@/lib/complaints.functions";
import { formatDate, priorityStyles, statusLabel, statusStyles } from "@/lib/format";
import { ArrowLeft, User, Phone, MapPin, Building2 } from "lucide-react";
import { toast } from "sonner";

const detailQuery = (id: string) =>
  queryOptions({
    queryKey: ["admin", "complaint", id],
    queryFn: async () => {
      const [c, ev] = await Promise.all([
        supabase.from("complaints").select("*, categories(name, department, color), subcategories(name), wards(ward_number, name), towns(name)").eq("id", id).maybeSingle(),
        supabase.from("complaint_events").select("*").eq("complaint_id", id).order("created_at", { ascending: true }),
      ]);
      return { complaint: c.data, events: ev.data ?? [] };
    },
  });

export const Route = createFileRoute("/admin/complaints/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(detailQuery(params.id)),
  component: ComplaintDetail,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error instanceof Error ? error.message : String(error)}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

const STATUSES = ["new", "acknowledged", "assigned", "in_progress", "on_hold", "resolved", "closed"] as const;

function ComplaintDetail() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(detailQuery(id));
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const c = data.complaint;
  if (!c) return <div className="p-8">Complaint not found.</div>;

  async function setStatus(status: (typeof STATUSES)[number]) {
    setSaving(true);
    try {
      await updateComplaintStatus({ data: { id, status } });
      toast.success(`Status updated to ${statusLabel(status)}`);
      await qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function saveNote() {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await addComplaintNote({ data: { id, note: note.trim() } });
      setNote("");
      toast.success("Note added");
      await qc.invalidateQueries({ queryKey: ["admin", "complaint", id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Link to="/admin/complaints" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to complaints
      </Link>

      <header className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{c.reference}</div>
            <h1 className="mt-1 font-display text-2xl font-bold text-foreground">{c.categories?.name}{c.subcategories?.name ? ` — ${c.subcategories.name}` : ""}</h1>
            <div className="mt-1 text-sm text-muted-foreground">Logged {formatDate(c.created_at)}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${priorityStyles[c.priority]}`}>{c.priority}</span>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[c.status]}`}>{statusLabel(c.status)}</span>
          </div>
        </div>

        {c.ai_summary && (
          <div className="mt-6 rounded-lg border border-gold/40 bg-gold/10 p-4">
            <div className="text-xs font-semibold uppercase text-gold-foreground/80">AI Summary</div>
            <div className="mt-1 text-sm text-foreground">{c.ai_summary}</div>
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Info icon={User} label="Reported by" value={c.resident_name} sub={c.resident_id_number ?? undefined} />
          <Info icon={Phone} label="Contact" value={c.resident_phone} sub={c.resident_email ?? undefined} />
          <Info icon={MapPin} label="Location" value={c.street_address ?? "—"} sub={c.towns?.name ?? undefined} />
          <Info icon={Building2} label="Ward / Department" value={c.wards ? `Ward ${c.wards.ward_number}` : "—"} sub={c.assigned_department ?? "Awaiting assignment"} />
        </div>

        <div className="mt-6">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Description</div>
          <p className="mt-1 whitespace-pre-line text-sm text-foreground">{c.description}</p>
        </div>
      </header>

      <section className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="mb-3 font-semibold text-foreground">Update status</h2>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              disabled={saving || c.status === s}
              onClick={() => setStatus(s)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                c.status === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-accent"
              } disabled:opacity-50`}
            >
              {statusLabel(s)}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="mb-4 font-semibold text-foreground">Case timeline</h2>
        <ol className="space-y-3 border-l-2 border-border pl-4">
          {data.events.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
              <div className="text-sm font-medium text-foreground">{e.message}</div>
              <div className="text-xs text-muted-foreground">{formatDate(e.created_at)} · {e.actor ?? "System"}</div>
            </li>
          ))}
        </ol>
        <div className="mt-6 border-t border-border pt-4">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Add an internal note</label>
          <div className="mt-2 flex gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Team dispatched, ETA 2 hours" className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <button disabled={saving || !note.trim()} onClick={saveNote} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Add note</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Info({ icon: Icon, label, value, sub }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
      <div>
        <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
        <div className="text-sm font-medium text-foreground">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
}
