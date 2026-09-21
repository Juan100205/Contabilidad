"use client";

import { ArrowLeft, Plus, Pencil, Trash2, Check, Undo2 } from "lucide-react";
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
import { ESTADO_DEUDA_LABELS, ESTADO_GASTO_LABELS, TIPO_INTERES_LABELS } from "@/lib/labels";
import type {
  BalanceSummary,
  Currency,
  Debt,
  DebtPayment,
  EstadoGasto,
  FuenteDescuentoPago,
  IncomeEntry,
  TipoInteres,
} from "@/lib/types";

const emptyForm = {
  amount: "",
  date: todayIso(),
  note: "",
  incomeDeductionSource: "Ninguna" as FuenteDescuentoPago,
  incomeSourceFilter: "",
  status: "Pagado" as EstadoGasto,
  storageLocation: "",
};

const emptyDebtForm = {
  name: "",
  creditor: "",
  principalAmount: "",
  currencyCode: "COP",
  annualInterestRate: "",
  interestType: "CompuestoMensual" as TipoInteres,
  minimumMonthlyPayment: "",
  startDate: todayIso(),
  dueDate: "",
};

export default function DeudaDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [debt, setDebt] = useState<Debt | null>(null);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [incomeSources, setIncomeSources] = useState<string[]>([]);
  const [storageLocations, setStorageLocations] = useState<string[]>([]);
  const [balance, setBalance] = useState<BalanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [savingDebt, setSavingDebt] = useState(false);
  const [debtForm, setDebtForm] = useState(emptyDebtForm);

  async function load() {
    setLoading(true);
    try {
      const nowDate = new Date();
      const [d, p, income, bal, currs] = await Promise.all([
        api.get<Debt>(`/api/debts/${params.id}`),
        api.get<DebtPayment[]>(`/api/debts/${params.id}/payments?year=${year}&month=${month}`),
        api.get<IncomeEntry[]>("/api/income"),
        api
          .get<BalanceSummary>(
            `/api/balances/summary?year=${nowDate.getFullYear()}&month=${nowDate.getMonth() + 1}&baseCurrency=COP`,
          )
          .catch(() => null),
        api.get<Currency[]>("/api/currencies").catch(() => [] as Currency[]),
      ]);
      setDebt(d);
      setPayments(p);
      setIncomeSources(Array.from(new Set(income.map((i) => i.source).filter(Boolean))));
      setStorageLocations(
        Array.from(
          new Set([...income.map((i) => i.storageLocation), ...p.map((x) => x.storageLocation)].filter(
            (v): v is string => !!v,
          )),
        ),
      );
      setBalance(bal);
      setCurrencies(currs);
    } finally {
      setLoading(false);
    }
  }

  function openEditDebtModal() {
    if (!debt) return;
    setDebtForm({
      name: debt.name,
      creditor: debt.creditor,
      principalAmount: String(debt.principalAmount),
      currencyCode: debt.currencyCode,
      annualInterestRate: String(debt.annualInterestRate),
      interestType: debt.interestType,
      minimumMonthlyPayment: String(debt.minimumMonthlyPayment),
      startDate: debt.startDate.slice(0, 10),
      dueDate: debt.dueDate ? debt.dueDate.slice(0, 10) : "",
    });
    setDebtModalOpen(true);
  }

  async function handleUpdateDebt(e: FormEvent) {
    e.preventDefault();
    setSavingDebt(true);
    try {
      await api.put(`/api/debts/${params.id}`, {
        name: debtForm.name,
        creditor: debtForm.creditor,
        principalAmount: Number(debtForm.principalAmount),
        currencyCode: debtForm.currencyCode,
        annualInterestRate: Number(debtForm.annualInterestRate),
        interestType: debtForm.interestType,
        minimumMonthlyPayment: Number(debtForm.minimumMonthlyPayment || 0),
        startDate: debtForm.startDate,
        dueDate: debtForm.dueDate || null,
      });
      setDebtModalOpen(false);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo actualizar la deuda.");
    } finally {
      setSavingDebt(false);
    }
  }

  async function handleDeleteDebt() {
    if (!debt) return;
    if (!confirm(`¿Eliminar la deuda "${debt.name}"? Esto también elimina todo su historial de pagos. No se puede deshacer.`)) {
      return;
    }
    try {
      await api.delete(`/api/debts/${params.id}`);
      router.push("/deudas");
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo eliminar la deuda.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, year, month]);

  function openCreateModal() {
    setEditingPaymentId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEditModal(p: DebtPayment) {
    setEditingPaymentId(p.id);
    setForm({
      amount: String(p.amount),
      date: p.date.slice(0, 10),
      note: p.note ?? "",
      incomeDeductionSource: p.incomeDeductionSource,
      incomeSourceFilter: p.incomeSourceFilter ?? "",
      status: p.status,
      storageLocation: p.storageLocation ?? "",
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingPaymentId(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.incomeDeductionSource === "IngresoEspecifico" && !form.incomeSourceFilter) {
      alert("Elige de qué fuente de ingreso se descuenta este pago.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        amount: Number(form.amount),
        date: form.date,
        note: form.note || null,
        incomeDeductionSource: form.incomeDeductionSource,
        incomeSourceFilter: form.incomeDeductionSource === "IngresoEspecifico" ? form.incomeSourceFilter : null,
        status: form.status,
        storageLocation: form.storageLocation || null,
      };

      if (editingPaymentId) {
        await api.put(`/api/debts/${params.id}/payments/${editingPaymentId}`, payload);
      } else {
        await api.post(`/api/debts/${params.id}/payments`, payload);
      }
      closeModal();
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo guardar el pago.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePayment(id: string) {
    if (!confirm("¿Eliminar este pago? Se devuelve el capital abonado al saldo de la deuda.")) return;
    try {
      await api.delete(`/api/debts/${params.id}/payments/${id}`);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo eliminar el pago.");
    }
  }

  async function handleConfirmPayment(id: string) {
    if (!confirm("¿Confirmar este pago como pagado? Se recalcula el interés/capital contra el saldo actual y se aplica a la deuda.")) {
      return;
    }
    try {
      await api.post(`/api/debts/${params.id}/payments/${id}/confirm`, {});
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo confirmar el pago.");
    }
  }

  async function handleUnconfirmPayment(id: string) {
    if (!confirm("¿Regresar este pago a pendiente? Se devuelve el capital abonado al saldo de la deuda.")) {
      return;
    }
    try {
      await api.post(`/api/debts/${params.id}/payments/${id}/unconfirm`, {});
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo regresar el pago a pendiente.");
    }
  }

  function deductionLabel(p: DebtPayment): string | null {
    if (p.incomeDeductionSource === "Ninguna") return null;
    if (p.incomeDeductionSource === "TotalIngresos") return "Descontado del total de ingresos";
    if (p.incomeDeductionSource === "SaldoDisponible") return "Descontado del saldo disponible";
    return `Descontado de: ${p.incomeSourceFilter}`;
  }

  if (loading || !debt) {
    return <p className="py-8 text-center text-sm text-ink-muted">Cargando...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/deudas" className="flex items-center gap-1 text-sm text-ink-secondary hover:text-ink-primary">
        <ArrowLeft size={16} /> Volver a deudas
      </Link>

      <Card>
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-ink-primary">{debt.name}</h1>
            <p className="text-sm text-ink-secondary">{debt.creditor}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone={debt.status === "EnMora" ? "critical" : debt.status === "Pagada" ? "good" : "neutral"}>
              {ESTADO_DEUDA_LABELS[debt.status]}
            </Badge>
            <button
              onClick={openEditDebtModal}
              aria-label="Editar deuda"
              title="Editar deuda"
              className="text-ink-muted hover:text-ink-primary"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={handleDeleteDebt}
              aria-label="Eliminar deuda"
              title="Eliminar deuda"
              className="text-ink-muted hover:text-critical"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <ProgressBar value={debt.progressPercentage} colorClassName="bg-critical" />
        <div className="mt-2 flex justify-between text-sm text-ink-secondary">
          <span>{debt.progressPercentage.toFixed(1)}% pagado</span>
          <span>
            {formatMoney(debt.currentBalance, debt.currencyCode)} de{" "}
            {formatMoney(debt.principalAmount, debt.currencyCode)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Saldo pendiente" value={formatMoney(debt.currentBalance, debt.currencyCode)} />
          <Stat label="Pagado hasta la fecha" value={formatMoney(debt.totalPaid, debt.currencyCode)} />
          <Stat label="Tasa anual" value={`${debt.annualInterestRate}%`} />
          <Stat label="Tipo de interés" value={TIPO_INTERES_LABELS[debt.interestType]} small />
          <Stat label="Pago mínimo" value={formatMoney(debt.minimumMonthlyPayment, debt.currencyCode)} />
        </div>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-lg font-semibold text-ink-primary">Historial de pagos</h2>
        <div className="flex items-center gap-2">
          <MonthNav year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
          {debt.status !== "Pagada" && (
            <Button onClick={openCreateModal}>
              <Plus size={16} /> Registrar pago
            </Button>
          )}
        </div>
      </div>

      <Card>
        {payments.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">No hay pagos registrados este período.</p>
        ) : (
          <ul className="divide-y divide-line">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-medium text-ink-primary">
                    {formatDate(p.date)}
                    <Badge tone={p.status === "Pagado" ? "good" : "warning"}>{ESTADO_GASTO_LABELS[p.status]}</Badge>
                  </p>
                  <p className="text-xs text-ink-secondary">
                    Interés: {formatMoney(p.interestPortion, debt.currencyCode)} · Capital:{" "}
                    {formatMoney(p.principalPortion, debt.currencyCode)}
                    {p.note ? ` · ${p.note}` : ""}
                    {p.status === "Pendiente" && " (estimado, se recalcula al confirmar)"}
                  </p>
                  {deductionLabel(p) && <p className="text-xs text-brand">{deductionLabel(p)}</p>}
                  {p.storageLocation && <p className="text-xs text-ink-muted">📍 {p.storageLocation}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-money font-medium text-ink-primary">
                    {formatMoney(p.amount, debt.currencyCode)}
                  </span>
                  {p.status === "Pendiente" && (
                    <button
                      onClick={() => handleConfirmPayment(p.id)}
                      aria-label="Confirmar pago"
                      title="Confirmar pago"
                      className="text-ink-muted hover:text-good"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  {p.status === "Pagado" && p.canEdit && (
                    <button
                      onClick={() => handleUnconfirmPayment(p.id)}
                      aria-label="Regresar a pendiente"
                      title="Regresar a pendiente"
                      className="text-ink-muted hover:text-warning"
                    >
                      <Undo2 size={16} />
                    </button>
                  )}
                  {p.canEdit && (
                    <>
                      <button
                        onClick={() => openEditModal(p)}
                        aria-label="Editar"
                        className="text-ink-muted hover:text-ink-primary"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDeletePayment(p.id)}
                        aria-label="Eliminar"
                        className="text-ink-muted hover:text-critical"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={modalOpen} onClose={closeModal} title={editingPaymentId ? "Editar pago" : "Registrar pago"}>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Label>Monto del pago</Label>
            <Input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </FieldGroup>
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
          <FieldGroup>
            <Label>Estado</Label>
            <Select
              value={form.status}
              disabled={!!editingPaymentId}
              onChange={(e) => setForm({ ...form, status: e.target.value as EstadoGasto })}
            >
              <option value="Pagado">Pagado (se aplica ya al saldo)</option>
              <option value="Pendiente">Pendiente (proyectado, no afecta el saldo todavía)</option>
            </Select>
            {editingPaymentId && (
              <p className="mt-1 text-xs text-ink-secondary">
                Para cambiar de pendiente a pagado usa el botón de confirmar en la lista.
              </p>
            )}
          </FieldGroup>
          <FieldGroup>
            <Label>¿De dónde se descuenta este pago?</Label>
            <Select
              value={form.incomeDeductionSource}
              onChange={(e) =>
                setForm({ ...form, incomeDeductionSource: e.target.value as FuenteDescuentoPago, incomeSourceFilter: "" })
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
          {form.incomeDeductionSource === "IngresoEspecifico" && (
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
          <FieldGroup>
            <Label>¿De dónde sale físicamente?</Label>
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
          <p className="mb-4 text-xs text-ink-muted">
            El interés del periodo se calcula automáticamente sobre el saldo actual; el resto del
            pago abona a capital.
          </p>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Guardando..." : editingPaymentId ? "Guardar cambios" : "Registrar pago"}
          </Button>
        </form>
      </Modal>

      <Modal open={debtModalOpen} onClose={() => setDebtModalOpen(false)} title="Editar deuda">
        <form onSubmit={handleUpdateDebt}>
          <FieldGroup>
            <Label>Nombre</Label>
            <Input
              required
              value={debtForm.name}
              onChange={(e) => setDebtForm({ ...debtForm, name: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup>
            <Label>Acreedor</Label>
            <Input
              value={debtForm.creditor}
              onChange={(e) => setDebtForm({ ...debtForm, creditor: e.target.value })}
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
                value={debtForm.principalAmount}
                onChange={(e) => setDebtForm({ ...debtForm, principalAmount: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup>
              <Label>Moneda</Label>
              <Select
                value={debtForm.currencyCode}
                onChange={(e) => setDebtForm({ ...debtForm, currencyCode: e.target.value })}
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
                value={debtForm.annualInterestRate}
                onChange={(e) => setDebtForm({ ...debtForm, annualInterestRate: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup>
              <Label>Tipo de interés</Label>
              <Select
                value={debtForm.interestType}
                onChange={(e) => setDebtForm({ ...debtForm, interestType: e.target.value as TipoInteres })}
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
              value={debtForm.minimumMonthlyPayment}
              onChange={(e) => setDebtForm({ ...debtForm, minimumMonthlyPayment: e.target.value })}
            />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-3">
            <FieldGroup>
              <Label>Fecha de inicio</Label>
              <Input
                required
                type="date"
                value={debtForm.startDate}
                onChange={(e) => setDebtForm({ ...debtForm, startDate: e.target.value })}
              />
            </FieldGroup>
            <FieldGroup>
              <Label>Fecha límite (opcional)</Label>
              <Input
                type="date"
                value={debtForm.dueDate}
                onChange={(e) => setDebtForm({ ...debtForm, dueDate: e.target.value })}
              />
            </FieldGroup>
          </div>
          <Button type="submit" disabled={savingDebt} className="w-full">
            {savingDebt ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-lg bg-surface-raised p-3">
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className={small ? "text-sm font-medium text-ink-primary" : "tabular-money font-semibold text-ink-primary"}>
        {value}
      </p>
    </div>
  );
}
