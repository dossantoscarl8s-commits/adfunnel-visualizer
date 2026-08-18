import { useState } from "react";
import { Bot, SendHorizonal, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { askAnalyst } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

const QUICK = [
  "Onde devo escalar investimento agora?",
  "Quais unidades estão com CPL fora do padrão?",
  "Resuma o funil e aponte 3 decisões imediatas.",
];

export function AiAssistant({ context }: { context: unknown }) {
  const ask = useServerFn(askAnalyst);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    setInput("");
    const history = messages.slice(-6);
    setMessages((m) => [...m, { role: "user", content: question }]);
    setLoading(true);
    try {
      const res = await ask({
        data: { question, context: JSON.stringify(context).slice(0, 12000), history },
      });
      setMessages((m) => [...m, { role: "assistant", content: res.answer }]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel flex h-full min-h-[420px] flex-col p-4">
      <div className="flex items-center gap-2 pb-3">
        <span className="brand-gradient rounded-lg p-2">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </span>
        <div>
          <p className="text-sm font-semibold">Copiloto de decisão</p>
          <p className="text-xs text-muted-foreground">Analisa os dados do período selecionado</p>
        </div>
      </div>

      <ScrollArea className="flex-1 pr-2">
        {messages.length === 0 ? (
          <div className="space-y-2 pt-2">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                {q}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-6 rounded-lg bg-secondary px-3 py-2 text-sm"
                    : "rounded-lg border border-border bg-card px-3 py-2 text-sm whitespace-pre-wrap"
                }
              >
                {m.role === "assistant" && <Bot className="mb-1 h-4 w-4 text-primary" />}
                {m.content}
              </div>
            ))}
            {loading && <p className="text-xs text-muted-foreground">Analisando os números…</p>}
          </div>
        )}
      </ScrollArea>

      <div className="mt-3 flex items-end gap-2">
        <Textarea
          value={input}
          rows={2}
          placeholder="Pergunte algo sobre as métricas…"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <Button size="icon" disabled={loading} onClick={() => send(input)} aria-label="Enviar">
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
