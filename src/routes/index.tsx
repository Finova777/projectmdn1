import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Gamepad2, ChevronRight } from "lucide-react";
import { AppShell, Loading, Panel } from "@/components/saku/AppShell";
import { Donut } from "@/components/saku/Donut";
import { isStudent, POCKETS, rp, short, sortir, useProfile, type Profile } from "@/lib/saku";
import { Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EASY FINMA - Financial Management Made Easy" },
      { name: "description", content: "EASY FINMA (FINMA = Financial Management) - Kelola keuangan 5 saku" },
      { property: "og:title", content: "EASY FINMA" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:description", content: "EASY FINMA (FINMA = Financial Management) - Kelola keuangan 5 saku" },
    ],
  }),
  component: Beranda,
});

function Beranda() {
  const { profile, ready, save } = useProfile();
  const nav = useNavigate();
  useEffect(() => {
    if (ready && !profile) nav({ to: "/onboarding" });
  }, [ready, profile, nav]);
  if (!profile) return <Loading />;
  const s = sortir(profile);
  const badge = s.status === "Aman" ? "bg-success-soft text-success" : s.status === "Waspada" ? "bg-warning-soft text-warning" : "bg-danger-soft text-destructive";

  return (
    <AppShell>
      <p className="mb-3 text-sm text-muted-foreground">Halo, <span className="font-bold text-foreground">{profile.nama || "Kamu"}</span> 👋</p>
      <div className="rounded-[24px] bg-ink p-5 text-ink-foreground">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-ink-muted">{isStudent(profile.pekerjaan) ? "Uang Saku / bulan (di luar UKT)" : "Pendapatan / bulan"}</p>
            <p className="mt-1 text-3xl font-extrabold">{rp(s.pendapatan)}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${badge}`}>{s.status}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-ink-soft p-3">
            <p className="text-[11px] text-ink-muted">Total Pengeluaran</p>
            <p className="text-base font-bold">{rp(s.tetap + s.tidakTetap + s.lainnya)}</p>
          </div>
          <div className="rounded-2xl bg-success-soft p-3 text-success">
            <p className="text-[11px]">Sisa Bebas</p>
            <p className="text-base font-bold">{rp(s.sisa)}</p>
          </div>
        </div>
      </div>

      <ExpensePanel profile={profile} onSave={save} />

      <Link to="/simulasi" className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-float">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-hidup-soft text-warning"><Gamepad2 /></span>
        <span className="flex-1">
          <span className="block font-bold">Mulai Simulasi</span>
          <span className="block text-xs text-muted-foreground">Perjalanan 1 Tahun — jaga uang & kebahagiaan</span>
        </span>
        <ChevronRight className="text-muted-foreground" />
      </Link>

      <Panel className="mt-4">
        <h2 className="font-bold">Alokasi 4 Kantong</h2>
        <Donut sisa={s.sisa} alokasi={profile.alokasi} />
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          {POCKETS.map((p) => (
            <span key={p.key} className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />{p.label}
            </span>
          ))}
        </div>
      </Panel>

      <h2 className="mb-2 mt-5 font-bold">Detail Kantong</h2>
      <div className="grid grid-cols-2 gap-3">
        {POCKETS.map((p) => (
          <div key={p.key} className="rounded-2xl border border-border p-3" style={{ background: p.soft }}>
            <div className="flex items-center justify-between">
              <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
              <span className="text-xs font-bold text-muted-foreground">{profile.alokasi[p.key]}%</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{p.label}</p>
            <p className="text-lg font-extrabold">{short((s.sisa * profile.alokasi[p.key]) / 100)}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{p.desc}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

const VAR_FIELDS: [keyof Profile, string][] = [["makan", "Makan"], ["transport", "Transportasi"]];

function ExpensePanel({ profile, onSave }: { profile: Profile; onSave: (p: Profile) => void }) {
  const [v, setV] = useState({ makan: profile.makan, transport: profile.transport });
  const dirty = v.makan !== profile.makan || v.transport !== profile.transport;
  const fixed: [string, number][] = [["Tempat tinggal", profile.tinggal], ["Listrik, air, gas, internet", profile.utilitas], ["Cicilan / hutang", profile.cicilan], ["Pajak tahunan ÷ 12", profile.pajak / 12]];
  return (
    <Panel className="mt-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Pengeluaran Tetap</h2>
        <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground"><Lock className="h-3 w-3" /> Terkunci</span>
      </div>
      {fixed.map(([l, n]) => (
        <div key={l} className="flex justify-between border-b border-border py-2 text-sm last:border-0">
          <span className="text-muted-foreground">{l}</span><span className="font-semibold">{rp(n)}</span>
        </div>
      ))}
      <Link to="/profil" className="mt-1 block text-[11px] font-semibold text-muted-foreground underline">Ubah lewat Profil › Edit Data</Link>

      <h2 className="mt-4 font-bold">Pengeluaran Tidak Tetap</h2>
      <div className="mt-2 space-y-2">
        {VAR_FIELDS.map(([k, l]) => (
          <label key={k} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{l}</span>
            <input
              type="number"
              inputMode="numeric"
              className="w-36 rounded-xl border border-input bg-card px-3 py-1.5 text-right text-sm"
              value={v[k as keyof typeof v] || ""}
              onChange={(e) => setV({ ...v, [k]: Math.max(0, Number(e.target.value)) })}
            />
          </label>
        ))}
      </div>
      <Button className="mt-3 w-full rounded-xl" disabled={!dirty} onClick={() => { onSave({ ...profile, ...v }); toast.success("Pengeluaran tidak tetap disimpan"); }}>
        Simpan Pengeluaran
      </Button>
    </Panel>
  );
}
