"use client";

import { Plus, Trash2, Pencil, RefreshCw, Check, Undo2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, FieldGroup, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { AmountCalcInput } from "@/components/ui/AmountCalcInput";
import { MonthNav } from "@/components/ui/MonthNav";
import { api } from "@/lib/api";
import { formatMoney, formatDate, todayIso, monthLabel } from "@/lib/format";
import { evaluateExpression } from "@/lib/calc";
import { CATEGORIA_LABELS, ESTADO_GASTO_LABELS } from "@/lib/labels";
import { CATEGORY_COLORS } from "@/lib/chartColors";
import type { CategoriaGasto, Currency, EstadoGasto, Expense, IncomeEntry } from "@/lib/types";

const CATEGORIES = Object.keys(CATEGORIA_LABELS) as CategoriaGasto[];
const TOTAL_INCOME_VALUE = "__total__";
const STATUS_FILTERS = ["Todos", "Pendiente", "Pagado"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const emptyForm = {
  description: "",
  category: "Otro" as CategoriaGasto,
  amount: "",
  currencyCode: "COP",
  date: todayIso(),
  isRecurring: false,
  usePercentage: false,
  percentage: "",
  incomeSourceFilter: TOTAL_INCOME_VALUE,
  status: "Pendiente" as EstadoGasto,
  storageLocation: "",
};

export default function GastosPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Todos");
  const [items, setItems] = useState<Expense[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [incomeSources, setIncomeSources] = useState<string[]>([]);
  const [storageLocations, setStorageLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const statusQuery = statusFilter === "Todos" ? "" : `&status=${statusFilter}`;
      const [expenses, currs, income] = await Promise.all([
        api.get<Expense[]>(`/api/expenses?year=${year}&month=${month}${statusQuery}`),
        api.get<Currency[]>("/api/currencies"),
        api.get<IncomeEntry[]>("/api/income"),
      ]);
      setItems(expenses);
      setCurrencies(currs);
      setIncomeSources(Array.from(new Set(income.map((i) => i.source).filter(Boolean))));
      setStorageLocations(
        Array.from(
          new Set([...income.map((i) => i.storageLocation), ...expenses.map((e) => e.storageLocation)].filter(
            (v): v is string => !!v,
          )),
        ),
      );
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
  }, [year, month, statusFilter]);

  function openCreateModal() {
    setEditingId(null);
    setForm({ ...emptyForm, currencyCode: form.currencyCode });
    setModalOpen(true);
  }

  function openEditModal(item: Expense) {
    setEditingId(item.id);
    setForm({
      description: item.description,
      category: item.category,
      amount: String(item.amount),
      currencyCode: item.currencyCode,
      date: item.date.slice(0, 10),
      isRecurring: item.isRecurring,
      usePercentage: item.percentage !== null,
      percentage: item.percentage !== null ? String(item.percentage) : "",
      incomeSourceFilter: item.incomeSourceFilter ?? TOTAL_INCOME_VALUE,
      status: item.status,
      storageLocation: item.storageLocation ?? "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const amount = form.usePercentage ? 0 : evaluateExpression(form.amount);
    if (amount === null) {
      alert("El monto ingresado no es válido.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        description: form.description,
        category: form.category,
        amount,
        currencyCode: form.currencyCode,
        date: form.date,
        isRecurring: form.isRecurring,
        percentage: form.usePercentage ? Number(form.percentage) : null,
        incomeSourceFilter:
          form.usePercentage && form.incomeSourceFilter !== TOTAL_INCOME_VALUE ? form.incomeSourceFilter : null,
        status: form.status,
        storageLocation: form.storageLocation || null,
      };

      if (editingId) {
        await api.put(`/api/expenses/${editingId}`, payload);
      } else {
        await api.post("/api/expenses", payload);
      }
      closeModal();
      setForm({ ...emptyForm, currencyCode: form.currencyCode });
      await load();
    } catch {
      alert("No se pudo guardar el gasto.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este gasto?")) return;
    await api.delete(`/api/expenses/${id}`);
    await load();
  }

  async function handleToggleStatus(item: Expense) {
    const nextStatus: EstadoGasto = item.status === "Pagado" ? "Pendiente" : "Pagado";
    await api.patch(`/api/expenses/${item.id}/status`, { status: nextStatus });
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-primary">Gastos</h1>
          <p className="text-sm text-ink-secondary">Pasivos mensuales: vivienda, servicios, etc.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthNav year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="w-auto"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s === "Todos" ? "Todos" : ESTADO_GASTO_LABELS[s]}
              </option>
            ))}
          </Select>
          <Button onClick={openCreateModal}>
            <Plus size={16} /> Nuevo
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

      <Card>
        {loading ? (
          <p className="py-8 text-center text-sm text-ink-muted">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">Aún no has registrado gastos.</p>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-primary">{item.description}</p>
                  <p className="flex flex-wrap items-center gap-1.5 text-xs text-ink-secondary">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[item.category] }}
                    />
                    {CATEGORIA_LABELS[item.category]} · {formatDate(item.date)}
                    {item.isRecurring && <Badge tone="neutral">Recurrente</Badge>}
                    {item.percentage !== null && (
                      <Badge tone="neutral">
                        {item.percentage}% de {item.incomeSourceFilter ?? "ingresos"}
                      </Badge>
                    )}
                    <Badge tone={item.status === "Pagado" ? "good" : "warning"}>
                      {ESTADO_GASTO_LABELS[item.status]}
                    </Badge>
                    {item.storageLocation && <Badge tone="neutral">📍 {item.storageLocation}</Badge>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-money whitespace-nowrap font-medium text-ink-primary">
                    -{formatMoney(item.amount, item.currencyCode)}
                  </span>
                  <button
                    onClick={() => handleToggleStatus(item)}
                    aria-label={item.status === "Pagado" ? "Marcar como pendiente" : "Marcar como pagado"}
                    title={item.status === "Pagado" ? "Marcar como pendiente" : "Marcar como pagado"}
                    className="text-ink-muted hover:text-good"
                  >
                    {item.status === "Pagado" ? <Undo2 size={16} /> : <Check size={16} />}
                  </button>
                  <button
                    onClick={() => openEditModal(item)}
                    aria-label="Editar"
                    className="text-ink-muted hover:text-ink-primary"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
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

      {!loading && items.length > 0 && (
        <p className="text-right text-xs text-ink-muted">
          Total {monthLabel(month)} {year}:{" "}
          {Object.entries(
            items.reduce<Record<string, number>>((acc, i) => {
              acc[i.currencyCode] = (acc[i.currencyCode] ?? 0) + i.amount;
              return acc;
            }, {}),
          )
            .map(([code, total]) => formatMoney(total, code))
            .join(" + ")}
        </p>
      )}

      <Modal open={modalOpen} onClose={closeModal} title={editingId ? "Editar gasto" : "Nuevo gasto"}>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Label>Descripción</Label>
            <Input
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Arriendo, internet, mercado..."
            />
          </FieldGroup>
          <FieldGroup>
            <Label>Categoría</Label>
            <Select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as CategoriaGasto })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORIA_LABELS[c]}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label>Monto</Label>
              {form.usePercentage ? (
                <Input disabled value="Se calcula según el %" />
              ) : (
                <AmountCalcInput
                  required
                  value={form.amount}
                  currencyCode={form.currencyCode}
                  onChange={(v) => setForm({ ...form, amount: v })}
                />
              )}
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
              <Label>Fecha</Label>
              <Input
                required
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup>
              <Label>Estado</Label>
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as EstadoGasto })}
              >
                <option value="Pendiente">Pendiente</option>
                <option value="Pagado">Pagado</option>
              </Select>
            </FieldGroup>
          </div>
          <FieldGroup>
            <Label>¿De dónde sale?</Label>
            <Input
              required
              list="storage-locations"
              value={form.storageLocation}
              onChange={(e) => setForm({ ...form, storageLocation: e.target.value })}
              placeholder="Efectivo, Bancolombia, Nequi..."
            />
            <datalist id="storage-locations">
              {storageLocations.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
          </FieldGroup>
          <label className="mb-3 flex items-center gap-2 text-sm text-ink-secondary">
            <input
              type="checkbox"
              checked={form.isRecurring}
              onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
            />
            Es un gasto recurrente cada mes
          </label>
          <label className="mb-3 flex items-center gap-2 text-sm text-ink-secondary">
            <input
              type="checkbox"
              checked={form.usePercentage}
              onChange={(e) => setForm({ ...form, usePercentage: e.target.checked })}
            />
            Definir como % de ingresos (se recalcula cada mes)
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
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Guardar gasto"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
