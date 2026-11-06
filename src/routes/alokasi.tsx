import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, Loading, Panel } from "@/components/saku/AppShell";
import { AllocationEditor, PocketStorageSuggestions } from "@/components/saku/AllocationEditor";
import { GoalAdvisor } from "@/components/saku/GoalAdvisor";
import { Donut } from "@/components/saku/Donut";
import { DEFAULT_ALOKASI, sortir, useProfile, type PocketKey } from "@/lib/saku";

export const Route = createFileRoute("/alokasi")({
  head: () => ({
    meta: [
      { title: "Alokasi 4 Kantong — EASY FINMA" },
      { name: "description", content: "Atur persen atau rupiah tiap kantong: darurat, tabungan, investasi, reward." },
      { property: "og:title", content: "Alokasi 4 Kantong — EASY FINMA" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:description", content: "Atur persen atau rupiah tiap kantong keuanganmu." },
    ],
  }),
  component: Alokasi,
});

function Alokasi() {
  const { profile, save } = useProfile();
  const [val, setVal] = useState<Record<PocketKey, number>>(DEFAULT_ALOKASI);
  useEffect(() => { if (profile) setVal(profile.alokasi); }, [profile]);
  if (!profile) return <Loading />;
  const s = sortir(profile);
  return (
    <AppShell title="Alokasi">
      <Panel className="mb-4"><Donut sisa={s.sisa} alokasi={val} /></Panel>
      <GoalAdvisor profile={profile} onApply={setVal} />
      <p className="mb-2 text-xs text-muted-foreground">Atur bebas tiap kantong dalam Rp atau % (dari sisa gaji bebas). Kantong lain tidak ikut berubah. Tekan Simpan Alokasi agar Beranda ikut update.</p>
      <AllocationEditor
        sisa={s.sisa}
        value={val}
        onChange={setVal}
        onReset={() => { setVal({ ...DEFAULT_ALOKASI }); toast.info("Rekomendasi Default dimuat — tekan Simpan"); }}
        onSave={() => { save({ ...profile, alokasi: val }); toast.success("Alokasi tersimpan"); }}
      />
      <h2 className="mb-2 mt-6 font-bold">Saran Penyimpanan per Kantong</h2>
      <PocketStorageSuggestions sisa={s.sisa} value={val} />
    </AppShell>
  );
}
