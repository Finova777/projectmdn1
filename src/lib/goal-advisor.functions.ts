import { createServerFn } from "@tanstack/react-start";
import { normalizeSplit } from "@/lib/goal-advisor";

type Input = { goal: string; umur: number; gaji: number; sisa: number; pekerjaan: string };

export const recommendSplit = createServerFn({ method: "POST" })
  .inputValidator((d: Input) => {
    const goal = String(d?.goal ?? "").trim().slice(0, 800);
    if (goal.length < 5) throw new Error("Tulis tujuanmu minimal 5 karakter.");
    const n = (x: unknown) => (Number.isFinite(Number(x)) ? Math.max(0, Number(x)) : 0);
    return { goal, umur: n(d.umur), gaji: n(d.gaji), sisa: n(d.sisa), pekerjaan: String(d.pekerjaan ?? "").slice(0, 40) };
  })
  .handler(async ({ data }) => {
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    const prompt = `Profil: umur ${data.umur}, pekerjaan ${data.pekerjaan}, pendapatan Rp${data.gaji}/bulan, sisa bebas setelah semua pengeluaran Rp${data.sisa}/bulan.
Biaya makan, transport dan kebutuhan harian SUDAH dipotong, jadi jangan sisihkan untuk biaya hidup.
Tujuan pengguna: """${data.goal}"""
Bagi sisa bebas ke 4 kantong (persen, total 100): darurat (Dana Darurat), investasi, tabungan (tujuan jangka pendek), reward (Self Reward). Balas JSON sesuai skema, alasan singkat bahasa Indonesia santai (maks 3 kalimat).`;
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions: "Kamu perencana keuangan edukatif untuk anak muda Indonesia. Selalu balas JSON.",
        input: [{ role: "user", content: prompt }],
        text: {
          format: {
            type: "json_schema",
            name: "split",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["darurat", "investasi", "tabungan", "reward", "alasan"],
              properties: {
                darurat: { type: "number" }, investasi: { type: "number" },
                tabungan: { type: "number" }, reward: { type: "number" }, alasan: { type: "string" },
              },
            },
          },
        },
      });
      let text = "";
      for (const o of res.output ?? []) {
        if (o.type !== "message") continue;
        for (const c of o.content) if (c.type === "output_text") text += c.text;
      }
      const parsed = JSON.parse(text) as Record<string, unknown>;
      return {
        ok: true as const,
        split: normalizeSplit(parsed as Record<string, number>),
        alasan: String(parsed["alasan"] ?? "").slice(0, 600),
      };
    } catch (e) {
      console.error("recommendSplit failed", e);
      if (e instanceof GatewayError && e.httpStatus === 429) return { ok: false as const, error: "Terlalu banyak permintaan, coba lagi sebentar." };
      if (e instanceof GatewayError && e.httpStatus === 402) return { ok: false as const, error: "Kredit AI habis. Hubungi pemilik aplikasi." };
      return { ok: false as const, error: "Rekomendasi AI gagal dibuat. Coba lagi." };
    }
  });
