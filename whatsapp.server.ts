// WhatsApp Cloud API helpers — server-only.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GRAPH_VERSION = "v21.0";

function graphUrl(path: string) {
  return `https://graph.facebook.com/${GRAPH_VERSION}/${path}`;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

type SendResult = { id?: string; error?: string };

async function callGraph(body: Record<string, unknown>): Promise<SendResult> {
  const phoneId = requireEnv("WHATSAPP_PHONE_NUMBER_ID");
  const token = requireEnv("WHATSAPP_ACCESS_TOKEN");
  const res = await fetch(graphUrl(`${phoneId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...body }),
  });
  const json = (await res.json()) as { messages?: { id: string }[]; error?: { message: string } };
  if (!res.ok) {
    console.error("WhatsApp send error", json);
    return { error: json.error?.message ?? `HTTP ${res.status}` };
  }
  return { id: json.messages?.[0]?.id };
}

export async function sendText(to: string, body: string) {
  return callGraph({ to, type: "text", text: { preview_url: false, body } });
}

export type ListSection = {
  title: string;
  rows: { id: string; title: string; description?: string }[];
};

export async function sendList(
  to: string,
  header: string,
  body: string,
  buttonText: string,
  sections: ListSection[]
) {
  return callGraph({
    to,
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: header.slice(0, 60) },
      body: { text: body.slice(0, 1024) },
      footer: { text: "Ngwathe Municipality" },
      action: { button: buttonText.slice(0, 20), sections },
    },
  });
}

export async function sendButtons(
  to: string,
  body: string,
  buttons: { id: string; title: string }[]
) {
  return callGraph({
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: body.slice(0, 1024) },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  });
}

export async function downloadMedia(mediaId: string): Promise<{ buffer: ArrayBuffer; mimeType: string } | null> {
  const token = requireEnv("WHATSAPP_ACCESS_TOKEN");
  const meta = await fetch(graphUrl(mediaId), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!meta.ok) return null;
  const info = (await meta.json()) as { url?: string; mime_type?: string };
  if (!info.url) return null;
  const file = await fetch(info.url, { headers: { Authorization: `Bearer ${token}` } });
  if (!file.ok) return null;
  return { buffer: await file.arrayBuffer(), mimeType: info.mime_type ?? "application/octet-stream" };
}

export async function logMessage(args: {
  sessionId?: string | null;
  phoneNumber: string;
  direction: "in" | "out";
  waMessageId?: string | null;
  messageType?: string | null;
  payload: Record<string, unknown>;
  complaintId?: string | null;
}) {
  await supabaseAdmin.from("whatsapp_messages").insert({
    session_id: args.sessionId ?? null,
    phone_number: args.phoneNumber,
    direction: args.direction,
    wa_message_id: args.waMessageId ?? null,
    message_type: args.messageType ?? null,
    payload: args.payload as never,
    complaint_id: args.complaintId ?? null,
  });
}
