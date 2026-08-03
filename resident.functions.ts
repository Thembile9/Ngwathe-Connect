import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Resident-facing lookups. Complaints are not readable by anonymous clients at
 * database level, so these handlers do a narrow, projected lookup keyed on the
 * reference number the resident was issued.
 */

const SAFE_COMPLAINT =
  "id, reference, description, ai_summary, status, priority, assigned_department, created_at, updated_at, resolved_at, street_address, categories(name, color, icon), wards(ward_number, name), towns(name)";

const SAFE_JOB =
  "id, job_number, complaint_id, status, department, priority, title, work_description, location_text, dispatched_at, accepted_at, started_at, due_at, completed_at, completion_notes, outcome, complaint_received_at, created_at, personnel:assigned_to(full_name, department)";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const listMyReports = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ references: z.array(z.string().min(4).max(40)).max(50) }).parse(d))
  .handler(async ({ data }) => {
    if (!data.references.length) return { complaints: [], jobs: [] };
    const db = await admin();
    const refs = data.references.map((r) => r.toUpperCase().trim());

    const { data: complaints } = await db
      .from("complaints")
      .select(SAFE_COMPLAINT)
      .in("reference", refs)
      .order("created_at", { ascending: false });

    const ids = (complaints ?? []).map((c) => c.id);
    const { data: jobs } = ids.length
      ? await db.from("job_cards").select(SAFE_JOB).in("complaint_id", ids)
      : { data: [] };

    return { complaints: complaints ?? [], jobs: jobs ?? [] };
  });

export const residentReport = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ reference: z.string().min(4).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: complaint } = await db
      .from("complaints")
      .select(SAFE_COMPLAINT)
      .eq("reference", data.reference.toUpperCase().trim())
      .maybeSingle();
    if (!complaint) return null;

    const [{ data: events }, { data: jobs }] = await Promise.all([
      db
        .from("complaint_events")
        .select("id, event_type, actor, message, created_at")
        .eq("complaint_id", complaint.id)
        .order("created_at", { ascending: true }),
      db.from("job_cards").select(SAFE_JOB).eq("complaint_id", complaint.id).order("created_at"),
    ]);

    const jobIds = (jobs ?? []).map((j) => j.id);
    const { data: jobEvents } = jobIds.length
      ? await db
          .from("job_card_events")
          .select("id, job_card_id, event_type, actor, message, created_at")
          .in("job_card_id", jobIds)
          .order("created_at", { ascending: true })
      : { data: [] };

    return {
      complaint,
      events: events ?? [],
      jobs: jobs ?? [],
      jobEvents: jobEvents ?? [],
    };
  });
