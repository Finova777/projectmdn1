export type InvestmentCategory = "reksadana" | "saham" | "crypto" | "emas";
export const INVESTMENT_TABS: { key: InvestmentCategory; label: string }[] = [
  { key: "reksadana", label: "Reksadana" }, { key: "saham", label: "Saham" },
  { key: "crypto", label: "Kripto" }, { key: "emas", label: "Emas" },
];
export interface Instrument { id: string; name: string; category: InvestmentCategory; symbol?: string; detail: string }
export const INSTRUMENTS: Instrument[] = [
  { id: "rd-pu", name: "Reksadana Pasar Uang", category: "reksadana", detail: "Risiko rendah · Bibit / Bareksa" },
  { id: "rd-pt", name: "Reksadana Pendapatan Tetap", category: "reksadana", detail: "Risiko sedang · Bibit / Bareksa" },
  { id: "rd-cp", name: "Reksadana Campuran", category: "reksadana", detail: "Risiko Sedang-Tinggi · Bibit / Bareksa" },
  { id: "rd-sh", name: "Reksadana Saham", category: "reksadana", detail: "Risiko Tinggi · Bibit / Bareksa" },
  ...["BBCA", "BBRI", "TLKM", "ASII", "GOTO", "BREN", "CUAN", "AMMN", "BMRI", "BBNI"].map((id) => ({ id, name: id, category: "saham" as const, symbol: `${id}.JK`, detail: "Bursa Efek Indonesia · IDR / lembar" })),
  { id: "BTC", name: "BTC · Bitcoin", category: "crypto", symbol: "BTC-USD", detail: "Kripto · USD · volatilitas tinggi" },
  { id: "ETH", name: "ETH · Ethereum", category: "crypto", symbol: "ETH-USD", detail: "Kripto · USD · volatilitas tinggi" },
  { id: "emas-digital", name: "Emas Digital", category: "emas", detail: "Emas digital · IDR / gram · harga live" },
];
export interface PricePoint { time: number; price: number }
export interface InstrumentStats {
  id: string; price: number | null; currency: string; month: number | null; year: number | null;
  history: PricePoint[]; updatedAt: number | null; error: string | null;
}
// Fixed education examples, independent of the simulation game's trading state.
export const EDUCATION_STATS: InstrumentStats[] = [
  { id: "rd-pu", price: 1582, month: 0.31, year: 5.2, values: [1580,1581,1582,1582,1583] },
  { id: "rd-pt", price: 1734, month: 0.45, year: 6.8, values: [1720,1725,1730,1732,1734] },
  { id: "rd-cp", price: 2105, month: 1.2, year: 8.1, values: [2050,2070,2090,2080,2105] },
  { id: "rd-sh", price: 1890, month: 2.1, year: 12.4, values: [1800,1820,1850,1870,1890] },
].map(({ values, ...stats }) => ({ ...stats, currency: "IDR", history: values.map((price, time) => ({ time, price })), updatedAt: null, error: null }));
export const isEducationCategory = (category: InvestmentCategory) => category === "reksadana";
export const educationStats = (category: InvestmentCategory) => EDUCATION_STATS.filter((stats) => INSTRUMENTS.some((instrument) => instrument.id === stats.id && instrument.category === category));
export function emptyStats(instrument: Instrument): InstrumentStats {
  const example = EDUCATION_STATS.find((stats) => stats.id === instrument.id);
  if (example) return example;
  return { id: instrument.id, price: null, currency: instrument.category === "crypto" ? "USD" : "IDR", month: null, year: null, history: [], updatedAt: null,
    error: "Sumber harga sedang tidak tersedia." };
}
export function marketSchedule(category: InvestmentCategory, now: Date) {
  if (category === "crypto") return { open: true, label: "Buka · 24/7", next: "" };
  if (category === "emas") return { open: true, label: "Live · Emas global", next: "" };
  if (category !== "saham") return { open: false, label: "Pembaruan harian", next: "" };
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const day = wib.getUTCDay();
  const minute = wib.getUTCHours() * 60 + wib.getUTCMinutes();
  if (day >= 1 && day <= 5 && minute >= 540 && minute < 960) return { open: true, label: "Pasar Buka", next: "" };
  const next = new Date(wib);
  if (day === 0 || day === 6 || minute >= 960) next.setUTCDate(next.getUTCDate() + 1);
  while (next.getUTCDay() === 0 || next.getUTCDay() === 6) next.setUTCDate(next.getUTCDate() + 1);
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return { open: false, label: "Tutup", next: `Buka lagi ${days[next.getUTCDay()]} 09.00 WIB` };
}
export function refreshInterval(category: InvestmentCategory, now: Date) {
  return category === "crypto" || category === "emas" || (category === "saham" && marketSchedule(category, now).open) ? 60_000 : false;
}
export function changeSince(points: PricePoint[], price: number, target: number): number | null {
  const previous = points.filter((p) => p.time <= target).at(-1);
  return previous && previous.price > 0 ? (price / previous.price - 1) * 100 : null;
}
export function summarizePrices(id: string, currency: string, price: number, updatedAt: number, points: PricePoint[]): InstrumentStats {
  const month = new Date(updatedAt * 1000);
  // Clamp month-end to the last day of the preceding calendar month.
  const day = month.getUTCDate();
  month.setUTCDate(1); month.setUTCMonth(month.getUTCMonth() - 1);
  const lastDay = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
  month.setUTCDate(Math.min(day, lastDay));
  const year = new Date(updatedAt * 1000); year.setUTCFullYear(year.getUTCFullYear() - 1);
  return { id, currency, price, updatedAt, month: changeSince(points, price, month.getTime() / 1000), year: changeSince(points, price, year.getTime() / 1000), history: points.filter((p) => p.time >= month.getTime() / 1000), error: null };
}
export const formatStatPrice = (price: number | null, currency: string) => price === null ? "—" : `${currency === "USD" ? "$ " : "Rp "}${price.toLocaleString("id-ID", { maximumFractionDigits: currency === "USD" ? 2 : 0 })}`;
export const formatChange = (value: number | null) => value === null ? "—" : `${value >= 0 ? "+" : ""}${value.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;