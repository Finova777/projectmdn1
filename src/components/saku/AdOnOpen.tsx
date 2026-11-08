import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePremium } from "@/lib/premium";

// A simulated in-app promo shown once per browser session when the app opens.
// It is a house ad for EASY FINMA Premium (no third-party ad network), so it
// never impersonates another brand. Premium users never see it. Browser-only.
const SESSION_KEY = "finma_ad_shown";
const SKIP_SECONDS = 5;

export function AdOnOpen() {
  const { premium, ready } = usePremium();
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(SKIP_SECONDS);

  useEffect(() => {
    if (!ready || premium) return;
    let alreadyShown = false;
    try {
      alreadyShown = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      alreadyShown = false;
    }
    if (alreadyShown) return;
    setOpen(true);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
  }, [ready, premium]);

  useEffect(() => {
    if (!open || left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [open, left]);

  if (!open) return null;
  const canClose = left <= 0;
  const close = () => canClose && setOpen(false);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-card shadow-float">
        <button
          aria-label={canClose ? "Tutup iklan" : `Lewati dalam ${left} detik`}
          disabled={!canClose}
          onClick={close}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white disabled:cursor-not-allowed"
        >
          {canClose ? <X className="h-4 w-4" /> : <span className="text-xs font-bold">{left}</span>}
        </button>

        <div className="bg-ink p-6 text-center text-ink-foreground">
          <span className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-reward-soft text-warning">
            <Crown className="h-7 w-7" />
          </span>
          <p className="text-[10px] uppercase tracking-widest text-ink-muted">Iklan</p>
          <h2 className="mt-1 text-xl font-extrabold">EASY FINMA Premium</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Tanpa iklan, Chat AI tanpa batas, dan fitur keuangan lebih lengkap.
          </p>
        </div>

        <div className="p-4">
          <Button asChild className="w-full rounded-xl" onClick={() => setOpen(false)}>
            <Link to="/profil">
              <Sparkles className="mr-1 h-4 w-4" /> Coba Premium (simulasi)
            </Link>
          </Button>
          <button
            onClick={close}
            disabled={!canClose}
            className="mt-2 w-full text-xs text-muted-foreground disabled:opacity-60"
          >
            {canClose ? "Lewati iklan" : `Lewati dalam ${left} detik…`}
          </button>
        </div>
      </div>
    </div>
  );
}
