import { useEffect, useState } from "react";
import { migrateFinmaStorage, readStoredObject } from "@/lib/finma-storage";

export type Job = "mahasiswa" | "kantoran" | "pedagang" | "buruh" | "guru" | "freelancer";
export const JOBS: { v: Job; l: string }[] = [
  { v: "mahasiswa", l: "Pelajar/Mahasiswa" },
  { v: "kantoran", l: "Pekerja Kantoran" },
  { v: "pedagang", l: "Pedagang/Pebisnis" },
  { v: "buruh", l: "Buruh" },
  { v: "guru", l: "Guru/Pengajar" },
  { v: "freelancer", l: "Freelancer" },
];
export const isStudent = (j: Job) => j === "mahasiswa";
export const incomeLabel = (j: Job) => (isStudent(j) ? "Uang Saku / Pendapatan Bersih (di luar UKT)" : "Gaji / Pendapatan Bersih per bulan");
export const jobLabel = (j: Job) => JOBS.find((x) => x.v === j)?.l ?? j;

export type InsKey = "kesehatan" | "kendaraan" | "properti" | "lainnya";
export type Vehicle = "tidak" | "motor" | "mobil";
export type PocketKey = "darurat" | "tabungan" | "investasi" | "reward";

export interface Profile {
  nama: string;
  umur: number;
  gaji: number;
  pekerjaan: Job;
  tinggal: number;
  utilitas: number;
  makan: number;
  cicilan: number;
  transport: number;
  aset: number;
  tabungan: number;
  kendaraan: Vehicle;
  pajak: number;
  asuransi: Record<InsKey, { aktif: boolean; jenis: string; premi: number }>;
  alokasi: Record<PocketKey, number>;
  portfolio: { reksadana: number; saham: number; crypto: number; emas: number };
}

export const POCKETS: { key: PocketKey; label: string; color: string; soft: string; desc: string }[] = [
  { key: "darurat", label: "Dana Darurat", color: "var(--darurat)", soft: "var(--darurat-soft)", desc: "Cadangan 3-6x pengeluaran" },
  { key: "investasi", label: "Investasi", color: "var(--investasi)", soft: "var(--investasi-soft)", desc: "Tumbuh untuk masa depan" },
  { key: "tabungan", label: "Tabungan", color: "var(--tabungan)", soft: "var(--tabungan-soft)", desc: "Tujuan jangka pendek" },
  { key: "reward", label: "Self Reward", color: "var(--reward)", soft: "var(--reward-soft)", desc: "Hadiah untuk dirimu" },
];

export const DEFAULT_ALOKASI: Record<PocketKey, number> = { darurat: 30, investasi: 30, tabungan: 30, reward: 10 };

export const emptyProfile = (): Profile => ({
  nama: "",
  umur: 0,
  gaji: 0,
  pekerjaan: "kantoran",
  tinggal: 0,
  utilitas: 0,
  makan: 0,
  cicilan: 0,
  transport: 0,
  aset: 0,
  tabungan: 0,
  kendaraan: "tidak",
  pajak: 0,
  asuransi: {
    kesehatan: { aktif: false, jenis: "BPJS", premi: 0 },
    kendaraan: { aktif: false, jenis: "", premi: 0 },
    properti: { aktif: false, jenis: "", premi: 0 },
    lainnya: { aktif: false, jenis: "", premi: 0 },
  },
  alokasi: { ...DEFAULT_ALOKASI },
  portfolio: { reksadana: 0, saham: 0, crypto: 0, emas: 0 },
});

export function sortir(p: Profile) {
  const premi = (Object.values(p.asuransi) as { aktif: boolean; premi: number }[]).reduce(
    (a, x) => a + (x.aktif ? x.premi : 0),
    0,
  );
  // Fixed (locked after onboarding): housing, utilities, installments, yearly tax ÷ 12.
  const tetap = p.tinggal + p.utilitas + p.cicilan + p.pajak / 12;
  // Variable (freely editable on dashboard): food, transport.
  const tidakTetap = p.makan + p.transport;
  const sisa = Math.max(0, p.gaji - tetap - tidakTetap - premi);
  const ratio = p.gaji > 0 ? sisa / p.gaji : 0;
  const status = ratio >= 0.3 ? "Aman" : ratio >= 0.1 ? "Waspada" : "Bahaya";
  return { pendapatan: p.gaji, tetap, tidakTetap, lainnya: premi, sisa, status };
}

export const rp = (n: number) => (n < 0 ? "-" : "") + "Rp " + Math.round(Math.abs(n)).toLocaleString("id-ID");
export const short = (n: number) => {
  const a = Math.abs(n);
  const s = n < 0 ? "-" : "";
  if (a >= 1e9) return s + (a / 1e9).toFixed(1).replace(/\.0$/, "") + " M";
  if (a >= 1e6) return s + (a / 1e6).toFixed(1).replace(/\.0$/, "") + " jt";
  if (a >= 1e3) return s + Math.round(a / 1e3) + " rb";
  return s + Math.round(a);
};

/** Living costs are already part of expenses, so a legacy "hidup" share moves into Tabungan. */
export function toPockets(raw: Record<string, unknown> | undefined): Record<PocketKey, number> {
  const out = { ...DEFAULT_ALOKASI };
  if (!raw) return out;
  for (const { key } of POCKETS) {
    const v = raw[key];
    if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
  }
  const h = raw.hidup;
  if (typeof h === "number" && Number.isFinite(h) && h > 0) out.tabungan = Math.round((out.tabungan + h) * 10) / 10;
  return out;
}

const KEY = "finma_profile";
const EXPENSE_FIELDS = ["tinggal", "utilitas", "makan", "cicilan", "transport", "pajak"] as const;
export function loadProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    migrateFinmaStorage(localStorage);
    const raw = readStoredObject(localStorage, KEY);
    if (!raw) return null;
    const profile = { ...emptyProfile(), ...raw } as Profile;
    const expenses = readStoredObject(localStorage, "finma_expenses");
    for (const field of EXPENSE_FIELDS) {
      const value = expenses?.[field];
      if (typeof value === "number" && Number.isFinite(value)) profile[field] = value;
    }
    const allocation = readStoredObject(localStorage, "finma_allocation");
    profile.alokasi = toPockets(profile.alokasi);
    if (allocation) profile.alokasi = toPockets(allocation);
    // Populate the new slices for the existing combined legacy profile.
    if (!expenses) localStorage.setItem("finma_expenses", JSON.stringify(Object.fromEntries(EXPENSE_FIELDS.map((key) => [key, profile[key]]))));
    if (!allocation || "hidup" in allocation) localStorage.setItem("finma_allocation", JSON.stringify(profile.alokasi));
    localStorage.setItem(KEY, JSON.stringify(profile));
    return profile;
  } catch {
    return null;
  }
}
export function saveProfile(p: Profile) {
  migrateFinmaStorage(localStorage);
  localStorage.setItem(KEY, JSON.stringify(p));
  localStorage.setItem("finma_expenses", JSON.stringify(Object.fromEntries(EXPENSE_FIELDS.map((key) => [key, p[key]]))));
  localStorage.setItem("finma_allocation", JSON.stringify(p.alokasi));
  window.dispatchEvent(new Event("saku-update"));
}
export function clearProfile() {
  migrateFinmaStorage(localStorage);
  localStorage.removeItem(KEY);
  localStorage.removeItem("finma_expenses");
  localStorage.removeItem("finma_allocation");
  window.dispatchEvent(new Event("saku-update"));
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const f = () => {
      setProfile(loadProfile());
      setReady(true);
    };
    f();
    window.addEventListener("saku-update", f);
    return () => window.removeEventListener("saku-update", f);
  }, []);
  return { profile, ready, save: saveProfile };
}
