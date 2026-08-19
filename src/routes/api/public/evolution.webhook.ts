import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/evolution/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? request.headers.get("x-webhook-token") ?? "";
        const { getEvolutionSettings, processEvolutionWebhook } = await import("@/lib/evolution.server");
        const cfg = await getEvolutionSettings();
        if (!cfg.webhook_token || token !== cfg.webhook_token) {
          return new Response("Invalid token", { status: 401 });
        }
        try {
          const payload = await request.json();
          const processed = await processEvolutionWebhook(payload);
          return Response.json({ ok: true, processed });
        } catch (e) {
          console.error("[evolution webhook]", e);
          return Response.json({ ok: false }, { status: 200 });
        }
      },
    },
  },
});
