import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<Variant, string> = {
  primary: "bg-brand text-canvas hover:bg-brand/90",
  secondary: "bg-surface-raised text-ink-primary hover:bg-surface-hover border border-line",
  ghost: "text-ink-secondary hover:text-ink-primary hover:bg-surface-raised",
  danger: "bg-critical/15 text-critical hover:bg-critical/25",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
