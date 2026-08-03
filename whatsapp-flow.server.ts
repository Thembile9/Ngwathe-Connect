// WhatsApp conversation state machine — server-only.
// Guides residents through: menu → category → subcategory → ward → description → location → photos → confirm.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendText, sendList, sendButtons, downloadMedia, logMessage, type ListSection } from "./whatsapp.server";

type SessionRow = {
  id: string;
  phone_number: string;
  wa_id: string | null;
  profile_name: string | null;
  state: string;
  language: string;
  draft: Record<string, unknown>;
};

type Draft = {
  category_slug?: string;
  category_name?: string;
  subcategory_slug?: string;
  subcategory_name?: string;
  ward_number?: number;
  town_name?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  photo_urls?: string[];
  resident_name?: string;
};

const STATES = {
  IDLE: "idle",
  MENU: "menu",
  PICK_CATEGORY: "pick_category",
  PICK_SUBCATEGORY: "pick_subcategory",
  PICK_WARD: "pick_ward",
  ASK_DESCRIPTION: "ask_description",
  ASK_LOCATION: "ask_location",
  ASK_PHOTO: "ask_photo",
  ASK_NAME: "ask_name",
  CONFIRM: "confirm",
  TRACK_REF: "track_ref",
} as const;

async function getSession(phone: string, waId?: string, profileName?: string): Promise<SessionRow> {
  const { data: existing } = await supabaseAdmin
    .from("whatsapp_sessions")
    .select("*")
    .eq("phone_number", phone)
    .maybeSingle();
  if (existing) {
    await supabaseAdmin
      .from("whatsapp_sessions")
      .update({ last_message_at: new Date().toISOString(), wa_id: waId ?? existing.wa_id, profile_name: profileName ?? existing.profile_name })
      .eq("id", existing.id);
    return existing as unknown as SessionRow;
  }
  const { data: created, error } = await supabaseAdmin
    .from("whatsapp_sessions")
    .insert({ phone_number: phone, wa_id: waId ?? null, profile_name: profileName ?? null })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return created as unknown as SessionRow;
}

async function setState(id: string, state: string, draft?: Draft) {
  const patch: { state: string; draft?: Draft } = { state };
  if (draft !== undefined) patch.draft = draft;
  await supabaseAdmin.from("whatsapp_sessions").update(patch as never).eq("id", id);
}

async function reply(session: SessionRow, body: string, kind = "text") {
  const r = await sendText(session.phone_number, body);
  await logMessage({
    sessionId: session.id,
    phoneNumber: session.phone_number,
    direction: "out",
    waMessageId: r.id ?? null,
    messageType: kind,
    payload: { body },
  });
}

async function replyList(session: SessionRow, header: string, body: string, buttonText: string, sections: ListSection[]) {
  const r = await sendList(session.phone_number, header, body, buttonText, sections);
  await logMessage({
    sessionId: session.id,
    phoneNumber: session.phone_number,
    direction: "out",
    waMessageId: r.id ?? null,
    messageType: "interactive_list",
    payload: { header, body, sections },
  });
}

async function replyButtons(session: SessionRow, body: string, buttons: { id: string; title: string }[]) {
  const r = await sendButtons(session.phone_number, body, buttons);
  await logMessage({
    sessionId: session.id,
    phoneNumber: session.phone_number,
    direction: "out",
    waMessageId: r.id ?? null,
    messageType: "interactive_buttons",
    payload: { body, buttons },
  });
}

async function showMainMenu(session: SessionRow) {
  await setState(session.id, STATES.MENU, {});
  await replyButtons(
    session,
    `👋 Welcome to Ngwathe Municipality${session.profile_name ? `, ${session.profile_name.split(" ")[0]}` : ""}!\n\nHow can we help you today?`,
    [
      { id: "menu_report", title: "Report an issue" },
      { id: "menu_track", title: "Track complaint" },
      { id: "menu_help", title: "Contact help" },
    ]
  );
}

async function showCategories(session: SessionRow) {
  const { data: cats } = await supabaseAdmin
    .from("categories")
    .select("slug, name, department")
    .order("sort_order", { ascending: true });
  if (!cats?.length) {
    await reply(session, "Sorry, no service categories are configured yet. Please try again later.");
    return;
  }
  await setState(session.id, STATES.PICK_CATEGORY, session.draft as Draft);
  await replyList(session, "Report an issue", "Which service does your issue relate to?", "Choose service", [
    {
      title: "Municipal services",
      rows: cats.slice(0, 10).map((c) => ({
        id: `cat:${c.slug}`,
        title: c.name.slice(0, 24),
        description: c.department.slice(0, 72),
      })),
    },
  ]);
}

async function showSubcategories(session: SessionRow, categorySlug: string) {
  const { data: cat } = await supabaseAdmin
    .from("categories")
    .select("id, slug, name")
    .eq("slug", categorySlug)
    .maybeSingle();
  if (!cat) return showCategories(session);
  const { data: subs } = await supabaseAdmin
    .from("subcategories")
    .select("slug, name")
    .eq("category_id", cat.id)
    .order("name");
  const draft: Draft = { ...(session.draft as Draft), category_slug: cat.slug, category_name: cat.name };
  if (!subs?.length) {
    await setState(session.id, STATES.PICK_WARD, draft);
    return showWards(session, draft);
  }
  await setState(session.id, STATES.PICK_SUBCATEGORY, draft);
  await replyList(session, cat.name, "What kind of issue is it?", "Choose type", [
    {
      title: cat.name.slice(0, 24),
      rows: subs.slice(0, 10).map((s) => ({ id: `sub:${s.slug}`, title: s.name.slice(0, 24) })),
    },
  ]);
}

async function showWards(session: SessionRow, draft: Draft) {
  const { data: wards } = await supabaseAdmin
    .from("wards")
    .select("ward_number, name")
    .order("ward_number");
  if (!wards?.length) {
    await setState(session.id, STATES.ASK_DESCRIPTION, draft);
    await reply(session, "Please describe the issue in detail (address, when it started, any hazard):");
    return;
  }
  await setState(session.id, STATES.PICK_WARD, draft);
  await replyList(session, "Your ward", "Which ward is the issue in?", "Choose ward", [
    {
      title: "Wards",
      rows: wards.slice(0, 10).map((w) => ({
        id: `ward:${w.ward_number}`,
        title: `Ward ${w.ward_number}`,
        description: w.name?.slice(0, 72),
      })),
    },
  ]);
}

async function askDescription(session: SessionRow, draft: Draft) {
  await setState(session.id, STATES.ASK_DESCRIPTION, draft);
  await reply(session, "📝 Please describe the issue in detail — include street address, when it started, and any safety hazard.");
}

async function askLocation(session: SessionRow, draft: Draft) {
  await setState(session.id, STATES.ASK_LOCATION, draft);
  await replyButtons(
    session,
    "📍 Share your location (tap 📎 → Location) so we can pin the issue on the map — or skip.",
    [{ id: "loc_skip", title: "Skip location" }]
  );
}

async function askPhoto(session: SessionRow, draft: Draft) {
  await setState(session.id, STATES.ASK_PHOTO, draft);
  await replyButtons(
    session,
    "📷 Send a photo of the issue if you can — or skip.",
    [{ id: "photo_done", title: "Done / skip" }]
  );
}

async function askName(session: SessionRow, draft: Draft) {
  await setState(session.id, STATES.ASK_NAME, draft);
  await reply(session, "👤 What is your full name? (used only for this complaint)");
}

async function askConfirm(session: SessionRow, draft: Draft) {
  await setState(session.id, STATES.CONFIRM, draft);
  const summary = [
    `*Please confirm your complaint:*`,
    `• Service: ${draft.category_name ?? "-"}`,
    draft.subcategory_name ? `• Type: ${draft.subcategory_name}` : null,
    draft.ward_number ? `• Ward: ${draft.ward_number}` : null,
    draft.latitude ? `• Location: pinned ✅` : `• Location: not shared`,
    draft.photo_urls?.length ? `• Photos: ${draft.photo_urls.length}` : `• Photos: none`,
    ``,
    `_"${draft.description}"_`,
  ]
    .filter(Boolean)
    .join("\n");
  await replyButtons(session, summary, [
    { id: "confirm_yes", title: "✅ Submit" },
    { id: "confirm_no", title: "❌ Cancel" },
  ]);
}

async function submitComplaintFromDraft(session: SessionRow) {
  const draft = session.draft as Draft;
  // Resolve ids
  const [catRes, wardRes] = await Promise.all([
    draft.category_slug
      ? supabaseAdmin.from("categories").select("id, name").eq("slug", draft.category_slug).maybeSingle()
      : Promise.resolve({ data: null }),
    draft.ward_number
      ? supabaseAdmin.from("wards").select("id").eq("ward_number", draft.ward_number).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  let subcategoryId: string | null = null;
  if (catRes.data && draft.subcategory_slug) {
    const { data: sub } = await supabaseAdmin
      .from("subcategories")
      .select("id")
      .eq("category_id", catRes.data.id)
      .eq("slug", draft.subcategory_slug)
      .maybeSingle();
    subcategoryId = sub?.id ?? null;
  }

  const { data: created, error } = await supabaseAdmin
    .from("complaints")
    .insert({
      category_id: catRes.data?.id ?? null,
      subcategory_id: subcategoryId,
      ward_id: wardRes.data?.id ?? null,
      resident_name: draft.resident_name ?? session.profile_name ?? "WhatsApp user",
      resident_phone: session.phone_number,
      description: draft.description ?? "(no description provided)",
      latitude: draft.latitude ?? null,
      longitude: draft.longitude ?? null,
      photo_urls: draft.photo_urls ?? [],
      channel: "whatsapp",
      wa_phone_number: session.phone_number,
      status: "new",
      priority: "medium",
    })
    .select("id, reference")
    .single();
  if (error || !created) {
    await reply(session, `❌ Sorry, we couldn't save your complaint: ${error?.message ?? "unknown error"}. Please try again.`);
    await setState(session.id, STATES.IDLE, {});
    return;
  }
  await supabaseAdmin.from("complaint_events").insert({
    complaint_id: created.id,
    event_type: "created",
    actor: "Resident (WhatsApp)",
    message: "Complaint submitted via WhatsApp",
  });
  await reply(
    session,
    `✅ *Complaint received!*\n\nReference: *${created.reference}*\n\nWe've logged your report and it will be routed to the responsible department. You can track it any time by replying *TRACK ${created.reference}*.\n\nThank you for helping us serve Ngwathe better. 🇿🇦`
  );
  await setState(session.id, STATES.IDLE, {});
}

async function trackByReference(session: SessionRow, ref: string) {
  const cleaned = ref.toUpperCase().trim();
  const { data: c } = await supabaseAdmin
    .from("complaints")
    .select("reference, status, priority, assigned_department, ai_summary, description, created_at")
    .eq("reference", cleaned)
    .maybeSingle();
  if (!c) {
    await reply(session, `Sorry, we can't find complaint *${cleaned}*. Check the reference and try again.`);
    return;
  }
  const msg = [
    `📋 *${c.reference}*`,
    `Status: *${c.status.replace("_", " ").toUpperCase()}*`,
    `Priority: ${c.priority.toUpperCase()}`,
    c.assigned_department ? `Dept: ${c.assigned_department}` : null,
    ``,
    c.ai_summary ?? c.description,
  ]
    .filter(Boolean)
    .join("\n");
  await reply(session, msg);
}

/**
 * Main handler for a single inbound WhatsApp message.
 * `message` is the raw WhatsApp `messages[0]` object; `contact` is `contacts[0]`.
 */
export async function handleInboundMessage(message: WAMessage, contact?: WAContact) {
  const phone = message.from;
  const session = await getSession(phone, contact?.wa_id, contact?.profile?.name);

  await logMessage({
    sessionId: session.id,
    phoneNumber: phone,
    direction: "in",
    waMessageId: message.id,
    messageType: message.type,
    payload: message as unknown as Record<string, unknown>,
  });

  // Global commands — always allowed
  const text = extractText(message);
  const lower = text?.trim().toLowerCase() ?? "";
  if (lower === "menu" || lower === "hi" || lower === "hello" || lower === "start") {
    return showMainMenu(session);
  }
  if (lower.startsWith("track ")) {
    const ref = text!.trim().split(/\s+/)[1] ?? "";
    return trackByReference(session, ref);
  }

  const interactiveId = extractInteractiveId(message);

  switch (session.state) {
    case STATES.IDLE:
      return showMainMenu(session);

    case STATES.MENU: {
      if (interactiveId === "menu_report") return showCategories(session);
      if (interactiveId === "menu_track") {
        await setState(session.id, STATES.TRACK_REF, {});
        return reply(session, "Please send your complaint reference (e.g. NGW-2026-000123):");
      }
      if (interactiveId === "menu_help") {
        return reply(
          session,
          "📞 *Ngwathe Municipality contact*\n\nCustomer Care: 056 816 2700\nEmergencies: 10111\nEmail: info@ngwathe.gov.za\n\nType *MENU* to start over."
        );
      }
      return showMainMenu(session);
    }

    case STATES.TRACK_REF: {
      if (text) return trackByReference(session, text);
      return reply(session, "Please send the reference number, e.g. NGW-2026-000123.");
    }

    case STATES.PICK_CATEGORY: {
      if (interactiveId?.startsWith("cat:")) {
        return showSubcategories(session, interactiveId.slice(4));
      }
      return showCategories(session);
    }

    case STATES.PICK_SUBCATEGORY: {
      if (interactiveId?.startsWith("sub:")) {
        const { data: sub } = await supabaseAdmin
          .from("subcategories")
          .select("slug, name")
          .eq("slug", interactiveId.slice(4))
          .maybeSingle();
        const draft: Draft = { ...(session.draft as Draft), subcategory_slug: sub?.slug, subcategory_name: sub?.name };
        return showWards(session, draft);
      }
      return showSubcategories(session, (session.draft as Draft).category_slug ?? "");
    }

    case STATES.PICK_WARD: {
      if (interactiveId?.startsWith("ward:")) {
        const n = Number(interactiveId.slice(5));
        const draft: Draft = { ...(session.draft as Draft), ward_number: Number.isFinite(n) ? n : undefined };
        return askDescription(session, draft);
      }
      return showWards(session, session.draft as Draft);
    }

    case STATES.ASK_DESCRIPTION: {
      if (text && text.length >= 4) {
        const draft: Draft = { ...(session.draft as Draft), description: text };
        return askLocation(session, draft);
      }
      return reply(session, "Please type a short description (at least 4 characters).");
    }

    case STATES.ASK_LOCATION: {
      if (message.type === "location" && message.location) {
        const draft: Draft = {
          ...(session.draft as Draft),
          latitude: message.location.latitude,
          longitude: message.location.longitude,
        };
        return askPhoto(session, draft);
      }
      if (interactiveId === "loc_skip") {
        return askPhoto(session, session.draft as Draft);
      }
      return reply(session, "Tap 📎 → Location to share, or press *Skip location*.");
    }

    case STATES.ASK_PHOTO: {
      if (message.type === "image" && message.image?.id) {
        const stored = await savePhoto(message.image.id, phone);
        const draft = session.draft as Draft;
        const photos = [...(draft.photo_urls ?? []), ...(stored ? [stored] : [])];
        const next: Draft = { ...draft, photo_urls: photos };
        await setState(session.id, STATES.ASK_PHOTO, next);
        return replyButtons(session, `Photo received (${photos.length}). Send another, or press Done.`, [
          { id: "photo_done", title: "Done / skip" },
        ]);
      }
      if (interactiveId === "photo_done" || lower === "done" || lower === "skip") {
        return askName(session, session.draft as Draft);
      }
      return reply(session, "Send a photo, or press *Done / skip*.");
    }

    case STATES.ASK_NAME: {
      if (text && text.length >= 2) {
        const draft: Draft = { ...(session.draft as Draft), resident_name: text };
        return askConfirm(session, draft);
      }
      return reply(session, "Please type your full name.");
    }

    case STATES.CONFIRM: {
      if (interactiveId === "confirm_yes" || lower === "yes") {
        return submitComplaintFromDraft(session);
      }
      if (interactiveId === "confirm_no" || lower === "no" || lower === "cancel") {
        await setState(session.id, STATES.IDLE, {});
        return reply(session, "Complaint cancelled. Type *MENU* to start again.");
      }
      return askConfirm(session, session.draft as Draft);
    }

    default:
      return showMainMenu(session);
  }
}

async function savePhoto(mediaId: string, phone: string): Promise<string | null> {
  const media = await downloadMedia(mediaId);
  if (!media) return null;
  const ext = media.mimeType.split("/")[1]?.split(";")[0] ?? "jpg";
  const key = `whatsapp/${phone}/${Date.now()}-${mediaId}.${ext}`;
  // Ensure bucket exists
  await supabaseAdmin.storage.createBucket("complaint-photos", { public: true }).catch(() => {});
  const { error } = await supabaseAdmin.storage
    .from("complaint-photos")
    .upload(key, media.buffer, { contentType: media.mimeType, upsert: false });
  if (error) {
    console.error("photo upload failed", error);
    return null;
  }
  const { data } = supabaseAdmin.storage.from("complaint-photos").getPublicUrl(key);
  return data.publicUrl;
}

function extractText(m: WAMessage): string | null {
  if (m.type === "text" && m.text) return m.text.body;
  if (m.type === "interactive" && m.interactive) {
    if (m.interactive.button_reply) return m.interactive.button_reply.title;
    if (m.interactive.list_reply) return m.interactive.list_reply.title;
  }
  return null;
}

function extractInteractiveId(m: WAMessage): string | null {
  if (m.type !== "interactive" || !m.interactive) return null;
  return m.interactive.button_reply?.id ?? m.interactive.list_reply?.id ?? null;
}

// ---- Types ----
export type WAContact = { wa_id: string; profile?: { name?: string } };
export type WAMessage = {
  id: string;
  from: string;
  type: string;
  timestamp?: string;
  text?: { body: string };
  image?: { id: string; mime_type?: string; caption?: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
  };
};
