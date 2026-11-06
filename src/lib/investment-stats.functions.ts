import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { INSTRUMENTS, emptyStats, summarizePrices, type InstrumentStats, type PricePoint } from "@/lib/investment-stats";

interface YahooChart {
  chart?: { result?: { meta?: { regularMarketPrice?: number; regularMarketTime?: number; currency?: string }; timestamp?: number[]; indicators?: { quote?: { close?: (number | null)[] }[] } }[] };
}

interface YahooSeries { price: number; updatedAt: number; currency: string; points: PricePoint[] }

// Troy ounce to gram — global gold spot (XAU) is quoted per troy ounce.
const GRAMS_PER_TROY_OUNCE = 31.1034768;
const GOLD_SPOT_SYMBOL = "XAUUSD=X"; // USD per troy ounce
const USD_IDR_SYMBOL = "IDR=X"; // Rupiah per 1 USD

// Public market data only. Symbols are selected from the fixed catalog, never caller-supplied URLs.
async function fetchYahooSeries(symbol: string): Promise<YahooSeries | null> {
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2y&interval=1d`, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const result = (await response.json() as YahooChart).chart?.result?.[0];
    const price = result?.meta?.regularMarketPrice;
    const updatedAt = result?.meta?.regularMarketTime;
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0 || typeof updatedAt !== "number") return null;
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    const points: PricePoint[] = (result?.timestamp ?? []).flatMap((time, index) => {
      const close = closes[index];
      return typeof close === "number" && Number.isFinite(close) && close > 0 && Number.isFinite(time) ? [{ time, price: close }] : [];
    }).sort((a, b) => a.time - b.time);
    return { price, updatedAt, currency: result?.meta?.currency ?? "USD", points };
  } catch { return null; }
}

// Digital gold (Rp/gram) tracks global spot: gold (USD/oz) × USD→IDR ÷ grams-per-ounce.
async function getDigitalGold(): Promise<InstrumentStats[]> {
  const instrument = INSTRUMENTS.find((a) => a.id === "emas-digital");
  const fallback = instrument ? emptyStats(instrument) : null;
  if (!instrument || !fallback) return fallback ? [fallback] : [];
  const [gold, fx] = await Promise.all([fetchYahooSeries(GOLD_SPOT_SYMBOL), fetchYahooSeries(USD_IDR_SYMBOL)]);
  if (!gold || !fx) return [fallback];
  // Rupiah per USD on (or just before) a given timestamp, so each historical gold point uses the rate of its day.
  const rateAt = (time: number) => {
    let rate = fx.price;
    for (const point of fx.points) { if (point.time <= time) rate = point.price; else break; }
    return rate;
  };
  const perGram = (usdPerOunce: number, rate: number) => (usdPerOunce * rate) / GRAMS_PER_TROY_OUNCE;
  const points = gold.points.map((point) => ({ time: point.time, price: perGram(point.price, rateAt(point.time)) }));
  return [summarizePrices(instrument.id, "IDR", perGram(gold.price, fx.price), gold.updatedAt, points)];
}

export const getInvestmentStats = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ category: z.enum(["reksadana", "saham", "crypto", "emas"]) }).parse(input))
  .handler(async ({ data }): Promise<InstrumentStats[]> => {
    if (data.category === "emas") return getDigitalGold();
    const instruments = INSTRUMENTS.filter((a) => a.category === data.category);
    return Promise.all(instruments.map(async (instrument) => {
      const fallback = emptyStats(instrument);
      if (!instrument.symbol) return fallback;
      const series = await fetchYahooSeries(instrument.symbol);
      return series ? summarizePrices(instrument.id, series.currency, series.price, series.updatedAt, series.points) : fallback;
    }));
  });
