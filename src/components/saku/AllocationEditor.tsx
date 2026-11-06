import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { DEFAULT_ALOKASI, POCKETS, rp, type PocketKey } from "@/lib/saku";
import { parseThousands } from "@/components/saku/MoneyInput";

export const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round((Number.isFinite(n) ? n : 0) * 10) / 10));

/** Free manual mode: set exactly one pocket, never touch the others. */
export function setPocket(value: Record<PocketKey, number>, k: PocketKey, pct: number): Record<PocketKey, number> {
  return { ...value, [k]: clampPct(pct) };
}

export function splitEven(): Record<PocketKey, number> {
  return { ...DEFAULT_ALOKASI };
}

export function allocStatus(value: Record<PocketKey, number>, base: number) {
  const pct = Math.round(Object.values(value).reduce((a, b) => a + b, 0) * 10) / 10;
  const amount = Math.round((base * pct) / 100);
  return { pct, amount, over: pct > 100 || amount > base, sisaPct: Math.round((100 - pct) * 10) / 10, sisaRp: base - amount };
}

export function AllocationEditor({
  sisa,
  value,
  onChange,
  onSave,
  onReset,
}: {
  sisa: number;
  value: Record<PocketKey, number>;
  onChange: (v: Record<PocketKey, number>) => void;
  onSave?: () => void;
  onReset?: () => void;
}) {
  const st = allocStatus(value, sisa);
  // Free manual mode: changing one pocket never touches the others.
  const set = (k: PocketKey, pct: number) => onChange(setPocket(value, k, pct));
  const num = (raw: string) => (raw === "" ? 0 : Number(raw));
  return (
    <div className="space-y-3">
      {POCKETS.map((p) => (
        <div key={p.key} className="rounded-2xl border border-border p-3" style={{ background: p.soft }}>
          <div className="mb-2 flex items-center gap-2 text-sm font-bold">
            <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
            {p.label}
          </div>
          <Slider value={[value[p.key] ?? 0]} min={0} max={100} step={1} onValueChange={([v]) => set(p.key, v ?? 0)} />
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              aria-label={`Rupiah ${p.label}`}
              className="min-w-0 flex-1 rounded-lg border border-input bg-card px-2 py-1 text-sm"
              value={Math.round((sisa * (value[p.key] ?? 0)) / 100).toLocaleString("id-ID")}
              onChange={(e) => set(p.key, sisa > 0 ? (parseThousands(e.target.value) / sisa) * 100 : 0)}
            />
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              inputMode="decimal"
              aria-label={`Persen ${p.label}`}
              className="w-[4.5rem] rounded-lg border border-input bg-card px-2 py-1 text-right text-sm font-semibold"
              value={value[p.key] ?? 0}
              onChange={(e) => set(p.key, num(e.target.value))}
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
      ))}
      <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold">
        Total Alokasi: {rp(st.amount)} · {st.pct}% dari {rp(sisa)}
      </div>
      {st.over ? (
        <div className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-bold text-destructive">Total: {st.pct}% — Kelebihan {st.pct - 100}% ({rp(-st.sisaRp)})</div>
      ) : st.pct < 100 ? (
        <div className="rounded-xl bg-warning-soft px-3 py-2 text-sm font-semibold text-warning">Total: {st.pct}% — Sisa {st.sisaPct}% belum dialokasi ({rp(st.sisaRp)})</div>
      ) : (
        <div className="rounded-xl bg-success-soft px-3 py-2 text-sm font-semibold text-success">✓ Total: 100% — Pas teralokasi</div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => (onReset ? onReset() : onChange({ ...DEFAULT_ALOKASI }))}>Reset ke Default</Button>
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => onChange(splitEven())}>Bagi Rata</Button>
        {onSave && (
          <Button type="button" className="col-span-2 rounded-xl" disabled={st.pct !== 100} onClick={onSave}>Simpan Alokasi</Button>
        )}
      </div>
    </div>
  );
}


export const POCKET_STORAGE: Record<PocketKey, { where: string; why: string }> = {
  darurat: { where: "Bank Digital (Jago / Blu)", why: "Kantong terpisah, bunga lebih tinggi, bisa ditarik kapan saja" },
  investasi: { where: "Bibit / Ajaib", why: "Reksadana & saham mulai nominal kecil, terdaftar OJK" },
  tabungan: { where: "Bank Konvensional (BCA / Mandiri)", why: "Aman untuk tujuan jangka pendek, mudah tarik tunai" },
  reward: { where: "E-Wallet / Kantong Jago (ShopeePay / Jago)", why: "Terpisah dari uang harian supaya tidak kebablasan" },
};

export function PocketStorageSuggestions({ sisa, value }: { sisa: number; value: Record<PocketKey, number> }) {
  return (
    <div className="space-y-2">
      {POCKETS.map((p) => (
        <div key={p.key} className="flex gap-3 rounded-2xl border border-border p-3" style={{ background: p.soft }}>
          <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: p.color }} />
          <div className="flex-1">
            <div className="flex justify-between text-sm font-bold"><span>{p.label}</span><span>{rp((sisa * value[p.key]) / 100)}</span></div>
            <p className="text-sm">→ {POCKET_STORAGE[p.key].where}</p>
            <p className="text-xs text-muted-foreground">{POCKET_STORAGE[p.key].why}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export const STORAGE = [
  { group: "Bank Konvensional", items: ["BCA", "Mandiri"], for: "Dana Darurat & Tabungan — aman, mudah tarik tunai" },
  { group: "E-Wallet", items: ["GoPay", "OVO"], for: "Biaya Hidup & Self Reward — praktis untuk transaksi harian" },
  { group: "Bank Digital", items: ["Jago", "Blu"], for: "Kantong terpisah & bunga lebih tinggi untuk tabungan" },
];

export function StorageSuggestions() {
  return (
    <div className="space-y-2">
      {STORAGE.map((s) => (
        <div key={s.group} className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">{s.group}</span>
            <div className="flex gap-1">
              {s.items.map((i) => (
                <span key={i} className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold">{i}</span>
              ))}
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{s.for}</p>
        </div>
      ))}
    </div>
  );
}
