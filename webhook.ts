// Meta WhatsApp Cloud API webhook. Public route — verifies signature on POST.
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Hub-Signature-256",
};

function verifySignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const provided = signatureHeader.slice(7);
  if (expected.length !== provided.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      // Verification handshake: Meta sends hub.mode, hub.verify_token, hub.challenge
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        const expected = process.env.WHATSAPP_VERIFY_TOKEN;
        if (mode === "subscribe" && token && expected && token === expected) {
          return new Response(challenge ?? "", { status: 200, headers: corsHeaders });
        }
        return new Response("Forbidden", { status: 403, headers: corsHeaders });
      },

      // Incoming messages / status callbacks
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const appSecret = process.env.WHATSAPP_APP_SECRET;
        const signature = request.headers.get("x-hub-signature-256");

        if (appSecret) {
          if (!verifySignature(rawBody, signature, appSecret)) {
            console.warn("WhatsApp webhook: invalid signature");
            return new Response("Invalid signature", { status: 401, headers: corsHeaders });
          }
        } else {
          console.warn("WhatsApp webhook: WHATSAPP_APP_SECRET not set — skipping signature verification");
        }

        let payload: WebhookPayload;
        try {
          payload = JSON.parse(rawBody) as WebhookPayload;
        } catch {
          return new Response("Bad JSON", { status: 400, headers: corsHeaders });
        }

        // Handle asynchronously; ALWAYS reply 200 fast so Meta doesn't retry.
        processPayload(payload).catch((e) => console.error("WhatsApp processing error", e));
        return new Response("EVENT_RECEIVED", { status: 200, headers: corsHeaders });
      },
    },
  },
});

async function processPayload(payload: WebhookPayload) {
  const { handleInboundMessage } = await import("@/lib/whatsapp-flow.server");
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value?.messages?.length) continue;
      const contact = value.contacts?.[0];
      for (const message of value.messages) {
        try {
          await handleInboundMessage(message, contact);
        } catch (e) {
          console.error("handleInboundMessage failed", e);
        }
      }
    }
  }
}

type WebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<Parameters<typeof import("@/lib/whatsapp-flow.server").handleInboundMessage>[0]>;
        contacts?: Array<{ wa_id: string; profile?: { name?: string } }>;
      };
    }>;
  }>;
};
