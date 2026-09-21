import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import { Card } from "./ui/Card";

export function KpiCard({
  label,
  value,
  fullValue,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  fullValue?: string;
  icon: LucideIcon;
  tone?: "neutral" | "good" | "critical";
}) {
  const toneClass =
    tone === "good" ? "text-good" : tone === "critical" ? "text-critical" : "text-brand";

  return (
    <Card className="flex items-center gap-3 sm:gap-4">
      <div className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-raised sm:h-11 sm:w-11", toneClass)}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-ink-secondary">{label}</p>
        <p
          title={fullValue}
          className="tabular-money truncate font-display text-base font-bold text-ink-primary sm:text-xl"
        >
          {value}
        </p>
      </div>
    </Card>
  );
}
