import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge") ?? "";
        const { getWhatsappSettings } = await import("@/lib/whatsapp.server");
        const cfg = await getWhatsappSettings();
        if (mode === "subscribe" && token && cfg.verify_token && token === cfg.verify_token) {
          return new Response(challenge, { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },
      POST: async ({ request }) => {
        const body = await request.text();
        const { processWebhook, getWhatsappSettings } = await import("@/lib/whatsapp.server");
        const cfg = await getWhatsappSettings();
        if (cfg.app_secret) {
          const signature = request.headers.get("x-hub-signature-256") ?? "";
          const { createHmac, timingSafeEqual } = await import("crypto");
          const expected = "sha256=" + createHmac("sha256", cfg.app_secret).update(body).digest("hex");
          const a = Buffer.from(signature);
          const b = Buffer.from(expected);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("Invalid signature", { status: 401 });
          }
        }
        try {
          const processed = await processWebhook(JSON.parse(body));
          return Response.json({ ok: true, processed });
        } catch (e) {
          console.error("[whatsapp webhook]", e);
          return Response.json({ ok: false }, { status: 200 });
        }
      },
    },
  },
});
