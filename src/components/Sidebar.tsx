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
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getClientSession, type Session } from "@/lib/session";

const NAV_ITEMS = [
  { href: "/diario", label: "Diario", icon: Coffee },
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { href: "/ingresos", label: "Ingresos", icon: Wallet },
  { href: "/gastos", label: "Gastos", icon: Receipt },
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

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-canvas">
        <PiggyBank size={18} />
      </div>
      <span className="font-display text-base font-semibold text-ink-primary">Mis Finanzas</span>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setSession(getClientSession());
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  return (
    <>
      {/* Desktop: sidebar lateral fija */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
        <div className="mb-8 px-2">
          <Brand />
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

      {/* Mobile: barra superior con botón de menú */}
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
        <Brand />
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menú"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-raised hover:text-ink-primary"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* Mobile: overlay + panel deslizante */}
      <div
        aria-hidden={!drawerOpen}
        onClick={() => setDrawerOpen(false)}
        className={clsx(
          "fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden",
          drawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85%] flex-col bg-surface px-4 py-6 shadow-xl transition-transform duration-200 ease-out lg:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-8 flex items-center justify-between px-2">
          <Brand />
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary hover:bg-surface-raised hover:text-ink-primary"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
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
    </>
  );
}
