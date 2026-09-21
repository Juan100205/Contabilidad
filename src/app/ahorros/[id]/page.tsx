"use client";

import { ArrowLeft, Plus, ArrowDownCircle, ArrowUpCircle, Lock, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, FieldGroup, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MonthNav } from "@/components/ui/MonthNav";
import { api } from "@/lib/api";
import { formatMoney, formatDate, todayIso } from "@/lib/format";
import type {
  BalanceSummary,
  Currency,
  FuenteDescuentoPago,
  IncomeEntry,
  SavingsGoal,
  SavingsMovement,
  TipoMovimientoAhorro,
  WeeklyBudgetTemplate,
  WeeklyProjection,
} from "@/lib/types";

const emptyForm = {
  amount: "",
  type: "Deposito" as TipoMovimientoAhorro,
  date: todayIso(),
  note: "",
  incomeDeductionSource: "Ninguna" as FuenteDescuentoPago,
  incomeSourceFilter: "",
  amountMode: "fixed" as "fixed" | "percentage",
  percentage: "",
  withdrawnFrom: "",
  depositedTo: "",
};
const DEFAULT_PROJECTION_WEEKS = 4;

const EMOJI_OPTIONS = ["💰", "✈️", "🏠", "🚗", "🎓", "🏥", "🎉", "🛡️"];
const TOTAL_INCOME_VALUE = "__total__";

const emptyGoalForm = {
  name: "",
  icon: EMOJI_OPTIONS[0],
  targetAmount: "",
  currencyCode: "COP",
  targetDate: "",
  usePercentage: false,
  percentage: "",
  incomeSourceFilter: TOTAL_INCOME_VALUE,
};

export default function BolsilloDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [goal, setGoal] = useState<SavingsGoal | null>(null);
  const [movements, setMovements] = useState<SavingsMovement[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [incomeSources, setIncomeSources] = useState<string[]>([]);
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [isDiarioWallet, setIsDiarioWallet] = useState(false);
  const [projection, setProjection] = useState<WeeklyProjection[]>([]);
  const [projectionWeeks, setProjectionWeeks] = useState(String(DEFAULT_PROJECTION_WEEKS));
  const [loadingProjection, setLoadingProjection] = useState(false);
  const [committingWeeks, setCommittingWeeks] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingMovementId, setEditingMovementId] = useState<string | null>(null);
  const [locationDraft, setLocationDraft] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalForm, setGoalForm] = useState(emptyGoalForm);

  async function refreshProjection() {
    const weeks = Number(projectionWeeks) || DEFAULT_PROJECTION_WEEKS;
    setLoadingProjection(true);
    try {
      setProjection(await api.get<WeeklyProjection[]>(`/api/daily-budget/projection?weeks=${weeks}`));
    } finally {
      setLoadingProjection(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const nowDate = new Date();
      const [g, m, dailyBudgetTemplate, income, bal, currs] = await Promise.all([
        api.get<SavingsGoal>(`/api/savings-goals/${params.id}`),
        api.get<SavingsMovement[]>(`/api/savings-goals/${params.id}/movements?year=${year}&month=${month}`),
        api.get<WeeklyBudgetTemplate | null>("/api/daily-budget/template"),
        api.get<IncomeEntry[]>("/api/income"),
        api
          .get<BalanceSummary>(
            `/api/balances/summary?year=${nowDate.getFullYear()}&month=${nowDate.getMonth() + 1}&baseCurrency=COP`,
          )
          .catch(() => null),
        api.get<Currency[]>("/api/currencies").catch(() => [] as Currency[]),
      ]);
      setGoal(g);
      setMovements(m);
      setIncomeSources(Array.from(new Set(income.map((i) => i.source).filter(Boolean))));
      setBalance(bal);
      setCurrencies(currs);
      setLocationDraft(g.storageLocation ?? "");

      const isWallet = dailyBudgetTemplate?.savingsGoalId === params.id;
      setIsDiarioWallet(isWallet);
      if (isWallet) {
        await refreshProjection();
      } else {
        setProjection([]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadWeeks() {
    const weeks = Number(projectionWeeks) || DEFAULT_PROJECTION_WEEKS;
    setCommittingWeeks(true);
    try {
      const result = await api.post<WeeklyProjection[]>(`/api/daily-budget/load-weeks?weeks=${weeks}`, {});
      await load();

      const blocked = result.filter((p) => !p.alreadyLoaded);
      if (blocked.length > 0) {
        alert(
          `${result.length - blocked.length} de ${result.length} semanas quedaron reservadas.\n\n` +
            `No se pudieron reservar (sin ingresos suficientes registrados ese mes):\n` +
            blocked.map((p) => `- Semana del ${formatDate(p.weekStart)} al ${formatDate(p.weekEnd)}`).join("\n") +
            `\n\nRegistra los ingresos de esos meses en "Ingresos" y vuelve a intentarlo.`,
        );
      }
    } catch {
      alert("No se pudo cargar el presupuesto de esas semanas.");
    } finally {
      setCommittingWeeks(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, year, month]);

  function openCreateModal() {
    setEditingMovementId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(m: SavingsMovement) {
    setEditingMovementId(m.id);
    setForm({
      amount: String(m.amount),
      type: m.type,
      date: m.date.slice(0, 10),
      note: m.note ?? "",
      incomeDeductionSource: m.incomeDeductionSource,
      incomeSourceFilter: m.incomeSourceFilter ?? "",
      amountMode: m.percentage !== null ? "percentage" : "fixed",
      percentage: m.percentage !== null ? String(m.percentage) : "",
      withdrawnFrom: m.withdrawnFrom ?? "",
      depositedTo: m.depositedTo ?? "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingMovementId(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const isDeposito = form.type === "Deposito";
    const usePercentage = isDeposito && form.incomeDeductionSource !== "Ninguna" && form.amountMode === "percentage";

    if (isDeposito && form.incomeDeductionSource === "IngresoEspecifico" && !form.incomeSourceFilter) {
      alert("Elige de qué fuente de ingreso se toma este depósito.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        amount: usePercentage ? null : Number(form.amount),
        percentage: usePercentage ? Number(form.percentage) : null,
        type: form.type,
        date: form.date,
        note: form.note || null,
        incomeDeductionSource: isDeposito ? form.incomeDeductionSource : "Ninguna",
        incomeSourceFilter: isDeposito && form.incomeDeductionSource === "IngresoEspecifico" ? form.incomeSourceFilter : null,
        withdrawnFrom: isDeposito ? form.withdrawnFrom || null : null,
        depositedTo: !isDeposito ? form.depositedTo || null : null,
      };

      if (editingMovementId) {
        await api.put(`/api/savings-goals/${params.id}/movements/${editingMovementId}`, payload);
      } else {
        await api.post(`/api/savings-goals/${params.id}/movements`, payload);
      }
      closeModal();
      setForm(emptyForm);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo guardar el movimiento.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMovement(id: string) {
    if (!confirm("¿Eliminar este movimiento? Se revierte su efecto en el saldo del bolsillo.")) return;
    try {
      await api.delete(`/api/savings-goals/${params.id}/movements/${id}`);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo eliminar el movimiento.");
    }
  }

  async function handleSaveLocation() {
    setSavingLocation(true);
    try {
      await api.patch(`/api/savings-goals/${params.id}/storage-location`, {
        storageLocation: locationDraft || null,
      });
      await load();
    } catch {
      alert("No se pudo guardar la ubicación.");
    } finally {
      setSavingLocation(false);
    }
  }

  function openEditGoalModal() {
    if (!goal) return;
    setGoalForm({
      name: goal.name,
      icon: goal.icon ?? EMOJI_OPTIONS[0],
      targetAmount: String(goal.targetAmount),
      currencyCode: goal.currencyCode,
      targetDate: goal.targetDate ? goal.targetDate.slice(0, 10) : "",
      usePercentage: goal.percentage !== null,
      percentage: goal.percentage !== null ? String(goal.percentage) : "",
      incomeSourceFilter: goal.incomeSourceFilter ?? TOTAL_INCOME_VALUE,
    });
    setGoalModalOpen(true);
  }

  async function handleUpdateGoal(e: FormEvent) {
    e.preventDefault();
    setSavingGoal(true);
    try {
      await api.put(`/api/savings-goals/${params.id}`, {
        name: goalForm.name,
        icon: goalForm.icon,
        targetAmount: Number(goalForm.targetAmount),
        currencyCode: goalForm.currencyCode,
        targetDate: goalForm.targetDate || null,
        percentage: goalForm.usePercentage ? Number(goalForm.percentage) : null,
        incomeSourceFilter:
          goalForm.usePercentage && goalForm.incomeSourceFilter !== TOTAL_INCOME_VALUE
            ? goalForm.incomeSourceFilter
            : null,
      });
      setGoalModalOpen(false);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo actualizar el bolsillo.");
    } finally {
      setSavingGoal(false);
    }
  }

  async function handleDeleteGoal() {
    if (!goal) return;
    if (!confirm(`¿Eliminar el bolsillo "${goal.name}"? Esto también elimina todo su historial de movimientos. No se puede deshacer.`)) {
      return;
    }
    try {
      await api.delete(`/api/savings-goals/${params.id}`);
      router.push("/ahorros");
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo eliminar el bolsillo.");
    }
  }

  function deductionLabel(m: SavingsMovement): string | null {
    if (m.incomeDeductionSource === "Ninguna") return null;
    const base =
      m.incomeDeductionSource === "TotalIngresos"
        ? "total de ingresos"
        : m.incomeDeductionSource === "SaldoDisponible"
          ? "saldo disponible"
          : m.incomeSourceFilter;
    return m.percentage !== null ? `${m.percentage}% de ${base}` : `De: ${base}`;
  }

  if (loading || !goal) {
    return <p className="py-8 text-center text-sm text-ink-muted">Cargando...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/ahorros" className="flex items-center gap-1 text-sm text-ink-secondary hover:text-ink-primary">
        <ArrowLeft size={16} /> Volver a bolsillos
      </Link>

      <Card>
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-ink-primary">
              <span className="mr-2">{goal.icon}</span>
              {goal.name}
            </h1>
            {goal.targetDate && (
              <p className="text-sm text-ink-secondary">Meta para: {formatDate(goal.targetDate)}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {goal.status === "Cumplida" && <Badge tone="good">Cumplida</Badge>}
            <button
              onClick={openEditGoalModal}
              aria-label="Editar bolsillo"
              title="Editar bolsillo"
              className="text-ink-muted hover:text-ink-primary"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={handleDeleteGoal}
              aria-label="Eliminar bolsillo"
              title="Eliminar bolsillo"
              className="text-ink-muted hover:text-critical"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <ProgressBar value={goal.progressPercentage} colorClassName="bg-brand" />
        <div className="mt-2 flex justify-between text-sm text-ink-secondary">
          <span>{goal.progressPercentage.toFixed(1)}% completado</span>
          <span>
            {formatMoney(goal.currentAmount, goal.currencyCode)} de{" "}
            {formatMoney(goal.targetAmount, goal.currencyCode)}
          </span>
        </div>
        {goal.suggestedMonthlyContribution !== null && (
          <p className="mt-2 text-xs text-brand">
            Aporte sugerido este mes ({goal.percentage}% de {goal.incomeSourceFilter ?? "ingresos"}):{" "}
            {formatMoney(goal.suggestedMonthlyContribution, goal.currencyCode)}
          </p>
        )}

        <div className="mt-3 flex items-end gap-2 border-t border-line pt-3">
          <FieldGroup>
            <Label>¿Dónde está guardado este dinero?</Label>
            <Input
              list="goal-location-options"
              value={locationDraft}
              onChange={(e) => setLocationDraft(e.target.value)}
              placeholder="Efectivo, Bancolombia, Nequi..."
            />
            <datalist id="goal-location-options">
              <option value="Efectivo" />
              <option value="Bancolombia" />
              <option value="Nequi" />
            </datalist>
          </FieldGroup>
          <Button
            variant="secondary"
            onClick={handleSaveLocation}
            disabled={savingLocation || locationDraft === (goal.storageLocation ?? "")}
            className="mb-3"
          >
            {savingLocation ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </Card>

      {isDiarioWallet && (
        <Card>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-ink-primary">Reservar semanas por adelantado</p>
              <p className="text-xs text-ink-secondary">
                Descuenta ya mismo el presupuesto de esas semanas de tus ingresos y lo deja apartado aquí, para que
                no lo gastes en otra cosa.
              </p>
            </div>
            <div className="flex items-end gap-2">
              <FieldGroup>
                <Label>Semanas</Label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={projectionWeeks}
                  onChange={(e) => setProjectionWeeks(e.target.value)}
                  onBlur={refreshProjection}
                  className="w-20"
                />
              </FieldGroup>
              <Button onClick={handleLoadWeeks} disabled={committingWeeks} className="mb-3">
                <Lock size={16} /> {committingWeeks ? "Cargando..." : "Reservar ahora"}
              </Button>
            </div>
          </div>

          {loadingProjection ? (
            <p className="py-4 text-center text-sm text-ink-muted">Calculando...</p>
          ) : (
            <ul className="divide-y divide-line">
              {projection.map((p) => (
                <li key={p.weekStart} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <p className="text-sm text-ink-primary">
                      Semana del {formatDate(p.weekStart)} al {formatDate(p.weekEnd)}
                    </p>
                    <p className={`text-xs ${p.alreadyLoaded ? "text-good" : "text-ink-secondary"}`}>
                      {p.alreadyLoaded ? "Reservada en el bolsillo" : "Aún no reservada"}
                    </p>
                  </div>
                  <span className="tabular-money text-sm font-medium text-ink-primary">
                    {formatMoney(p.amount, p.currencyCode)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-lg font-semibold text-ink-primary">Movimientos</h2>
        <div className="flex items-center gap-2">
          <MonthNav year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
          <Button onClick={openCreateModal}>
            <Plus size={16} /> Nuevo movimiento
          </Button>
        </div>
      </div>

      <Card>
        {movements.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">No hay movimientos registrados este período.</p>
        ) : (
          <ul className="divide-y divide-line">
            {movements.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-2">
                  {m.type === "Deposito" ? (
                    <ArrowUpCircle size={18} className="text-good" />
                  ) : (
                    <ArrowDownCircle size={18} className="text-critical" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-ink-primary">{formatDate(m.date)}</p>
                    {m.note && <p className="text-xs text-ink-secondary">{m.note}</p>}
                    {deductionLabel(m) && <p className="text-xs text-brand">{deductionLabel(m)}</p>}
                    {m.withdrawnFrom && <p className="text-xs text-ink-secondary">Retirado de: {m.withdrawnFrom}</p>}
                    {m.depositedTo && <p className="text-xs text-ink-secondary">Depositado en: {m.depositedTo}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`tabular-money font-medium ${m.type === "Deposito" ? "text-good" : "text-critical"}`}
                  >
                    {m.type === "Deposito" ? "+" : "-"}
                    {formatMoney(m.amount, goal.currencyCode)}
                  </span>
                  <button
                    onClick={() => openEditModal(m)}
                    aria-label="Editar"
                    className="text-ink-muted hover:text-ink-primary"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteMovement(m.id)}
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

      <Modal open={modalOpen} onClose={closeModal} title={editingMovementId ? "Editar movimiento" : "Nuevo movimiento"}>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Label>Tipo</Label>
            <Select
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value as TipoMovimientoAhorro,
                  incomeDeductionSource: "Ninguna",
                  amountMode: "fixed",
                })
              }
            >
              <option value="Deposito">Depósito</option>
              <option value="Retiro">Retiro</option>
            </Select>
          </FieldGroup>

          {form.type === "Deposito" && (
            <FieldGroup>
              <Label>¿De dónde se toma?</Label>
              <Select
                value={form.incomeDeductionSource}
                onChange={(e) =>
                  setForm({
                    ...form,
                    incomeDeductionSource: e.target.value as FuenteDescuentoPago,
                    incomeSourceFilter: "",
                    amountMode: e.target.value === "Ninguna" || e.target.value === "SaldoDisponible" ? "fixed" : form.amountMode,
                  })
                }
              >
                <option value="Ninguna">Ninguno (no llevar registro)</option>
                <option value="TotalIngresos">Total de ingresos</option>
                <option value="SaldoDisponible">Saldo disponible (Saldos)</option>
                <option value="IngresoEspecifico">Una fuente específica...</option>
              </Select>
              {form.incomeDeductionSource === "SaldoDisponible" && balance && (
                <p className="mt-1 text-xs text-ink-secondary">
                  Disponible este periodo: <span className="font-medium text-ink-primary">{formatMoney(balance.available, balance.currencyCode)}</span>
                </p>
              )}
            </FieldGroup>
          )}

          {form.type === "Deposito" && form.incomeDeductionSource === "IngresoEspecifico" && (
            <FieldGroup>
              <Label>Fuente de ingreso</Label>
              {incomeSources.length === 0 ? (
                <p className="text-xs text-critical">No tienes fuentes de ingreso registradas todavía.</p>
              ) : (
                <Select
                  value={form.incomeSourceFilter}
                  onChange={(e) => setForm({ ...form, incomeSourceFilter: e.target.value })}
                >
                  <option value="">Selecciona una fuente</option>
                  {incomeSources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              )}
            </FieldGroup>
          )}

          {form.type === "Deposito" && form.incomeDeductionSource !== "Ninguna" && form.incomeDeductionSource !== "SaldoDisponible" && (
            <div className="mb-3 flex gap-4 text-sm text-ink-secondary">
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={form.amountMode === "fixed"}
                  onChange={() => setForm({ ...form, amountMode: "fixed" })}
                />
                Cantidad fija
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="radio"
                  checked={form.amountMode === "percentage"}
                  onChange={() => setForm({ ...form, amountMode: "percentage" })}
                />
                Porcentaje
              </label>
            </div>
          )}

          {form.type === "Deposito" &&
          form.incomeDeductionSource !== "Ninguna" &&
          form.incomeDeductionSource !== "SaldoDisponible" &&
          form.amountMode === "percentage" ? (
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
          ) : (
            <FieldGroup>
              <Label>Monto</Label>
              <Input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              {goal.suggestedMonthlyContribution !== null && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, amount: String(goal.suggestedMonthlyContribution) })}
                  className="mt-1 text-xs text-brand hover:underline"
                >
                  Usar sugerido: {formatMoney(goal.suggestedMonthlyContribution, goal.currencyCode)}
                </button>
              )}
            </FieldGroup>
          )}
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
            <Label>Nota (opcional)</Label>
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </FieldGroup>
          {form.type === "Deposito" && (
            <FieldGroup>
              <Label>¿De dónde retiras este efectivo?</Label>
              <Input
                required
                list="withdrawn-from-options"
                value={form.withdrawnFrom}
                onChange={(e) => setForm({ ...form, withdrawnFrom: e.target.value })}
                placeholder="Nequi, Bancolombia, Efectivo..."
              />
              <datalist id="withdrawn-from-options">
                {Array.from(
                  new Set(movements.map((m) => m.withdrawnFrom).filter((v): v is string => !!v)),
                ).map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </FieldGroup>
          )}
          {form.type === "Retiro" && (
            <FieldGroup>
              <Label>¿A dónde llega este efectivo?</Label>
              <Input
                required
                list="deposited-to-options"
                value={form.depositedTo}
                onChange={(e) => setForm({ ...form, depositedTo: e.target.value })}
                placeholder="Nequi, Bancolombia, Efectivo..."
              />
              <datalist id="deposited-to-options">
                {Array.from(
                  new Set(movements.map((m) => m.depositedTo).filter((v): v is string => !!v)),
                ).map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </FieldGroup>
          )}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Guardando..." : editingMovementId ? "Guardar cambios" : "Registrar movimiento"}
          </Button>
        </form>
      </Modal>

      <Modal open={goalModalOpen} onClose={() => setGoalModalOpen(false)} title="Editar bolsillo">
        <form onSubmit={handleUpdateGoal}>
          <FieldGroup>
            <Label>Nombre</Label>
            <Input
              required
              value={goalForm.name}
              onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup>
            <Label>Ícono</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setGoalForm({ ...goalForm, icon: emoji })}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg ${
                    goalForm.icon === emoji ? "border-brand bg-brand-soft" : "border-line bg-surface"
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
                value={goalForm.targetAmount}
                onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup>
              <Label>Moneda</Label>
              <Select
                value={goalForm.currencyCode}
                onChange={(e) => setGoalForm({ ...goalForm, currencyCode: e.target.value })}
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
              value={goalForm.targetDate}
              onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
            />
          </FieldGroup>
          <label className="mb-3 flex items-center gap-2 text-sm text-ink-secondary">
            <input
              type="checkbox"
              checked={goalForm.usePercentage}
              onChange={(e) => setGoalForm({ ...goalForm, usePercentage: e.target.checked })}
            />
            Sugerir aporte mensual como % de ingresos
          </label>
          {goalForm.usePercentage && (
            <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-line bg-surface-hover p-3">
              <FieldGroup>
                <Label>Porcentaje</Label>
                <Input
                  required
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={goalForm.percentage}
                  onChange={(e) => setGoalForm({ ...goalForm, percentage: e.target.value })}
                />
              </FieldGroup>
              <FieldGroup>
                <Label>Sobre</Label>
                <Select
                  value={goalForm.incomeSourceFilter}
                  onChange={(e) => setGoalForm({ ...goalForm, incomeSourceFilter: e.target.value })}
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
          <Button type="submit" disabled={savingGoal} className="w-full">
            {savingGoal ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
