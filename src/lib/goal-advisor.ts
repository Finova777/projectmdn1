import type { PocketKey } from "@/lib/saku";

export const ADVISOR_KEYS: PocketKey[] = ["darurat", "investasi", "tabungan", "reward"];

/** Round every pocket to a whole percent and force the total to exactly 100. */
export function normalizeSplit(raw: Partial<Record<PocketKey, number>>): Record<PocketKey, number> {
  const vals = ADVISOR_KEYS.map((k) => Math.max(0, Number.isFinite(raw[k]) ? Number(raw[k]) : 0));
  const total = vals.reduce((a, b) => a + b, 0);
  const pct = total > 0 ? vals.map((v) => Math.round((v / total) * 100)) : [30, 30, 30, 10];
  const diff = 100 - pct.reduce((a, b) => a + b, 0);
  const big = pct.indexOf(Math.max(...pct));
  pct[big] = (pct[big] ?? 0) + diff;
  return Object.fromEntries(ADVISOR_KEYS.map((k, i) => [k, pct[i]])) as Record<PocketKey, number>;
}
