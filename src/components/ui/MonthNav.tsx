"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthLabel } from "@/lib/format";

export function MonthNav({
  year,
  month,
  onChange,
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}) {
  function shift(delta: number) {
    const date = new Date(year, month - 1 + delta, 1);
    onChange(date.getFullYear(), date.getMonth() + 1);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-line bg-surface px-1 py-1">
      <button
        onClick={() => shift(-1)}
        aria-label="Mes anterior"
        className="rounded-md p-1.5 text-ink-secondary hover:bg-surface-raised hover:text-ink-primary"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-[90px] text-center text-sm font-medium text-ink-primary">
        {monthLabel(month)} {year}
      </span>
      <button
        onClick={() => shift(1)}
        aria-label="Mes siguiente"
        className="rounded-md p-1.5 text-ink-secondary hover:bg-surface-raised hover:text-ink-primary"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
