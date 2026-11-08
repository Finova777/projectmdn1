import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, X, Send, Crown, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chatWithAI, type ChatMessage } from "@/lib/chat.functions";
import { usePremium } from "@/lib/premium";

// Free users get a limited number of AI replies per browser session; Premium
// (simulation) lifts the cap. The counter is per-session and best-effort.
const FREE_LIMIT = 5;
const USED_KEY = "finma_chat_used";
const GREETING: ChatMessage = {
  role: "assistant",
  content: "Hai! Aku FINMA AI 🤖 Tanya aku apa saja soal mengatur uang, menabung, atau investasi ya.",
};

function readUsed(): number {
  try {
    return Number(sessionStorage.getItem(USED_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export function ChatAI() {
  const run = useServerFn(chatWithAI);
  const { premium } = usePremium();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [used, setUsed] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => setUsed(readUsed()), []);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const limited = !premium && used >= FREE_LIMIT;

  const send = async () => {
    const text = input.trim();
    if (!text || busy || limited) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const r = await run({ data: { messages: next.map((m) => ({ role: m.role, content: m.content })) } });
      if (r.ok) {
        setMessages((m) => [...m, { role: "assistant", content: r.reply }]);
        if (!premium) {
          const n = used + 1;
          setUsed(n);
          try {
            sessionStorage.setItem(USED_KEY, String(n));
          } catch {
            /* ignore */
          }
        }
      } else {
        setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${r.error}` }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "⚠️ Gagal menghubungi AI. Coba lagi." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          aria-label="Buka Chat AI"
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float transition-transform active:scale-95"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed inset-x-4 bottom-4 top-16 z-[55] mx-auto flex max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-float">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-bold leading-none">FINMA AI</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {premium ? "Premium • tanpa batas" : `Gratis • sisa ${Math.max(0, FREE_LIMIT - used)} pesan`}
                </p>
              </div>
            </div>
            <button
              aria-label="Tutup Chat AI"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">Mengetik…</div>
              </div>
            )}
          </div>

          {limited ? (
            <div className="border-t border-border p-4 text-center">
              <p className="text-xs text-muted-foreground">Batas chat gratis tercapai untuk sesi ini.</p>
              <Button asChild className="mt-2 w-full rounded-xl" onClick={() => setOpen(false)}>
                <Link to="/profil">
                  <Crown className="mr-1 h-4 w-4" /> Buka tanpa batas dengan Premium
                </Link>
              </Button>
            </div>
          ) : (
            <form
              className="flex items-end gap-2 border-t border-border p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <textarea
                className="max-h-24 flex-1 resize-none rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:border-ring"
                rows={1}
                placeholder="Tulis pertanyaanmu…"
                value={input}
                maxLength={2000}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <Button type="submit" size="icon" className="h-10 w-10 shrink-0 rounded-xl" disabled={busy || input.trim().length === 0}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
