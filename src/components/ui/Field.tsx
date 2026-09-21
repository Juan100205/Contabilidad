import { clsx } from "clsx";
import type { LabelHTMLAttributes, SelectHTMLAttributes, InputHTMLAttributes } from "react";

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className="mb-1 block text-xs font-medium text-ink-secondary" {...props} />;
}

const fieldClass =
  "rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-primary outline-none focus:border-brand";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(fieldClass, className ?? "w-full")} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx(fieldClass, className ?? "w-full")} {...props} />;
}

export function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="mb-3">{children}</div>;
}
