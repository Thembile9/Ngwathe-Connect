import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

function isNewKey(v: string) {
  return v.startsWith("sb_publishable_") || v.startsWith("sb_secret_");
}
function serverClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (isNewKey(key) && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const SubmitSchema = z.object({
  category_slug: z.string().optional(),
  subcategory_slug: z.string().optional(),
  ward_number: z.number().int().optional(),
  town_name: z.string().optional(),
  resident_name: z.string().min(1).max(200),
  resident_phone: z.string().min(4).max(30),
  resident_email: z.string().email().optional().or(z.literal("")),
  resident_id_number: z.string().max(30).optional(),
  street_address: z.string().max(300).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().min(4).max(4000),
  photo_urls: z.array(z.string().url()).max(6).optional(),
  channel: z.enum(["web", "whatsapp"]).default("web"),
});

const AnalysisSchema = z.object({
  summary: z.string(),
  priority: z.enum(["critical", "high", "medium", "low"]),
  suggested_department: z.string(),
});

async function analyseWithAI(description: string, categoryName?: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  try {
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");
    const { output } = await generateText({
      model,
      output: Output.object({ schema: AnalysisSchema }),
      prompt: `You are an intake triage assistant for Ngwathe Local Municipality (South Africa).
Analyse this resident complaint and produce:
- summary: one clear sentence, max 25 words.
- priority: critical (life safety, major infrastructure failure), high (major service disruption), medium (localised issue), low (minor/cosmetic).
- suggested_department: one of "Water & Sanitation", "Electrical Services", "Roads & Storm Water", "Waste Management", "Fire & Rescue", "Community Services", "Revenue", "Customer Care".

Category hint: ${categoryName ?? "unknown"}
Complaint: ${description}`,
    });
    return output;
  } catch (e) {
    if (NoObjectGeneratedError.isInstance(e)) return null;
    console.error("AI analysis failed", e);
    return null;
  }
}

export const submitComplaint = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => SubmitSchema.parse(data))
  .handler(async ({ data }) => {
    const supabase = serverClient();

    // Resolve category / subcategory / ward / town ids
    const [catRes, wardRes, townRes] = await Promise.all([
      data.category_slug
        ? supabase.from("categories").select("id, name").eq("slug", data.category_slug).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      data.ward_number
        ? supabase.from("wards").select("id").eq("ward_number", data.ward_number).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      data.town_name
        ? supabase.from("towns").select("id").eq("name", data.town_name).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const category = catRes.data;
    let subcategoryId: string | null = null;
    if (category && data.subcategory_slug) {
      const { data: sub } = await supabase
        .from("subcategories")
        .select("id, default_priority")
        .eq("category_id", category.id)
        .eq("slug", data.subcategory_slug)
        .maybeSingle();
      subcategoryId = sub?.id ?? null;
    }

    const ai = await analyseWithAI(data.description, category?.name);

    const priority = ai?.priority ?? "medium";
    const insert = {
      category_id: category?.id ?? null,
      subcategory_id: subcategoryId,
      ward_id: wardRes.data?.id ?? null,
      town_id: townRes.data?.id ?? null,
      resident_name: data.resident_name,
      resident_phone: data.resident_phone,
      resident_email: data.resident_email || null,
      resident_id_number: data.resident_id_number || null,
      street_address: data.street_address || null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      description: data.description,
      ai_summary: ai?.summary ?? null,
      ai_categorization: ai ? JSON.parse(JSON.stringify(ai)) : null,
      priority,
      status: "new" as const,
      assigned_department: ai?.suggested_department ?? null,
      photo_urls: data.photo_urls ?? [],
      channel: data.channel,
    };

    const { data: created, error } = await supabase
      .from("complaints")
      .insert(insert)
      .select("id, reference, priority, assigned_department, ai_summary")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("complaint_events").insert({
      complaint_id: created.id,
      event_type: "created",
      actor: "Resident",
      message: "Complaint submitted",
    });

    return created;
  });

export const trackComplaint = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ reference: z.string().min(4).max(40) }).parse(data))
  .handler(async ({ data }) => {
    // Complaints are not anon-readable; a narrow lookup keyed on the issued reference.
    const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");
    const { data: c } = await supabase
      .from("complaints")
      .select(
        "id, reference, description, ai_summary, priority, status, assigned_department, assigned_official, resident_name, street_address, created_at, updated_at, resolved_at, categories(name, department, color, icon), subcategories(name), wards(ward_number, name), towns(name)"
      )
      .eq("reference", data.reference.toUpperCase().trim())
      .maybeSingle();
    if (!c) return null;
    const { data: events } = await supabase
      .from("complaint_events")
      .select("id, event_type, actor, message, created_at")
      .eq("complaint_id", c.id)
      .order("created_at", { ascending: true });
    return { ...c, events: events ?? [] };
  });

export const updateComplaintStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "acknowledged", "assigned", "in_progress", "on_hold", "resolved", "closed"]),
        note: z.string().max(1000).optional(),
        assigned_department: z.string().max(200).optional(),
        assigned_official: z.string().max(200).optional(),
        actor: z.string().max(120).optional(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    const supabase = serverClient();
    const patch: {
      status: typeof data.status;
      assigned_department?: string;
      assigned_official?: string;
      resolved_at?: string;
    } = { status: data.status };
    if (data.assigned_department) patch.assigned_department = data.assigned_department;
    if (data.assigned_official) patch.assigned_official = data.assigned_official;
    if (data.status === "resolved" || data.status === "closed") patch.resolved_at = new Date().toISOString();

    const { error } = await supabase.from("complaints").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabase.from("complaint_events").insert({
      complaint_id: data.id,
      event_type: "status_changed",
      actor: data.actor ?? "Official",
      message: data.note ?? `Status changed to ${data.status}`,
      metadata: { status: data.status },
    });
    return { ok: true };
  });

export const addComplaintNote = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), note: z.string().min(1).max(2000), actor: z.string().max(120).optional() }).parse(data)
  )
  .handler(async ({ data }) => {
    const supabase = serverClient();
    const { error } = await supabase.from("complaint_events").insert({
      complaint_id: data.id,
      event_type: "note",
      actor: data.actor ?? "Official",
      message: data.note,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
