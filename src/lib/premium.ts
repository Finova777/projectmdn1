import { useEffect, useState } from "react";

// Premium is a SIMULATION (no real payment). The flag lives in browser storage
// only; activating it removes the open-app ad and lifts the Chat AI message
// limit. Kept SSR-safe: every access is guarded for a missing window/storage.

const KEY = "finma_premium";
const EVENT = "finma-premium-update";

export function isPremium(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setPremium(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* storage unavailable — ignore */
  }
}

/** Reactive premium state. `ready` is false until the first client read, so the
 *  UI can avoid a flash before storage is known. */
export function usePremium() {
  const [premium, setPremiumState] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => {
      setPremiumState(isPremium());
      setReady(true);
    };
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return {
    premium,
    ready,
    activate: () => setPremium(true),
    deactivate: () => setPremium(false),
  };
}
