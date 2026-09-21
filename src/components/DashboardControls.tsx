"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Currency } from "@/lib/types";
import { monthLabel } from "@/lib/format";
import { Select } from "./ui/Field";

export function DashboardControls({
  year,
  month,
  currency,
  currencies,
}: {
  year: number;
  month: number;
  currency: string;
  currencies: Currency[];
}) {
  const router = useRouter();

  function go(newYear: number, newMonth: number, newCurrency: string) {
    router.push(`/dashboard?year=${newYear}&month=${newMonth}&currency=${newCurrency}`);
  }

  function shiftMonth(delta: number) {
    const date = new Date(year, month - 1 + delta, 1);
    go(date.getFullYear(), date.getMonth() + 1, currency);
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 rounded-lg border border-line bg-surface px-1 py-1">
        <button
          onClick={() => shiftMonth(-1)}
          aria-label="Mes anterior"
          className="rounded-md p-1.5 text-ink-secondary hover:bg-surface-raised hover:text-ink-primary"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="min-w-[90px] text-center text-sm font-medium text-ink-primary">
          {monthLabel(month)} {year}
        </span>
        <button
          onClick={() => shiftMonth(1)}
          aria-label="Mes siguiente"
          className="rounded-md p-1.5 text-ink-secondary hover:bg-surface-raised hover:text-ink-primary"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <Select
        value={currency}
        onChange={(e) => go(year, month, e.target.value)}
        className="w-auto"
      >
        {currencies.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code}
          </option>
        ))}
      </Select>
    </div>
  );
}
