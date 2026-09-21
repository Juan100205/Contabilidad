import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-card border border-line bg-surface p-4 sm:p-5",
        className,
      )}
      {...props}
    />
  );
}
