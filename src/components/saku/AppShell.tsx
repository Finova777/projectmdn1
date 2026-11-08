import { Link } from "@tanstack/react-router";
import { Home, PieChart, TrendingUp, ShieldCheck, User } from "lucide-react";
import type { ReactNode } from "react";
import { AdOnOpen } from "@/components/saku/AdOnOpen";
import { ChatAI } from "@/components/saku/ChatAI";

const NAV = [
  { to: "/", label: "Beranda", icon: Home },
  { to: "/alokasi", label: "Alokasi", icon: PieChart },
  { to: "/investasi", label: "Investasi", icon: TrendingUp },
  { to: "/asuransi", label: "Asuransi", icon: ShieldCheck },
  { to: "/profil", label: "Profil", icon: User },
] as const;

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="min-h-screen bg-background">
      <AdOnOpen />
      <ChatAI />
      <main className="mx-auto max-w-md px-4 pb-32 pt-6">
        {title && <h1 className="mb-4 text-2xl font-extrabold tracking-tight">{title}</h1>}
        {children}
        <footer className="mt-8 text-center text-[11px] text-muted-foreground">© 2026 EASY FINMA - Financial Management</footer>
      </main>
      <nav className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-2xl border border-border bg-card shadow-float">
        <ul className="grid grid-cols-5">
          {NAV.map((n) => (
            <li key={n.to}>
              <Link
                to={n.to}
                activeOptions={{ exact: true }}
                className="flex flex-col items-center gap-1 py-3 text-[11px] font-semibold text-muted-foreground transition-colors"
                activeProps={{ className: "text-foreground" }}
              >
                <n.icon className="h-5 w-5" />
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-4 ${className}`}>{children}</div>;
}

export function Loading() {
  return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Memuat…</div>;
}
