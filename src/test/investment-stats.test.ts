import { describe, expect, it } from "vitest";
import { INSTRUMENTS, educationStats, emptyStats, formatStatPrice, marketSchedule, summarizePrices } from "../lib/investment-stats";

describe("investment statistics", () => {
  it("includes every requested instrument", () => {
    expect(INSTRUMENTS.filter((a) => a.category === "saham").map((a) => a.id)).toEqual(["BBCA", "BBRI", "TLKM", "ASII", "GOTO", "BREN", "CUAN", "AMMN", "BMRI", "BBNI"]);
    expect(INSTRUMENTS.filter((a) => a.category === "reksadana")).toHaveLength(4);
    expect(INSTRUMENTS.filter((a) => a.category === "crypto").map((a) => a.id)).toEqual(["BTC", "ETH"]);
    expect(INSTRUMENTS.filter((a) => a.category === "emas").map((a) => a.name)).toEqual(["Emas Digital"]);
  });
  it("opens stocks at 09.00 WIB and closes at 16.00 WIB weekdays", () => {
    expect(marketSchedule("saham", new Date("2026-10-09T01:59:00Z")).open).toBe(false);
    expect(marketSchedule("saham", new Date("2026-10-09T02:00:00Z")).open).toBe(true);
    expect(marketSchedule("saham", new Date("2026-10-09T08:59:00Z")).open).toBe(true);
    expect(marketSchedule("saham", new Date("2026-10-09T09:00:00Z"))).toEqual({ open: false, label: "Tutup", next: "Buka lagi Senin 09.00 WIB" });
    expect(marketSchedule("saham", new Date("2026-10-10T03:00:00Z")).open).toBe(false);
  });
  it("crypto remains open on weekends", () => expect(marketSchedule("crypto", new Date("2026-10-10T03:00:00Z")).open).toBe(true));
  it("formats thousands with dots", () => expect(formatStatPrice(800000, "IDR")).toBe("Rp 800.000"));
  it("unavailable prices are never fabricated", () => {
    const instrument = INSTRUMENTS.find((a) => a.id === "BBCA");
    if (!instrument) throw new Error("missing instrument");
    expect(emptyStats(instrument)).toMatchObject({ price: null, month: null, year: null, history: [] });
  });
  it.each([
    ["rd-pu", 1582, 0.31, 5.2, [1580,1581,1582,1582,1583]],
    ["rd-pt", 1734, 0.45, 6.8, [1720,1725,1730,1732,1734]],
    ["rd-cp", 2105, 1.2, 8.1, [2050,2070,2090,2080,2105]],
    ["rd-sh", 1890, 2.1, 12.4, [1800,1820,1850,1870,1890]],
  ])("keeps the requested educational values for %s", (id, price, month, year, history) => {
    const stats = educationStats("reksadana").find((a) => a.id === id);
    expect(stats).toMatchObject({ price, month, year, currency: "IDR" });
    expect(stats?.history.map((point) => point.price)).toEqual(history);
  });
  it("computes monthly and yearly changes from actual historical prices", () => {
    const time = (date: string) => new Date(date).getTime() / 1000;
    const stats = summarizePrices("BBCA", "IDR", 120, time("2026-10-09"), [
      { time: time("2025-10-09"), price: 80 }, { time: time("2026-09-09"), price: 100 }, { time: time("2026-10-09"), price: 120 },
    ]);
    expect(stats.month).toBeCloseTo(20);
    expect(stats.year).toBeCloseTo(50);
    expect(stats.history).toHaveLength(2);
  });
});