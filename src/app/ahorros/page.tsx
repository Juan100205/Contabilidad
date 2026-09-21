"use client";

import { Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, FieldGroup, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import type { Currency, IncomeEntry, SavingsGoal } from "@/lib/types";

const EMOJI_OPTIONS = ["💰", "✈️", "🏠", "🚗", "🎓", "🏥", "🎉", "🛡️"];
const TOTAL_INCOME_VALUE = "__total__";

const emptyForm = {
  name: "",
  icon: EMOJI_OPTIONS[0],
  targetAmount: "",
  currencyCode: "COP",
  targetDate: "",
  usePercentage: false,
  percentage: "",
  incomeSourceFilter: TOTAL_INCOME_VALUE,
};

export default function AhorrosPage() {
  const [items, setItems] = useState<SavingsGoal[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [incomeSources, setIncomeSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [goals, currs, income] = await Promise.all([
        api.get<SavingsGoal[]>("/api/savings-goals"),
        api.get<Currency[]>("/api/currencies"),
        api.get<IncomeEntry[]>("/api/income"),
      ]);
      setItems(goals);
      setCurrencies(currs);
      setIncomeSources(Array.from(new Set(income.map((i) => i.source).filter(Boolean))));
      if (currs.length && !currs.some((c) => c.code === form.currencyCode)) {
        setForm((f) => ({ ...f, currencyCode: currs[0].code }));
      }
    } catch {
      setError("No se pudo conectar con el backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/savings-goals", {
        name: form.name,
        icon: form.icon,
        targetAmount: Number(form.targetAmount),
        currencyCode: form.currencyCode,
        targetDate: form.targetDate || null,
        percentage: form.usePercentage ? Number(form.percentage) : null,
        incomeSourceFilter:
          form.usePercentage && form.incomeSourceFilter !== TOTAL_INCOME_VALUE ? form.incomeSourceFilter : null,
      });
      setModalOpen(false);
      setForm({ ...emptyForm, currencyCode: form.currencyCode });
      await load();
    } catch {
      alert("No se pudo crear el bolsillo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-primary">Bolsillos de ahorro</h1>
          <p className="text-sm text-ink-secondary">Define hacia dónde quieres que vaya tu ahorro.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Nuevo
        </Button>
      </div>

      {error && (
        <Card className="flex items-center justify-between text-sm text-critical">
          {error}
          <button onClick={load} className="flex items-center gap-1 text-ink-secondary hover:text-ink-primary">
            <RefreshCw size={14} /> Reintentar
          </button>
        </Card>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-ink-muted">Cargando...</p>
      ) : items.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-ink-muted">Aún no has creado bolsillos de ahorro.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((goal) => (
            <Link key={goal.id} href={`/ahorros/${goal.id}`}>
              <Card className="h-full transition-colors hover:bg-surface-hover">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-medium text-ink-primary">
                    <span className="mr-1">{goal.icon}</span>
                    {goal.name}
                  </p>
                  {goal.status === "Cumplida" && <Badge tone="good">Cumplida</Badge>}
                </div>
                <ProgressBar value={goal.progressPercentage} colorClassName="bg-brand" />
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="tabular-money font-semibold text-ink-primary">
                    {formatMoney(goal.currentAmount, goal.currencyCode)}
                  </span>
                  <span className="text-xs text-ink-secondary">
                    de {formatMoney(goal.targetAmount, goal.currencyCode)}
                  </span>
                </div>
                {goal.suggestedMonthlyContribution !== null && (
                  <p className="mt-2 text-xs text-brand">
                    Aporte sugerido este mes: {formatMoney(goal.suggestedMonthlyContribution, goal.currencyCode)}
                  </p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo bolsillo de ahorro">
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Label>Nombre</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Fondo de emergencia, viaje..."
            />
          </FieldGroup>
          <FieldGroup>
            <Label>Ícono</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setForm({ ...form, icon: emoji })}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg ${
                    form.icon === emoji ? "border-brand bg-brand-soft" : "border-line bg-surface"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label>Meta de ahorro</Label>
              <Input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup>
              <Label>Moneda</Label>
              <Select
                value={form.currencyCode}
                onChange={(e) => setForm({ ...form, currencyCode: e.target.value })}
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </div>
          <FieldGroup>
            <Label>Fecha objetivo (opcional)</Label>
            <Input
              type="date"
              value={form.targetDate}
              onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
            />
          </FieldGroup>
          <label className="mb-3 flex items-center gap-2 text-sm text-ink-secondary">
            <input
              type="checkbox"
              checked={form.usePercentage}
              onChange={(e) => setForm({ ...form, usePercentage: e.target.checked })}
            />
            Sugerir aporte mensual como % de ingresos
          </label>
          {form.usePercentage && (
            <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-line bg-surface-hover p-3">
              <FieldGroup>
                <Label>Porcentaje</Label>
                <Input
                  required
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={form.percentage}
                  onChange={(e) => setForm({ ...form, percentage: e.target.value })}
                />
              </FieldGroup>
              <FieldGroup>
                <Label>Sobre</Label>
                <Select
                  value={form.incomeSourceFilter}
                  onChange={(e) => setForm({ ...form, incomeSourceFilter: e.target.value })}
                >
                  <option value={TOTAL_INCOME_VALUE}>Total de ingresos</option>
                  {incomeSources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </FieldGroup>
            </div>
          )}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Creando..." : "Crear bolsillo"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
