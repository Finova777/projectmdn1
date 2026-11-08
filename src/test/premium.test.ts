import { beforeEach, describe, expect, it } from "vitest";
import { isPremium, setPremium } from "../lib/premium";

beforeEach(() => localStorage.clear());

describe("premium (simulation) flag", () => {
  it("defaults to not premium", () => {
    expect(isPremium()).toBe(false);
  });

  it("activates and persists the flag", () => {
    setPremium(true);
    expect(isPremium()).toBe(true);
    expect(localStorage.getItem("finma_premium")).toBe("1");
  });

  it("deactivates by removing the flag", () => {
    setPremium(true);
    setPremium(false);
    expect(isPremium()).toBe(false);
    expect(localStorage.getItem("finma_premium")).toBeNull();
  });

  it("dispatches an update event on change", () => {
    let fired = 0;
    const handler = () => (fired += 1);
    window.addEventListener("finma-premium-update", handler);
    setPremium(true);
    setPremium(false);
    window.removeEventListener("finma-premium-update", handler);
    expect(fired).toBe(2);
  });
});
