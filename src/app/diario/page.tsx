"use client";

import { Plus, Trash2, CalendarDays, Wallet, Layers, RotateCcw, Scale } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { AmountCalcInput } from "@/components/ui/AmountCalcInput";
import { api, ApiError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { evaluateExpression } from "@/lib/calc";
import type { DailyDashboard, FuenteGastoDiario } from "@/lib/types";

const emptyEntryForm = { description: "", amount: "", source: "Hoy" as FuenteGastoDiario };

export default function DiarioPage() {
  const [dashboard, setDashboard] = useState<DailyDashboard | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyEntryForm);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api.get<DailyDashboard>("/api/daily-budget/today");
      setDashboard(data);
      setNotConfigured(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotConfigured(true);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!dashboard) return;
    const amount = evaluateExpression(form.amount);
    if (amount === null) {
      alert("El monto ingresado no es válido.");
      return;
    }

    setSaving(true);
    try {
      await api.post(`/api/daily-budget/day/${dashboard.date}/entries`, {
        description: form.description,
        amount,
        source: form.source,
      });
      setForm(emptyEntryForm);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo agregar el gasto.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEntry(entry: DailyDashboard["entries"][number]) {
    const message =
      entry.source === "SaldoDisponible"
        ? "¿Eliminar este gasto? Se elimina también el gasto que se creó en Gastos."
        : "¿Eliminar este gasto? (se devuelve el monto al bolsillo Diario)";
    if (!confirm(message)) return;
    try {
      await api.delete(`/api/daily-budget/entries/${entry.id}`);
      await load();
    } catch {
      alert("No se pudo eliminar el gasto.");
    }
  }

  async function handleResetAcumulado() {
    if (
      !confirm(
        "¿Reiniciar el acumulado libre a $0? El saldo real del bolsillo \"Diario\" no cambia, solo dejas de arrastrar lo viejo: de ahora en adelante el acumulado solo cuenta lo nuevo.",
      )
    ) {
      return;
    }
    setResetting(true);
    try {
      await api.post("/api/daily-budget/reset-acumulado", {});
      await load();
    } catch {
      alert("No se pudo reiniciar el acumulado.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-primary">Diario</h1>
          <p className="text-sm text-ink-secondary">Lo que llevas del día de hoy.</p>
        </div>
        <Link href="/calendario" className="flex items-center gap-1 text-sm font-medium text-brand hover:underline">
          <CalendarDays size={16} /> Ver calendario
        </Link>
      </div>

      {loading ? (
        <Card>
          <p className="py-8 text-center text-sm text-ink-muted">Cargando...</p>
        </Card>
      ) : notConfigured || !dashboard ? (
        <Card>
          <p className="py-8 text-center text-sm text-ink-muted">
            Aún no has configurado tu presupuesto de día a día.
          </p>
          <Link href="/calendario" className="mx-auto block w-fit">
            <Button>
              <Plus size={16} /> Configurar presupuesto
            </Button>
          </Link>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <Card>
              <div className="flex items-center gap-2 text-ink-secondary">
                <Wallet size={16} />
                <p className="text-sm">Disponible hoy</p>
              </div>
              <p className="tabular-money mt-1 font-display text-2xl font-bold text-good">
                {formatMoney(dashboard.disponibleHoy, dashboard.currencyCode)}
              </p>
              <p className="mt-1 text-xs text-ink-secondary">
                de {formatMoney(dashboard.plannedToday, dashboard.currencyCode)} planeados hoy
              </p>
              {dashboard.storageLocation && (
                <p className="mt-1 text-xs text-ink-muted">📍 {dashboard.storageLocation}</p>
              )}
            </Card>
            <Card>
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-ink-secondary">
                  <Layers size={16} />
                  <p className="text-sm">Acumulado libre</p>
                </div>
                <button
                  onClick={handleResetAcumulado}
                  disabled={resetting}
                  aria-label="Reiniciar acumulado a $0"
                  title="Reiniciar acumulado a $0"
                  className="text-ink-muted hover:text-critical disabled:opacity-50"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
              <p className="tabular-money font-display text-2xl font-bold text-ink-primary">
                {formatMoney(dashboard.acumulado, dashboard.currencyCode)}
              </p>
              <p className="mt-1 text-xs text-ink-secondary">lo que sobró de días anteriores</p>
              {dashboard.storageLocation && (
                <p className="mt-1 text-xs text-ink-muted">📍 {dashboard.storageLocation}</p>
              )}
            </Card>
            <Link href="/saldos" className="col-span-2 block sm:col-span-1">
              <Card className="h-full transition-colors hover:bg-surface-hover">
                <div className="flex items-center gap-2 text-ink-secondary">
                  <Scale size={16} />
                  <p className="text-sm">Saldo disponible</p>
                </div>
                <p
                  className={`tabular-money mt-1 font-display text-2xl font-bold ${
                    dashboard.saldoDisponible >= 0 ? "text-good" : "text-critical"
                  }`}
                >
                  {formatMoney(dashboard.saldoDisponible, dashboard.currencyCode)}
                </p>
                <p className="mt-1 text-xs text-ink-secondary">lo que llevas disponible este periodo</p>
              </Card>
            </Link>
          </div>

          <Link
            href={`/ahorros/${dashboard.savingsGoalId}`}
            className="flex flex-col gap-1 rounded-lg border border-line bg-surface px-4 py-2 text-sm hover:bg-surface-hover"
          >
            <div className="flex items-center justify-between">
              <span className="text-ink-secondary">
                Saldo real del bolsillo &quot;Diario&quot;{dashboard.storageLocation && ` · 📍 ${dashboard.storageLocation}`}
              </span>
              <span className="tabular-money font-semibold text-ink-primary">
                {formatMoney(dashboard.walletBalance, dashboard.currencyCode)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-ink-secondary">
              <span>Meta (proyectado en calendario)</span>
              <span className="tabular-money">{formatMoney(dashboard.walletTarget, dashboard.currencyCode)}</span>
            </div>
            {dashboard.walletPending > 0 && (
              <p className="text-xs text-warning">
                Te falta cargar {formatMoney(dashboard.walletPending, dashboard.currencyCode)} manualmente para
                alcanzar la meta.
              </p>
            )}
          </Link>

          <Card>
            <p className="mb-3 text-sm font-medium text-ink-primary">Registrar gasto de hoy</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <Input
                  required
                  placeholder="Café, almuerzo, transporte..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="sm:flex-1"
                />
                <div className="sm:w-32">
                  <AmountCalcInput
                    value={form.amount}
                    currencyCode={dashboard.currencyCode}
                    onChange={(v) => setForm({ ...form, amount: v })}
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  <Plus size={16} />
                </Button>
              </div>
              <div className="flex gap-4 text-sm text-ink-secondary">
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={form.source === "Hoy"}
                    onChange={() => setForm({ ...form, source: "Hoy" })}
                  />
                  De lo disponible hoy ({formatMoney(dashboard.disponibleHoy, dashboard.currencyCode)})
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={form.source === "Acumulado"}
                    onChange={() => setForm({ ...form, source: "Acumulado" })}
                  />
                  Del acumulado ({formatMoney(dashboard.acumulado, dashboard.currencyCode)})
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={form.source === "SaldoDisponible"}
                    onChange={() => setForm({ ...form, source: "SaldoDisponible" })}
                  />
                  Del saldo disponible ({formatMoney(dashboard.saldoDisponible, dashboard.currencyCode)})
                </label>
              </div>
              {form.source === "SaldoDisponible" && (
                <p className="text-xs text-ink-secondary">
                  Esto crea un gasto en Gastos y no toca el bolsillo &quot;Diario&quot;.
                </p>
              )}
            </form>
          </Card>

          <Card>
            <p className="mb-3 text-sm font-medium text-ink-primary">Gastos de hoy</p>
            {dashboard.entries.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">Aún no has registrado nada hoy.</p>
            ) : (
              <ul className="divide-y divide-line">
                {dashboard.entries.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink-primary">{entry.description}</p>
                      <Badge tone={entry.source === "Hoy" ? "neutral" : entry.source === "Acumulado" ? "warning" : "critical"}>
                        {entry.source === "Hoy" ? "De hoy" : entry.source === "Acumulado" ? "Del acumulado" : "Del saldo disponible"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular-money whitespace-nowrap text-sm font-medium text-ink-primary">
                        -{formatMoney(entry.amount, dashboard.currencyCode)}
                      </span>
                      <button
                        onClick={() => handleDeleteEntry(entry)}
                        aria-label="Eliminar"
                        className="text-ink-muted hover:text-critical"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
