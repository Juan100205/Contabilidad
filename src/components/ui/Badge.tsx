import { clsx } from "clsx";

type Tone = "good" | "warning" | "critical" | "neutral";

const toneClasses: Record<Tone, string> = {
  good: "bg-good/15 text-good",
  warning: "bg-warning/15 text-warning",
  critical: "bg-critical/15 text-critical",
  neutral: "bg-surface-raised text-ink-secondary",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
