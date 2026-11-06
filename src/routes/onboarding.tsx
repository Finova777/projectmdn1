import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AllocationEditor, StorageSuggestions } from "@/components/saku/AllocationEditor";
import { Panel } from "@/components/saku/AppShell";
import { MoneyInput } from "@/components/saku/MoneyInput";
import { emptyProfile, JOBS, loadProfile, rp, incomeLabel, isStudent, saveProfile, sortir, type InsKey, type Profile } from "@/lib/saku";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Mulai — EASY FINMA" },
      { name: "description", content: "Isi profil, pengeluaran, dan asuransi untuk rekomendasi alokasi 4 kantong." },
      { property: "og:title", content: "Mulai — EASY FINMA" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:description", content: "Wizard 4 langkah untuk alokasi keuangan otomatis." },
    ],
  }),
  component: Onboarding,
});

const DRAFT_KEY = "saku5-onboarding-draft";
const STEPS = ["Profil", "Pengeluaran", "Asuransi", "Auto Sortir"];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
const inputCls = "w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring";

function Onboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Profile>(emptyProfile());
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let draft: Partial<Profile> | null = null;
    try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch { draft = null; }
    const ex = loadProfile();
    if (draft || ex) setP({ ...emptyProfile(), ...(ex ?? {}), ...(draft ?? {}) });
    setLoaded(true);
  }, []);
  // Persist wizard progress so nothing is lost while editing sliders or navigating steps.
  useEffect(() => {
    if (loaded) localStorage.setItem(DRAFT_KEY, JSON.stringify(p));
  }, [p, loaded]);
  const money = (k: keyof Profile, placeholder: string) => (
    <MoneyInput className={inputCls} placeholder={placeholder} value={(p[k] as number) || 0} onChange={(n) => setP((prev) => ({ ...prev, [k]: n }))} />
  );
  const num = (k: keyof Profile) => ({
    type: "number" as const,
    inputMode: "numeric" as const,
    className: inputCls,
    value: (p[k] as number) || "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: Number(e.target.value) }),
  });
  const setIns = (k: InsKey, patch: Partial<Profile["asuransi"][InsKey]>) =>
    setP({ ...p, asuransi: { ...p.asuransi, [k]: { ...p.asuransi[k], ...patch } } });
  const s = sortir(p);
  const canNext = step !== 0 || (p.nama.trim() !== "" && p.umur > 0 && p.gaji > 0);

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 pb-10 pt-6">
      <p className="text-lg font-extrabold">EASY FINMA</p>
      <p className="text-[11px] text-muted-foreground">Financial Management ...</p>
      <h1 className="mt-1 text-2xl font-extrabold">{STEPS[step]}</h1>
      <div className="mt-3 flex gap-1.5">
        {STEPS.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-ink" : "bg-accent"}`} />
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {step === 0 && (
          <>
            <Field label="Nama"><input className={inputCls} value={p.nama} onChange={(e) => setP({ ...p, nama: e.target.value })} placeholder="Nama kamu" /></Field>
            <Field label="Umur"><input {...num("umur")} placeholder="Isi umur kamu" /></Field>
                        <Field label="Jenis Pekerjaan">
              <select className={inputCls} value={p.pekerjaan} onChange={(e) => setP({ ...p, pekerjaan: e.target.value as Profile["pekerjaan"] })}>
                {JOBS.map((j) => <option key={j.v} value={j.v}>{j.l}</option>)}
              </select>
            </Field>
            <Field label={incomeLabel(p.pekerjaan)}>{money("gaji", "Isi pendapatan bersih kamu per bulan")}</Field>
            {isStudent(p.pekerjaan) && (
              <p className="-mt-2 text-[11px] text-muted-foreground">UKT tidak dihitung sebagai pendapatan. Isi hanya uang saku/penghasilan bersih yang bisa kamu pakai tiap bulan.</p>
            )}
          </>
        )}
        {step === 1 && (
          <>
            <p className="text-xs font-bold text-muted-foreground">Tempat tinggal, listrik, cicilan & pajak = Pengeluaran Tetap (terkunci, ubah lewat Profil › Edit Data). Makan & transport bisa diubah bebas di Beranda.</p>
            <Field label="Biaya tempat tinggal / bulan">{money("tinggal", "Silahkan isi biaya tempat tinggal kamu")}</Field>
            <Field label="Listrik + air + gas + internet">{money("utilitas", "Silahkan isi biaya listrik, air, gas & internet kamu")}</Field>
            <Field label="Biaya makan">{money("makan", "Silahkan isi biaya makan kamu")}</Field>
            <Field label="Cicilan / hutang">{money("cicilan", "Silahkan isi biaya cicilan / hutang kamu")}</Field>
            <Field label="Biaya transportasi">{money("transport", "Silahkan isi biaya transportasi kamu")}</Field>
            <Field label="Kendaraan">
              <select className={inputCls} value={p.kendaraan} onChange={(e) => setP({ ...p, kendaraan: e.target.value as Profile["kendaraan"] })}>
                <option value="tidak">Tidak ada</option><option value="motor">Motor</option><option value="mobil">Mobil</option>
              </select>
            </Field>
            <Field label="Pajak tahunan kendaraan & properti">{money("pajak", "Silahkan isi biaya pajak tahunan kendaraan & properti kamu")}</Field>
          </>
        )}
        {step === 2 && (
          <>
            {(["kesehatan", "kendaraan", "properti", "lainnya"] as InsKey[]).map((k) => (
              <Panel key={k}>
                <label className="flex items-center gap-3 font-semibold capitalize">
                  <Checkbox checked={p.asuransi[k].aktif} onCheckedChange={(v) => setIns(k, { aktif: !!v })} />
                  {k === "kesehatan" ? "Kesehatan / BPJS" : k}
                </label>
                {p.asuransi[k].aktif && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <input className={inputCls} placeholder="Jenis" value={p.asuransi[k].jenis} onChange={(e) => setIns(k, { jenis: e.target.value })} />
                    <input className={inputCls} type="number" placeholder="Premi/bulan" value={p.asuransi[k].premi || ""} onChange={(e) => setIns(k, { premi: Number(e.target.value) })} />
                  </div>
                )}
              </Panel>
            ))}
          </>
        )}
        {step === 3 && (
          <>
            <Panel>
              <h2 className="mb-2 font-bold">Hasil Sortir</h2>
              {[
                [isStudent(p.pekerjaan) ? "Uang Saku (di luar UKT)" : "Pendapatan", s.pendapatan, "text-success"],
                ["Pengeluaran Tetap (tempat tinggal, listrik, cicilan, pajak÷12)", s.tetap, ""],
                ["Pengeluaran Tidak Tetap (makan, transport)", s.tidakTetap, ""],
                ["Lainnya (premi asuransi)", s.lainnya, ""],
                ["Sisa Bebas", s.sisa, "font-extrabold"],
              ].map(([l, v, c]) => (
                <div key={l as string} className="flex justify-between gap-3 border-b border-border py-2 text-sm last:border-0">
                  <span className="text-muted-foreground">{l}</span>
                  <span className={`shrink-0 font-semibold ${c}`}>{rp(v as number)}</span>
                </div>
              ))}
            </Panel>
            <h2 className="font-bold">Rekomendasi Alokasi EASY FINMA</h2>
            <AllocationEditor sisa={s.sisa} value={p.alokasi} onChange={(alokasi) => setP({ ...p, alokasi })} />
            <h2 className="font-bold">Saran Penyimpanan</h2>
            <StorageSuggestions />
          </>
        )}
      </div>

      <div className="mt-8 flex gap-3">
        {step > 0 && <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStep(step - 1)}>Kembali</Button>}
        <Button
          className="flex-1 rounded-xl"
          disabled={!canNext}
          onClick={() => {
            if (step < 3) setStep(step + 1);
            else { const ex = loadProfile(); saveProfile({ ...p, tabungan: ex?.tabungan ?? p.tabungan, aset: ex?.aset ?? p.aset }); localStorage.removeItem(DRAFT_KEY); nav({ to: "/" }); }
          }}
        >
          {step < 3 ? "Lanjut" : "Simpan & Mulai"}
        </Button>
      </div>
    </div>
  );
}
