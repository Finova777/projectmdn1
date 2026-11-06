import { beforeEach, describe, expect, it } from "vitest";
import { migrateFinmaStorage } from "../lib/finma-storage";
import { clearProfile, emptyProfile, loadProfile, saveProfile } from "../lib/saku";

beforeEach(() => localStorage.clear());
describe("FINMA storage migration", () => {
  it.each(["saku_profile", "saku5-profile"])("migrates %s without losing money or allocation", (key) => {
    const profile = { ...emptyProfile(), nama: "Finma", gaji: 8000000, makan: 1200000, tabungan: 3250000, alokasi: { darurat: 10, investasi: 25, tabungan: 55, reward: 10 } };
    localStorage.setItem(key, JSON.stringify(profile));
    expect(loadProfile()).toEqual(profile);
    expect(JSON.parse(localStorage.getItem("finma_profile") ?? "null")).toEqual(profile);
    expect(JSON.parse(localStorage.getItem("finma_expenses") ?? "null").makan).toBe(1200000);
    expect(JSON.parse(localStorage.getItem("finma_allocation") ?? "null")).toEqual(profile.alokasi);
    expect(localStorage.getItem(key)).toBeNull();
  });
  it("reads the separate legacy expense and allocation values", () => {
    localStorage.setItem("saku_profile", JSON.stringify(emptyProfile()));
    localStorage.setItem("saku_expenses", JSON.stringify({ makan: 550000 }));
    localStorage.setItem("saku_allocation", JSON.stringify({ darurat: 45 }));
    expect(loadProfile()).toMatchObject({ makan: 550000, alokasi: { darurat: 45 } });
  });
  it("preserves newer FINMA values on repeated migration", () => {
    saveProfile({ ...emptyProfile(), tabungan: 900000 });
    localStorage.setItem("saku_profile", JSON.stringify({ tabungan: 10 }));
    migrateFinmaStorage(localStorage);
    migrateFinmaStorage(localStorage);
    expect(loadProfile()?.tabungan).toBe(900000);
  });
  it("keeps malformed legacy originals untouched", () => {
    localStorage.setItem("saku_profile", "{bad");
    migrateFinmaStorage(localStorage);
    expect(localStorage.getItem("saku_profile")).toBe("{bad");
    expect(localStorage.getItem("finma_profile")).toBeNull();
  });
  it("synchronizes saves and does not resurrect a reset legacy profile", () => {
    localStorage.setItem("saku5-profile", JSON.stringify(emptyProfile()));
    saveProfile({ ...emptyProfile(), makan: 700000, alokasi: { ...emptyProfile().alokasi, reward: 15 } });
    expect(loadProfile()).toMatchObject({ makan: 700000, alokasi: { reward: 15 } });
    clearProfile();
    expect(loadProfile()).toBeNull();
    expect(localStorage.getItem("finma_expenses")).toBeNull();
    expect(localStorage.getItem("finma_allocation")).toBeNull();
  });
});