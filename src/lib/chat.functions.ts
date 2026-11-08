import { createServerFn } from "@tanstack/react-start";

export type ChatMessage = { role: "user" | "assistant"; content: string };
type Input = { messages: ChatMessage[] };

const SYSTEM = `Kamu "FINMA AI", asisten keuangan yang ramah di dalam aplikasi EASY FINMA untuk anak muda Indonesia.
Bantu pengguna soal: mengatur uang, menabung, konsep 4 kantong (Dana Darurat, Investasi, Tabungan, Self Reward), dasar investasi (reksadana, saham, emas, kripto), asuransi, dan fitur aplikasi.
Gaya: bahasa Indonesia santai, jawaban singkat dan jelas, pakai contoh angka Rupiah bila membantu, boleh pakai 1-2 emoji seperlunya.
Aturan penting: ini edukasi, BUKAN nasihat keuangan/investasi profesional. Jangan menjanjikan keuntungan pasti, jangan menyuruh membeli produk atau koin tertentu, dan ingatkan soal risiko bila relevan. Jika pertanyaan di luar topik keuangan/aplikasi, tolak dengan sopan dan arahkan kembali.`;

// Keep only the last turns so prompts stay small; Gemini sees the recent window.
const MAX_TURNS = 12;
const MAX_CHARS = 2000;

export const chatWithAI = createServerFn({ method: "POST" })
  .inputValidator((d: Input) => {
    const raw = Array.isArray(d?.messages) ? d.messages : [];
    const clean = raw
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_CHARS) }))
      .filter((m) => m.content.length > 0)
      .slice(-MAX_TURNS);
    if (clean.length === 0) throw new Error("Pesan kosong.");
    if (clean[clean.length - 1]!.role !== "user") throw new Error("Pesan terakhir harus dari pengguna.");
    return { messages: clean };
  })
  .handler(async ({ data }) => {
    const { generateGemini, GeminiError } = await import("@/lib/gemini");
    try {
      const contents = data.messages.map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
      }));
      const reply = await generateGemini({
        system: SYSTEM,
        contents,
        temperature: 0.7,
        maxOutputTokens: 800,
      });
      return { ok: true as const, reply: reply.trim().slice(0, 4000) };
    } catch (e) {
      console.error("chatWithAI failed", e);
      if (e instanceof GeminiError && e.status === 401) return { ok: false as const, error: "Fitur AI belum dikonfigurasi. Hubungi pemilik aplikasi." };
      if (e instanceof GeminiError && e.status === 429) return { ok: false as const, error: "Terlalu banyak permintaan, coba lagi sebentar." };
      return { ok: false as const, error: "AI gagal menjawab. Coba lagi." };
    }
  });
