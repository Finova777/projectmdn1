import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/saku/AppShell";
import { INSTRUMENTS, INVESTMENT_TABS, formatChange, formatStatPrice, isEducationCategory, marketSchedule, type InvestmentCategory, type InstrumentStats } from "@/lib/investment-stats";
import { investmentStatsOptions } from "@/lib/investment-stats.query";

export const Route = createFileRoute("/investasi")({
  loader: ({ context }) => context.queryClient.ensureQueryData(investmentStatsOptions("reksadana")),
  head: () => ({ meta: [
    { title: "Statistik Investasi — EASY FINMA" },
    { name: "description", content: "Statistik harga saham, kripto, reksadana, dan emas dengan perubahan bulanan, tahunan, dan status pasar." },
    { property: "og:title", content: "Statistik Investasi — EASY FINMA" },
    { property: "og:description", content: "Pantau harga dan pergerakan investasi tanpa jual beli." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Investasi,
});

function Change({ value }: { value: number | null }) {
  return <span className={`font-bold ${value === null ? "text-muted-foreground" : value >= 0 ? "text-success" : "text-destructive"}`}>{formatChange(value)}</span>;
}

function Statistics({ category }: { category: InvestmentCategory }) {
  const { data, isFetching, refetch } = useSuspenseQuery(investmentStatsOptions(category));
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { setNow(new Date()); const timer = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(timer); }, []);
  const schedule = now ? marketSchedule(category, now) : null;
  const instruments = INSTRUMENTS.filter((a) => a.category === category);
  const educational = isEducationCategory(category);
  return <>
    <div className="my-3 flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{instruments.length} instrumen</span>
      <Button size="sm" variant="ghost" className="h-8 text-xs" disabled={isFetching} onClick={() => void refetch()}>
        <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} /> Perbarui
      </Button>
    </div>
    <div className="space-y-3" role="tabpanel" aria-label={INVESTMENT_TABS.find((t) => t.key === category)?.label}>
      {instruments.map((instrument) => {
        const stats: InstrumentStats | undefined = data.find((d) => d.id === instrument.id);
        const price = stats?.price ?? null;
        const hasData = price !== null;
        const updated = stats?.updatedAt ? new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(stats.updatedAt * 1000)) : null;
        const sourceFresh = Boolean(now && stats?.updatedAt && now.getTime() / 1000 - stats.updatedAt < 120);
        return <article key={instrument.id} className="rounded-lg border border-border bg-card p-4" aria-label={instrument.name}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1"><h3 className="text-sm font-bold leading-5">{instrument.name}</h3><p className="mt-1 text-[10px] text-muted-foreground">{instrument.detail}</p></div>
            {((stats?.history.length ?? 0) > 1 || !educational) && <div className="h-10 w-20 shrink-0" aria-label="Grafik harga 1 bulan">
              {(stats?.history.length ?? 0) > 1 && <ResponsiveContainer width="100%" height="100%"><LineChart data={stats?.history ?? []}>{educational && <YAxis hide domain={["dataMin", "dataMax"]} />}<Line type="monotone" dataKey="price" dot={false} strokeWidth={2} stroke={(stats?.month ?? 0) >= 0 ? "var(--success)" : "var(--destructive)"} isAnimationActive={false} /></LineChart></ResponsiveContainer>}
            </div>}
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">{category === "reksadana" ? "NAB" : "Harga saat ini"}</p>
          <p className="break-words text-xl font-extrabold">{formatStatPrice(price, stats?.currency ?? "IDR")}</p>
          {(!educational || stats?.month != null || stats?.year != null) && <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div><p className="mb-1 text-[10px] text-muted-foreground">Perubahan 1 Bulan</p><Change value={stats?.month ?? null} /></div>
            <div><p className="mb-1 text-[10px] text-muted-foreground">Perubahan 1 Tahun</p><Change value={stats?.year ?? null} /></div>
          </div>}
          {educational ? <p className="mt-3 border-t border-border pt-3 text-[10px] leading-4 text-muted-foreground">Data simulasi edukasi - Bibit/Bareksa/Antam | Status: Pembaruan harian 17.00 WIB</p> : <div className="mt-3 border-t border-border pt-3 text-[10px]">
            <p className="flex items-center gap-1.5"><span className="text-muted-foreground">Status Pasar:</span><span className={`size-1.5 shrink-0 rounded-full ${schedule?.open ? "bg-success" : category === "saham" ? "bg-destructive" : "bg-muted-foreground"}`} /><span className="font-semibold">{schedule ? `${schedule.open && hasData && sourceFresh ? "LIVE · " : ""}${schedule.label}` : "Memuat status…"}</span></p>
            {schedule?.next && <p className="mt-1 text-muted-foreground">{schedule.next}</p>}
            {hasData ? <><p className="mt-2 text-muted-foreground">Yahoo Finance · {sourceFresh ? "Harga terakhir" : "Data dapat tertunda"}</p><p className="text-muted-foreground">{updated} WIB</p></> : <p className="mt-2 leading-4 text-muted-foreground">{stats?.error ?? "Data belum tersedia."}</p>}
          </div>}
          {category === "reksadana" && <Button size="sm" className="mt-3 h-9 w-full rounded-lg text-xs" onClick={() => toast.info("Fitur beli reksadana sedang dikembangkan. Nantikan, ya!")}>Beli</Button>}
        </article>;
      })}
    </div>
    {category === "saham" && <p className="mt-3 text-[10px] text-muted-foreground">Jadwal 09.00–16.00 WIB, Senin–Jumat. Belum memperhitungkan jeda sesi dan hari libur bursa.</p>}
  </>;
}

function Investasi() {
  const [category, setCategory] = useState<InvestmentCategory>("reksadana");
  return <AppShell title="Investasi">
    <section className="mt-2" aria-labelledby="investment-heading">
      <h2 id="investment-heading" className="mb-3 font-bold">Alokasikan dana ke</h2>
      <div className="grid grid-cols-4 gap-1" role="tablist" aria-label="Kategori investasi">
        {INVESTMENT_TABS.map((tab) => <Button key={tab.key} role="tab" aria-selected={category === tab.key} size="sm" variant={category === tab.key ? "default" : "secondary"} className="h-9 min-w-0 rounded-lg px-1 text-[11px]" onClick={() => setCategory(tab.key)}>{tab.label}</Button>)}
      </div>
      <Suspense fallback={<p className="py-8 text-center text-xs text-muted-foreground">Memuat statistik…</p>}><Statistics key={category} category={category} /></Suspense>
    </section>
  </AppShell>;
}
