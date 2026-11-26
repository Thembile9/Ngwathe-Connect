import { supabase } from "@/integrations/supabase/client";

export type JobStatus =
  | "registered"
  | "assigned"
  | "accepted"
  | "en_route"
  | "in_progress"
  | "completed"
  | "not_completed"
  | "cancelled";

export const jobStatusFlow: JobStatus[] = [
  "registered",
  "assigned",
  "accepted",
  "en_route",
  "in_progress",
  "completed",
];

export const jobStatusStyles: Record<string, string> = {
  registered: "bg-muted text-muted-foreground border-border",
  assigned: "bg-primary/10 text-primary border-primary/25",
  accepted: "bg-info/15 text-info border-info/30",
  en_route: "bg-info/20 text-info border-info/40",
  in_progress: "bg-warning/20 text-warning-foreground border-warning/40",
  completed: "bg-success/20 text-success border-success/40",
  not_completed: "bg-destructive/15 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export const jobStatusLabel: Record<string, string> = {
  registered: "Registered",
  assigned: "Assigned",
  accepted: "Accepted",
  en_route: "En route",
  in_progress: "In progress",
  completed: "Completed",
  not_completed: "Not completed",
  cancelled: "Cancelled",
};

/** Human duration between two timestamps, e.g. "2d 4h" or "37m". */
export function duration(from?: string | null, to?: string | null) {
  if (!from) return "—";
  const start = new Date(from).getTime();
  const end = to ? new Date(to).getTime() : Date.now();
  const mins = Math.max(0, Math.round((end - start) / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs < 24) return remMins ? `${hrs}h ${remMins}m` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  const remHrs = hrs % 24;
  return remHrs ? `${days}d ${remHrs}h` : `${days}d`;
}

/** Hours between complaint received and completion — the municipality's core KPI. */
export function turnaroundHours(receivedAt?: string | null, completedAt?: string | null) {
  if (!receivedAt || !completedAt) return null;
  return (new Date(completedAt).getTime() - new Date(receivedAt).getTime()) / 3_600_000;
}

/** SLA target in hours by priority. */
export const slaHours: Record<string, number> = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 168,
};

export function slaState(job: {
  priority: string;
  due_at: string | null;
  completed_at: string | null;
  status: string;
}) {
  if (job.status === "completed") {
    if (!job.due_at || !job.completed_at) return { label: "Done", tone: "success" as const };
    const late = new Date(job.completed_at) > new Date(job.due_at);
    return late
      ? { label: "Closed late", tone: "destructive" as const }
      : { label: "Closed in time", tone: "success" as const };
  }
  if (job.status === "not_completed" || job.status === "cancelled")
    return { label: "—", tone: "muted" as const };
  if (!job.due_at) return { label: "No target", tone: "muted" as const };
  const msLeft = new Date(job.due_at).getTime() - Date.now();
  if (msLeft < 0)
    return { label: `Overdue by ${duration(job.due_at)}`, tone: "destructive" as const };
  if (msLeft < 3_600_000 * 4)
    return {
      label: `Due in ${duration(null, job.due_at) === "—" ? "" : ""}${duration(new Date().toISOString(), job.due_at)}`,
      tone: "warning" as const,
    };
  return {
    label: `Due in ${duration(new Date().toISOString(), job.due_at)}`,
    tone: "muted" as const,
  };
}

export function defaultDueAt(priority: string, from = new Date()) {
  const hours = slaHours[priority] ?? 72;
  return new Date(from.getTime() + hours * 3_600_000).toISOString();
}

export async function logJobEvent(
  jobCardId: string,
  eventType: string,
  actor: string,
  message: string,
) {
  await supabase.from("job_card_events").insert({
    job_card_id: jobCardId,
    event_type: eventType,
    actor,
    message,
  });
}

/** Advance a job card and stamp the matching milestone time. */
export async function setJobStatus(
  job: { id: string; complaint_id: string | null },
  status: JobStatus,
  actor: string,
  extra?: { completion_notes?: string; outcome?: string; materials_used?: string; note?: string },
) {
  const now = new Date().toISOString();
  const patch: {
    status: JobStatus;
    accepted_at?: string;
    started_at?: string;
    completed_at?: string;
    completion_notes?: string;
    outcome?: string;
    materials_used?: string;
  } = { status };
  if (status === "accepted") patch.accepted_at = now;
  if (status === "in_progress") patch.started_at = now;
  if (status === "completed" || status === "not_completed") patch.completed_at = now;
  if (extra?.completion_notes !== undefined) patch.completion_notes = extra.completion_notes;
  if (extra?.outcome !== undefined) patch.outcome = extra.outcome;
  if (extra?.materials_used !== undefined) patch.materials_used = extra.materials_used;

  const { error } = await supabase.from("job_cards").update(patch).eq("id", job.id);
  if (error) throw new Error(error.message);

  await logJobEvent(
    job.id,
    "status_changed",
    actor,
    extra?.note ?? `Job marked ${jobStatusLabel[status]}`,
  );

  // Keep the resident-facing complaint in sync so tracking stays truthful.
  if (job.complaint_id) {
    const complaintStatus =
      status === "completed"
        ? "resolved"
        : status === "in_progress" || status === "en_route"
          ? "in_progress"
          : status === "accepted" || status === "assigned"
            ? "assigned"
            : status === "not_completed"
              ? "on_hold"
              : null;
    if (complaintStatus) {
      await supabase
        .from("complaints")
        .update({
          status: complaintStatus,
          ...(status === "completed" ? { resolved_at: now } : {}),
        })
        .eq("id", job.complaint_id);
      await supabase.from("complaint_events").insert({
        complaint_id: job.complaint_id,
        event_type: "status_changed",
        actor,
        message: `Job card ${jobStatusLabel[status].toLowerCase()}`,
      });
    }
  }
}
