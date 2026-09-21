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
import { ESTADO_DEUDA_LABELS, TIPO_INTERES_LABELS } from "@/lib/labels";
import type { Currency, Debt, TipoInteres } from "@/lib/types";

const STATUS_FILTERS = ["Activa", "EnMora", "Pagada", "Todas"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];
const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  Activa: "Activas",
  EnMora: "En mora",
  Pagada: "Pagadas",
  Todas: "Todas",
};

const emptyForm = {
  name: "",
  creditor: "",
  principalAmount: "",
  currencyCode: "COP",
  annualInterestRate: "",
  interestType: "CompuestoMensual" as TipoInteres,
  minimumMonthlyPayment: "",
  startDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
};

export default function DeudasPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Activa");
  const [items, setItems] = useState<Debt[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const statusQuery = statusFilter === "Todas" ? "" : `?status=${statusFilter}`;
      const [debts, currs] = await Promise.all([
        api.get<Debt[]>(`/api/debts${statusQuery}`),
        api.get<Currency[]>("/api/currencies"),
      ]);
      setItems(debts);
      setCurrencies(currs);
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
  }, [statusFilter]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/debts", {
        name: form.name,
        creditor: form.creditor,
        principalAmount: Number(form.principalAmount),
        currencyCode: form.currencyCode,
        annualInterestRate: Number(form.annualInterestRate),
        interestType: form.interestType,
        minimumMonthlyPayment: Number(form.minimumMonthlyPayment || 0),
        startDate: form.startDate,
        dueDate: form.dueDate || null,
      });
      setModalOpen(false);
      setForm({ ...emptyForm, currencyCode: form.currencyCode });
      await load();
    } catch {
      alert("No se pudo guardar la deuda.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-primary">Deudas</h1>
          <p className="text-sm text-ink-secondary">Tarjetas, préstamos y su interés.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="w-auto"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {STATUS_FILTER_LABELS[s]}
              </option>
            ))}
          </Select>
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> Nueva
          </Button>
        </div>
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
          <p className="py-8 text-center text-sm text-ink-muted">
            {statusFilter === "Todas" ? "No tienes deudas registradas." : "No tienes deudas en este estado."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((debt) => (
            <Link key={debt.id} href={`/deudas/${debt.id}`}>
              <Card className="h-full transition-colors hover:bg-surface-hover">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink-primary">{debt.name}</p>
                    <p className="text-xs text-ink-secondary">{debt.creditor}</p>
                  </div>
                  <Badge tone={debt.status === "EnMora" ? "critical" : debt.status === "Pagada" ? "good" : "neutral"}>
                    {ESTADO_DEUDA_LABELS[debt.status]}
                  </Badge>
                </div>
                <ProgressBar value={debt.progressPercentage} colorClassName="bg-critical" />
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="tabular-money font-semibold text-ink-primary">
                    {formatMoney(debt.currentBalance, debt.currencyCode)}
                  </span>
                  <span className="text-xs text-ink-secondary">
                    {debt.annualInterestRate}% E.A.
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-secondary">
                  Pagado hasta la fecha: {formatMoney(debt.totalPaid, debt.currencyCode)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva deuda">
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Label>Nombre</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Tarjeta de crédito Visa"
            />
          </FieldGroup>
          <FieldGroup>
            <Label>Acreedor</Label>
            <Input
              value={form.creditor}
              onChange={(e) => setForm({ ...form, creditor: e.target.value })}
              placeholder="Banco, entidad o persona"
            />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label>Monto de la deuda</Label>
              <Input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.principalAmount}
                onChange={(e) => setForm({ ...form, principalAmount: e.target.value })}
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
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label>Tasa de interés anual (%)</Label>
              <Input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.annualInterestRate}
                onChange={(e) => setForm({ ...form, annualInterestRate: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup>
              <Label>Tipo de interés</Label>
              <Select
                value={form.interestType}
                onChange={(e) => setForm({ ...form, interestType: e.target.value as TipoInteres })}
              >
                {Object.entries(TIPO_INTERES_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </FieldGroup>
          </div>
          <FieldGroup>
            <Label>Pago mínimo mensual</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.minimumMonthlyPayment}
              onChange={(e) => setForm({ ...form, minimumMonthlyPayment: e.target.value })}
            />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label>Fecha de inicio</Label>
              <Input
                required
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup>
              <Label>Fecha límite (opcional)</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </FieldGroup>
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Guardando..." : "Guardar deuda"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
