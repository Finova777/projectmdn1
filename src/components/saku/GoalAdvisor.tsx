import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/saku/AppShell";
import { recommendSplit } from "@/lib/goal-advisor.functions";
import { POCKETS, sortir, type PocketKey, type Profile } from "@/lib/saku";

export function GoalAdvisor({ profile, onApply }: { profile: Profile; onApply: (v: Record<PocketKey, number>) => void }) {
  const run = useServerFn(recommendSplit);
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ split: Record<PocketKey, number>; alasan: string } | null>(null);
  const ask = async () => {
    setBusy(true);
    try {
      const r = await run({ data: { goal, umur: profile.umur, gaji: profile.gaji, sisa: sortir(profile).sisa, pekerjaan: profile.pekerjaan } });
      if (r.ok) setRes({ split: r.split, alasan: r.alasan });
      else toast.error(r.error);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rekomendasi gagal dibuat.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel className="mb-4">
      <h2 className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4" /> Saran AI dari Tujuanmu</h2>
      <p className="mt-1 text-xs text-muted-foreground">Ceritakan tujuan menabungmu, AI akan menyarankan pembagian 4 kantong.</p>
      <textarea
        className="mt-3 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm"
        rows={3}
        maxLength={800}
        placeholder="Contoh: Mau beli laptop Rp 10 juta tahun depan dan mulai investasi untuk DP rumah."
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
      />
      <Button className="mt-2 w-full rounded-xl" disabled={busy || goal.trim().length < 5} onClick={ask}>
        {busy ? "Sedang menghitung…" : "Minta Saran AI"}
      </Button>
      {res && (
        <div className="mt-3 rounded-xl bg-muted p-3">
          <div className="grid grid-cols-2 gap-2">
            {POCKETS.map((p) => (
              <div key={p.key} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                <span className="flex-1 text-muted-foreground">{p.label}</span>
                <b>{res.split[p.key]}%</b>
              </div>
            ))}
          </div>
          {res.alasan && <p className="mt-2 text-xs text-muted-foreground">{res.alasan}</p>}
          <Button variant="outline" className="mt-3 w-full rounded-xl" onClick={() => { onApply(res.split); toast.info("Saran AI dipakai — tekan Simpan Alokasi"); }}>
            Pakai Saran Ini
          </Button>
        </div>
      )}
    </Panel>
  );
}
