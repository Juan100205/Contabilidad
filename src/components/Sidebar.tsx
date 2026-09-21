"use client";

import { clsx } from "clsx";
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  CreditCard,
  PiggyBank,
  Coffee,
  CalendarDays,
  Scale,
  Settings,
  Bot,
  Gift,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getClientSession, type Session } from "@/lib/session";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/ingresos", label: "Ingresos", icon: Wallet },
  { href: "/gastos", label: "Gastos", icon: Receipt },
  { href: "/diario", label: "Diario", icon: Coffee },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/deudas", label: "Deudas", icon: CreditCard },
  { href: "/ahorros", label: "Bolsillos", icon: PiggyBank },
  { href: "/deseos", label: "Deseos", icon: Gift },
  { href: "/saldos", label: "Saldos", icon: Scale },
  { href: "/asistente", label: "Jarvis", icon: Bot },
  { href: "/configuracion", label: "Ajustes", icon: Settings },
];

function handleLogout() {
  clearSession();
  window.location.href = "/login";
}

export function Sidebar() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    setSession(getClientSession());
  }, []);

  return (
    <>
      {/* Desktop: sidebar lateral fija */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-canvas">
            <PiggyBank size={18} />
          </div>
          <span className="font-display text-base font-semibold text-ink-primary">
            Mis Finanzas
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-soft text-brand"
                    : "text-ink-secondary hover:bg-surface-raised hover:text-ink-primary",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {session && (
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-line px-2 pt-4">
            <span className="truncate text-sm font-medium text-ink-secondary">{session.displayName}</span>
            <button
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="text-ink-muted hover:text-critical"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>

      {/* Mobile: barra inferior fija */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface lg:hidden">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium",
                active ? "text-brand" : "text-ink-secondary",
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
