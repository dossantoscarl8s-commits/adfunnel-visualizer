export type AiMessage = { role: "user" | "assistant" | "system"; content: string };

export async function callGateway(model: string, messages: AiMessage[], temperature: number) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("IA não configurada.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, temperature }),
  });
  if (res.status === 429) throw new Error("Limite de requisições da IA atingido. Tente novamente em instantes.");
  if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
  if (!res.ok) throw new Error(`Falha na IA (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}
