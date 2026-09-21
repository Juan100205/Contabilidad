"use client";

import { Input } from "@/components/ui/Field";
import { evaluateExpression } from "@/lib/calc";

type AmountCalcInputProps = {
  value: string;
  onChange: (value: string) => void;
  currencyCode?: string;
  required?: boolean;
  disabled?: boolean;
};

/**
 * Campo de monto tipo calculadora: acepta un número normal o una expresión
 * como "12000+8000*3" y muestra el resultado calculado debajo. El valor
 * crudo se evalúa recién al guardar (ver evaluateExpression).
 */
export function AmountCalcInput({ value, onChange, currencyCode, required, disabled }: AmountCalcInputProps) {
  const result = evaluateExpression(value);
  const hasOperator = /[+\-*/]/.test(value.trim().slice(1));

  return (
    <div>
      <Input
        required={required}
        disabled={disabled}
        type="text"
        inputMode="decimal"
        placeholder="Ej: 12000+8000*3"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hasOperator && (
        <p className="mt-1 text-xs text-ink-secondary">
          {result === null ? (
            <span className="text-critical">Expresión inválida</span>
          ) : (
            <>
              = {result.toLocaleString("es-CO")} {currencyCode ?? ""}
            </>
          )}
        </p>
      )}
    </div>
  );
}
