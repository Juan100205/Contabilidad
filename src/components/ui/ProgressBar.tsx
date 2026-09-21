import { clsx } from "clsx";

export function ProgressBar({
  value,
  colorClassName = "bg-brand",
}: {
  value: number;
  colorClassName?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full rounded-full bg-surface-raised">
      <div
        className={clsx("h-2 rounded-full transition-all", colorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
