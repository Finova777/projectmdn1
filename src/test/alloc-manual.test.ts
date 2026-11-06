import { describe, it, expect } from "vitest";
import { setPocket, allocStatus, splitEven } from "@/components/saku/AllocationEditor";
const base = { darurat: 0, tabungan: 60, investasi: 20, reward: 20 };
describe("manual allocation", () => {
  it("raises a pocket from 0 without touching others", () => {
    expect(setPocket(base, "darurat", 15)).toEqual({ ...base, darurat: 15 });
  });
  it("flags over 100% as melebihi", () => {
    expect(allocStatus(setPocket(base, "darurat", 15), 1_000_000).over).toBe(true);
  });
  it("reports sisa when under 100%", () => {
    const s = allocStatus(setPocket(base, "tabungan", 50), 1_000_000);
    expect(s.sisaPct).toBe(10); expect(s.sisaRp).toBe(100_000);
  });
  it("bagi rata gives 30/30/30/10 totaling 100%", () => {
    expect(splitEven()).toEqual({ darurat: 30, investasi: 30, tabungan: 30, reward: 10 });
    expect(allocStatus(splitEven(), 100).pct).toBe(100);
  });
});

import { toPockets } from "@/lib/saku";
describe("no living-cost pocket", () => {
  it("moves a saved hidup share into tabungan", () => {
    expect(toPockets({ darurat: 20, investasi: 20, tabungan: 20, hidup: 30, reward: 10 })).toEqual({ darurat: 20, investasi: 20, tabungan: 50, reward: 10 });
  });
});
import { normalizeSplit } from "@/lib/goal-advisor";
describe("AI split normalization", () => {
  it("scales to exactly 100 whole percent", () => {
    const r = normalizeSplit({ darurat: 1, investasi: 1, tabungan: 1, reward: 0 });
    expect(r.darurat + r.investasi + r.tabungan + r.reward).toBe(100);
    expect(r.reward).toBe(0);
  });
});
