"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldGroup, Select } from "@/components/ui/Field";
import { api } from "@/lib/api";
import { monthLabel } from "@/lib/format";
import type { Currency, ExchangeRate, PeriodSettings } from "@/lib/types";

const emptyForm = { fromCurrencyCode: "", toCurrencyCode: "", rate: "" };

/** Mismo cálculo que el backend (PeriodCalculator): el periodo toma el nombre del mes en que empieza. */
function periodContaining(date: Date, startDay: number) {
  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const clampedThisMonth = Math.min(startDay, daysInMonth(date.getFullYear(), date.getMonth()));

  let start: Date;
  if (date.getDate() >= clampedThisMonth) {
    start = new Date(date.getFullYear(), date.getMonth(), clampedThisMonth);
  } else {
    const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    const clampedPrev = Math.min(startDay, daysInMonth(prevMonth.getFullYear(), prevMonth.getMonth()));
    start = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), clampedPrev);
  }
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(end.getDate() - 1);
  return { start, end };
}

function shortDate(d: Date) {
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

export default function ConfiguracionPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [periodStartDay, setPeriodStartDay] = useState(15);
  const [periodDraft, setPeriodDraft] = useState("15");
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [periodLoading, setPeriodLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [currs, r] = await Promise.all([
        api.get<Currency[]>("/api/currencies"),
        api.get<ExchangeRate[]>("/api/currencies/exchange-rates"),
      ]);
      setCurrencies(currs);
      setRates(r);
      if (currs.length >= 2) {
        setForm((f) => ({
          ...f,
          fromCurrencyCode: f.fromCurrencyCode || currs[1].code,
          toCurrencyCode: f.toCurrencyCode || currs[0].code,
        }));
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadPeriod() {
    setPeriodLoading(true);
    try {
      const settings = await api.get<PeriodSettings>("/api/settings/period");
      setPeriodStartDay(settings.periodStartDay);
      setPeriodDraft(String(settings.periodStartDay));
    } finally {
      setPeriodLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadPeriod();
  }, []);

  async function handleSavePeriod(e: FormEvent) {
    e.preventDefault();
    const day = Number(periodDraft);
    if (!Number.isInteger(day) || day < 1 || day > 28) {
      alert("El día de inicio debe ser un número entre 1 y 28.");
      return;
    }
    setSavingPeriod(true);
    try {
      const settings = await api.put<PeriodSettings>("/api/settings/period", { periodStartDay: day });
      setPeriodStartDay(settings.periodStartDay);
      setPeriodDraft(String(settings.periodStartDay));
    } catch {
      alert("No se pudo guardar el periodo.");
    } finally {
      setSavingPeriod(false);
    }
  }

  const previewDay = Number(periodDraft) || periodStartDay;
  const preview = periodContaining(new Date(), previewDay);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/currencies/exchange-rates", {
        fromCurrencyCode: form.fromCurrencyCode,
        toCurrencyCode: form.toCurrencyCode,
        rate: Number(form.rate),
      });
      setForm({ ...form, rate: "" });
      await load();
    } catch {
      alert("No se pudo guardar la tasa de cambio.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta tasa de cambio?")) return;
    await api.delete(`/api/currencies/exchange-rates/${id}`);
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-primary">Ajustes</h1>
        <p className="text-sm text-ink-secondary">Periodos, monedas y tasas de cambio manuales.</p>
      </div>

      <Card>
        <h2 className="mb-1 font-display text-base font-semibold text-ink-primary">Periodos</h2>
        <p className="mb-4 text-xs text-ink-secondary">
          Define en qué día empieza cada periodo (por defecto el 15). Todo lo que organizamos por
          mes —Gastos, Deudas, Bolsillos, Saldos y el Resumen— usa este mismo rango de fechas en
          vez del mes calendario. El periodo toma el nombre del mes en que empieza.
        </p>

        {periodLoading ? (
          <p className="py-2 text-sm text-ink-muted">Cargando...</p>
        ) : (
          <form onSubmit={handleSavePeriod} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <FieldGroup>
              <Label>Día de inicio del periodo</Label>
              <Input
                required
                type="number"
                min="1"
                max="28"
                value={periodDraft}
                onChange={(e) => setPeriodDraft(e.target.value)}
                className="w-28"
              />
            </FieldGroup>
            <Button type="submit" disabled={savingPeriod} className="mb-3 sm:mb-0">
              {savingPeriod ? "Guardando..." : "Guardar"}
            </Button>
          </form>
        )}

        <p className="mt-3 text-xs text-ink-secondary">
          Ejemplo — el periodo actual (&ldquo;{monthLabel(preview.start.getMonth() + 1)} {preview.start.getFullYear()}&rdquo;) va del{" "}
          <span className="font-medium text-ink-primary">{shortDate(preview.start)}</span> al{" "}
          <span className="font-medium text-ink-primary">{shortDate(preview.end)}</span>.
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-base font-semibold text-ink-primary">Monedas disponibles</h2>
        <ul className="flex flex-wrap gap-2">
          {currencies.map((c) => (
            <li
              key={c.code}
              className="rounded-full border border-line bg-surface-raised px-3 py-1 text-sm text-ink-secondary"
            >
              {c.symbol} {c.code} — {c.name}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-1 font-display text-base font-semibold text-ink-primary">
          Tasas de cambio manuales
        </h2>
        <p className="mb-4 text-xs text-ink-secondary">
          Se usan para consolidar los totales del dashboard cuando tienes montos en distintas
          monedas. No hay integración a un proveedor de FX en tiempo real: tú decides la tasa.
        </p>

        {loading ? (
          <p className="py-4 text-center text-sm text-ink-muted">Cargando...</p>
        ) : rates.length > 0 ? (
          <ul className="mb-4 divide-y divide-line">
            {rates.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink-primary">
                  1 {r.fromCurrencyCode} = {r.rate} {r.toCurrencyCode}
                </span>
                <button
                  onClick={() => handleDelete(r.id)}
                  aria-label="Eliminar"
                  className="text-ink-muted hover:text-critical"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-ink-muted">Aún no has definido tasas de cambio.</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <FieldGroup>
            <Label>De</Label>
            <Select
              value={form.fromCurrencyCode}
              onChange={(e) => setForm({ ...form, fromCurrencyCode: e.target.value })}
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label>A</Label>
            <Select
              value={form.toCurrencyCode}
              onChange={(e) => setForm({ ...form, toCurrencyCode: e.target.value })}
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label>1 {form.fromCurrencyCode || "X"} equivale a</Label>
            <Input
              required
              type="number"
              min="0.000001"
              step="0.000001"
              value={form.rate}
              onChange={(e) => setForm({ ...form, rate: e.target.value })}
              placeholder="4200"
            />
          </FieldGroup>
          <Button type="submit" disabled={saving} className="mb-3 sm:mb-0">
            <Plus size={16} /> Guardar tasa
          </Button>
        </form>
      </Card>
    </div>
  );
}
