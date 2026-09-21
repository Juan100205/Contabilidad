"use client";

import { clsx } from "clsx";
import { Plus, Trash2, Settings2, ChevronLeft, ChevronRight, RefreshCw, CalendarPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label, FieldGroup, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { AmountCalcInput } from "@/components/ui/AmountCalcInput";
import { api, ApiError } from "@/lib/api";
import { formatMoney, formatDate, todayIso } from "@/lib/format";
import { evaluateExpression } from "@/lib/calc";
import { WEEKDAY_SHORT_LABELS } from "@/lib/labels";
import type { CalendarDay, Currency, ScheduledTemplate, WeeklyBudgetTemplate } from "@/lib/types";

const WEEKS_SHOWN = 5;
const WEEKDAY_FULL_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

type TemplateAmountKey =
  | "mondayAmount"
  | "tuesdayAmount"
  | "wednesdayAmount"
  | "thursdayAmount"
  | "fridayAmount"
  | "saturdayAmount"
  | "sundayAmount";

const TEMPLATE_FIELDS: { key: TemplateAmountKey; label: string }[] = [
  { key: "mondayAmount", label: "Lunes" },
  { key: "tuesdayAmount", label: "Martes" },
  { key: "wednesdayAmount", label: "Miércoles" },
  { key: "thursdayAmount", label: "Jueves" },
  { key: "fridayAmount", label: "Viernes" },
  { key: "saturdayAmount", label: "Sábado" },
  { key: "sundayAmount", label: "Domingo" },
];

const emptyTemplateForm: Record<TemplateAmountKey, string> & {
  currencyCode: string;
  effectiveFrom: string;
  storageLocation: string;
  withdrawnFrom: string;
} = {
  mondayAmount: "",
  tuesdayAmount: "",
  wednesdayAmount: "",
  thursdayAmount: "",
  fridayAmount: "",
  saturdayAmount: "",
  sundayAmount: "",
  currencyCode: "COP",
  effectiveFrom: todayIso(),
  storageLocation: "Efectivo",
  withdrawnFrom: "",
};

function weeklyTotal(t: {
  mondayAmount: number;
  tuesdayAmount: number;
  wednesdayAmount: number;
  thursdayAmount: number;
  fridayAmount: number;
  saturdayAmount: number;
  sundayAmount: number;
}): number {
  return (
    t.mondayAmount +
    t.tuesdayAmount +
    t.wednesdayAmount +
    t.thursdayAmount +
    t.fridayAmount +
    t.saturdayAmount +
    t.sundayAmount
  );
}
const emptyEntryForm = { description: "", amount: "" };

function parseIsoDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

function addDaysIso(iso: string, delta: number): string {
  const { year, month, day } = parseIsoDate(iso);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function startOfWeekIso(iso: string): string {
  const { year, month, day } = parseIsoDate(iso);
  const d = new Date(Date.UTC(year, month - 1, day));
  const diff = (d.getUTCDay() + 6) % 7; // días desde el lunes
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

function weekdayLabel(iso: string): string {
  const { year, month, day } = parseIsoDate(iso);
  return WEEKDAY_FULL_LABELS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

export default function CalendarioPage() {
  const [template, setTemplate] = useState<WeeklyBudgetTemplate | null>(null);
  const [anchorMonday, setAnchorMonday] = useState(() => startOfWeekIso(todayIso()));
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [scheduledTemplates, setScheduledTemplates] = useState<ScheduledTemplate[]>([]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [entryForm, setEntryForm] = useState(emptyEntryForm);
  const [addingEntry, setAddingEntry] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [tmpl, currs] = await Promise.all([
        api.get<WeeklyBudgetTemplate | null>("/api/daily-budget/template"),
        api.get<Currency[]>("/api/currencies"),
      ]);
      setTemplate(tmpl);
      setCurrencies(currs);
      if (currs.length && !currs.some((c) => c.code === templateForm.currencyCode)) {
        setTemplateForm((f) => ({ ...f, currencyCode: currs[0].code }));
      }

      if (tmpl) {
        const calendarDays = await api.get<CalendarDay[]>(
          `/api/daily-budget/calendar?start=${anchorMonday}&weeks=${WEEKS_SHOWN}`,
        );
        setDays(calendarDays);
        // El GET de calendario puede recalcular la Meta del bolsillo (proyección del
        // calendario), así que se vuelve a pedir la plantilla para reflejarla.
        setTemplate(await api.get<WeeklyBudgetTemplate | null>("/api/daily-budget/template"));
      } else {
        setDays([]);
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
  }, [anchorMonday]);

  async function loadScheduledTemplates() {
    try {
      setScheduledTemplates(await api.get<ScheduledTemplate[]>("/api/daily-budget/templates"));
    } catch {
      setScheduledTemplates([]);
    }
  }

  function openTemplateModal() {
    if (template) {
      setTemplateForm({
        mondayAmount: String(template.mondayAmount),
        tuesdayAmount: String(template.tuesdayAmount),
        wednesdayAmount: String(template.wednesdayAmount),
        thursdayAmount: String(template.thursdayAmount),
        fridayAmount: String(template.fridayAmount),
        saturdayAmount: String(template.saturdayAmount),
        sundayAmount: String(template.sundayAmount),
        currencyCode: template.currencyCode,
        effectiveFrom: template.effectiveFrom,
        storageLocation: template.storageLocation ?? "",
        withdrawnFrom: template.withdrawnFrom ?? "",
      });
    }
    loadScheduledTemplates();
    setTemplateModalOpen(true);
  }

  function editScheduledTemplate(t: ScheduledTemplate) {
    setTemplateForm((f) => ({
      mondayAmount: String(t.mondayAmount),
      tuesdayAmount: String(t.tuesdayAmount),
      wednesdayAmount: String(t.wednesdayAmount),
      thursdayAmount: String(t.thursdayAmount),
      fridayAmount: String(t.fridayAmount),
      saturdayAmount: String(t.saturdayAmount),
      sundayAmount: String(t.sundayAmount),
      currencyCode: t.currencyCode,
      effectiveFrom: t.effectiveFrom,
      storageLocation: f.storageLocation,
      withdrawnFrom: t.withdrawnFrom ?? "",
    }));
  }

  function scheduleNewChange() {
    const nextWeekFromToday = addDaysIso(startOfWeekIso(todayIso()), 7);
    const afterLastScheduled = scheduledTemplates.length
      ? addDaysIso(startOfWeekIso(scheduledTemplates[scheduledTemplates.length - 1].effectiveFrom), 7)
      : nextWeekFromToday;
    const effectiveFrom = afterLastScheduled > nextWeekFromToday ? afterLastScheduled : nextWeekFromToday;
    setTemplateForm((f) => ({ ...emptyTemplateForm, effectiveFrom, storageLocation: f.storageLocation }));
  }

  async function handleDeleteScheduledTemplate(id: string) {
    if (!confirm("¿Eliminar este cambio programado?")) return;
    try {
      await api.delete(`/api/daily-budget/templates/${id}`);
      await loadScheduledTemplates();
      await load();
    } catch {
      alert("No se pudo eliminar.");
    }
  }

  async function handleSaveTemplate(e: FormEvent) {
    e.preventDefault();
    const amounts: Record<string, number> = {};
    for (const field of TEMPLATE_FIELDS) {
      const value = evaluateExpression(templateForm[field.key] || "0");
      if (value === null) {
        alert(`El monto de ${field.label} no es válido.`);
        return;
      }
      amounts[field.key] = value;
    }

    setSavingTemplate(true);
    try {
      const saved = await api.put<WeeklyBudgetTemplate>("/api/daily-budget/template", {
        ...amounts,
        currencyCode: templateForm.currencyCode,
        effectiveFrom: templateForm.effectiveFrom,
        withdrawnFrom: templateForm.withdrawnFrom || null,
      });
      await api.patch(`/api/savings-goals/${saved.savingsGoalId}/storage-location`, {
        storageLocation: templateForm.storageLocation || null,
      });
      setTemplateModalOpen(false);
      await load();
    } catch {
      alert("No se pudo guardar el presupuesto.");
    } finally {
      setSavingTemplate(false);
    }
  }

  function selectDay(day: CalendarDay) {
    setSelectedDate(day.date);
    setEntryForm(emptyEntryForm);
  }

  const selectedDay = days.find((d) => d.date === selectedDate) ?? null;

  async function handleAddEntry(e: FormEvent) {
    e.preventDefault();
    if (!selectedDay) return;
    const amount = evaluateExpression(entryForm.amount);
    if (amount === null) {
      alert("El monto ingresado no es válido.");
      return;
    }

    setAddingEntry(true);
    try {
      await api.post(`/api/daily-budget/day/${selectedDay.date}/entries`, {
        description: entryForm.description,
        amount,
      });
      setEntryForm(emptyEntryForm);
      await load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo agregar el gasto.");
    } finally {
      setAddingEntry(false);
    }
  }

  async function handleDeleteEntry(id: string) {
    if (!confirm("¿Eliminar este gasto? (se devuelve el monto al bolsillo Diario)")) return;
    try {
      await api.delete(`/api/daily-budget/entries/${id}`);
      await load();
    } catch {
      alert("No se pudo eliminar el gasto.");
    }
  }

  const weeks = chunk(days, 7);
  const today = todayIso();

  function cellTone(day: CalendarDay): string {
    if (day.spentAmount === 0) return "bg-surface";
    return day.spentAmount > day.plannedAmount ? "bg-critical/10" : "bg-good/10";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-primary">Calendario</h1>
          <p className="text-sm text-ink-secondary">
            {template
              ? "Presupuesto por día de la semana, descontado del bolsillo \"Diario\""
              : "Gastos chiquitos del día a día: café, almuerzo, transporte..."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {template && (
            <Link href={`/ahorros/${template.savingsGoalId}`} className="text-right hover:underline">
              <p className="text-xs text-ink-secondary">
                Saldo &quot;Diario&quot;{template.storageLocation && ` · 📍 ${template.storageLocation}`}
                {template.withdrawnFrom && ` · retirado de ${template.withdrawnFrom}`}
              </p>
              <p className="tabular-money text-sm font-bold text-ink-primary">
                {formatMoney(template.walletBalance, template.currencyCode)}
              </p>
              <p className="text-xs text-ink-muted">
                Meta {formatMoney(template.walletTarget, template.currencyCode)}
              </p>
            </Link>
          )}
          <Button variant="secondary" onClick={openTemplateModal}>
            <Settings2 size={16} /> {template ? "Ajustar presupuesto" : "Configurar"}
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
        <Card>
          <p className="py-8 text-center text-sm text-ink-muted">Cargando...</p>
        </Card>
      ) : !template ? (
        <Card>
          <p className="py-8 text-center text-sm text-ink-muted">
            Aún no has configurado tu presupuesto de día a día.
          </p>
          <Button onClick={openTemplateModal} className="mx-auto">
            <Plus size={16} /> Configurar presupuesto
          </Button>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setAnchorMonday((m) => addDaysIso(m, -7))}>
              <ChevronLeft size={16} /> Anterior
            </Button>
            <Button variant="ghost" onClick={() => setAnchorMonday(startOfWeekIso(today))}>
              Hoy
            </Button>
            <Button variant="ghost" onClick={() => setAnchorMonday((m) => addDaysIso(m, 7))}>
              Siguiente <ChevronRight size={16} />
            </Button>
          </div>

          {/* Calendario tipo grilla (sm y superior) */}
          <div className="hidden sm:block">
            <div className="mb-1 grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-ink-secondary">
              {WEEKDAY_SHORT_LABELS.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              {weeks.map((week) => (
                <div key={week[0]?.date}>
                  <p className="mb-1 flex items-center gap-2 text-xs font-medium text-ink-secondary">
                    Semana del {formatDate(week[0].date)} al {formatDate(week[6].date)}
                    {week[0].weekLoadWarning && <Badge tone="critical">No planificada</Badge>}
                  </p>
                  <div className="grid grid-cols-7 gap-1.5">
                    {week.map((day) => (
                      <button
                        key={day.date}
                        onClick={() => selectDay(day)}
                        className={clsx(
                          "rounded-lg border p-2 text-left text-xs transition-colors hover:border-brand",
                          cellTone(day),
                          day.date === today ? "border-brand" : "border-line",
                        )}
                      >
                        <p className="font-semibold text-ink-primary">{parseIsoDate(day.date).day}</p>
                        <p className="mt-1 text-ink-secondary">{formatMoney(day.plannedAmount, template.currencyCode)}</p>
                        {day.spentAmount > 0 && (
                          <p className={day.spentAmount > day.plannedAmount ? "text-critical" : "text-good"}>
                            {formatMoney(day.spentAmount, template.currencyCode)}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lista por semana (mobile) */}
          <div className="flex flex-col gap-4 sm:hidden">
            {weeks.map((week) => (
              <Card key={week[0]?.date}>
                <p className="mb-2 flex items-center gap-2 text-xs font-medium text-ink-secondary">
                  Semana del {formatDate(week[0].date)} al {formatDate(week[6].date)}
                  {week[0].weekLoadWarning && <Badge tone="critical">No planificada</Badge>}
                </p>
                <ul className="divide-y divide-line">
                  {week.map((day) => (
                    <li key={day.date}>
                      <button onClick={() => selectDay(day)} className="flex w-full items-center justify-between gap-3 py-2 text-left">
                        <div>
                          <p className="text-sm font-medium text-ink-primary">
                            {weekdayLabel(day.date)} {parseIsoDate(day.date).day}
                            {day.date === today && <Badge tone="good">Hoy</Badge>}
                          </p>
                          <p className="text-xs text-ink-secondary">
                            Presupuesto {formatMoney(day.plannedAmount, template.currencyCode)}
                          </p>
                        </div>
                        {day.spentAmount > 0 && (
                          <span
                            className={clsx(
                              "tabular-money text-sm font-medium",
                              day.spentAmount > day.plannedAmount ? "text-critical" : "text-good",
                            )}
                          >
                            {formatMoney(day.spentAmount, template.currencyCode)}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal open={templateModalOpen} onClose={() => setTemplateModalOpen(false)} title="Presupuesto de día a día">
        {scheduledTemplates.length > 0 && (
          <div className="mb-4 rounded-lg border border-line">
            <p className="border-b border-line px-3 py-2 text-xs font-medium text-ink-secondary">
              Cambios programados
            </p>
            <ul className="divide-y divide-line">
              {scheduledTemplates.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => editScheduledTemplate(t)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="text-sm text-ink-primary">
                      {t.effectiveFrom <= "2000-01-01" ? "Desde siempre" : `Desde el ${formatDate(t.effectiveFrom)}`}
                    </p>
                    <p className="text-xs text-ink-secondary">
                      {formatMoney(weeklyTotal(t), t.currencyCode)}/semana
                      {t.withdrawnFrom && ` · retirado de ${t.withdrawnFrom}`}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteScheduledTemplate(t.id)}
                    aria-label="Eliminar"
                    className="text-ink-muted hover:text-critical"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSaveTemplate}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs text-ink-secondary">
              Este total se descuenta del bolsillo &quot;Diario&quot; cuando gastes esa semana, y define la Meta del
              bolsillo (siempre que tus ingresos la respalden). El saldo lo cargas tú manualmente.
            </p>
            <button
              type="button"
              onClick={scheduleNewChange}
              className="flex shrink-0 items-center gap-1 text-xs text-brand hover:underline"
            >
              <CalendarPlus size={14} /> Programar otro cambio
            </button>
          </div>
          <FieldGroup>
            <Label>¿A partir de qué semana?</Label>
            <Input
              required
              type="date"
              value={templateForm.effectiveFrom}
              onChange={(e) => setTemplateForm({ ...templateForm, effectiveFrom: e.target.value })}
            />
            <p className="mt-1 text-xs text-ink-secondary">
              Aplica desde el lunes {formatDate(startOfWeekIso(templateForm.effectiveFrom || todayIso()))}.
            </p>
          </FieldGroup>
          {TEMPLATE_FIELDS.map((field) => (
            <FieldGroup key={field.key}>
              <Label>{field.label}</Label>
              <AmountCalcInput
                required
                value={templateForm[field.key]}
                currencyCode={templateForm.currencyCode}
                onChange={(v) => setTemplateForm({ ...templateForm, [field.key]: v })}
              />
            </FieldGroup>
          ))}
          <FieldGroup>
            <Label>Moneda</Label>
            <Select
              value={templateForm.currencyCode}
              onChange={(e) => setTemplateForm({ ...templateForm, currencyCode: e.target.value })}
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label>¿Dónde se guarda este dinero?</Label>
            <Input
              value={templateForm.storageLocation}
              onChange={(e) => setTemplateForm({ ...templateForm, storageLocation: e.target.value })}
              placeholder="Efectivo"
            />
          </FieldGroup>
          <FieldGroup>
            <Label>¿De dónde retiras este efectivo? (opcional)</Label>
            <Input
              list="withdrawn-from-options"
              value={templateForm.withdrawnFrom}
              onChange={(e) => setTemplateForm({ ...templateForm, withdrawnFrom: e.target.value })}
              placeholder="Nequi, Bancolombia..."
            />
            <datalist id="withdrawn-from-options">
              {Array.from(new Set(scheduledTemplates.map((t) => t.withdrawnFrom).filter((v): v is string => !!v))).map(
                (v) => (
                  <option key={v} value={v} />
                ),
              )}
            </datalist>
            <p className="mt-1 text-xs text-ink-secondary">
              El dinero siempre queda en efectivo; esto solo deja registrado de qué cuenta salió.
            </p>
          </FieldGroup>
          <Button type="submit" disabled={savingTemplate} className="w-full">
            {savingTemplate ? "Guardando..." : "Guardar presupuesto"}
          </Button>
        </form>
      </Modal>

      <Modal
        open={selectedDay !== null}
        onClose={() => setSelectedDate(null)}
        title={selectedDay ? `${weekdayLabel(selectedDay.date)} ${formatDate(selectedDay.date)}` : ""}
      >
        {selectedDay && template && (
          <div className="flex flex-col gap-4">
            <div>
              {selectedDay.weekLoadWarning && (
                <p className="mb-2 rounded-lg bg-critical/10 p-2 text-xs text-critical">{selectedDay.weekLoadWarning}</p>
              )}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div>
                  <p className="text-ink-secondary">Presupuestado</p>
                  <p className="tabular-money font-semibold text-ink-primary">
                    {formatMoney(selectedDay.plannedAmount, template.currencyCode)}
                  </p>
                </div>
                <div>
                  <p className="text-ink-secondary">Gastado</p>
                  <p className="tabular-money font-semibold text-ink-primary">
                    {formatMoney(selectedDay.spentAmount, template.currencyCode)}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-center text-xs text-ink-secondary">
                Saldo del bolsillo Diario: <span className="font-medium">{formatMoney(template.walletBalance, template.currencyCode)}</span>
                {" "}· Meta: <span className="font-medium">{formatMoney(template.walletTarget, template.currencyCode)}</span>
              </p>
            </div>

            <div>
              {selectedDay.entries.length === 0 ? (
                <p className="py-2 text-center text-xs text-ink-muted">Aún no has registrado nada este día.</p>
              ) : (
                <ul className="mb-2 divide-y divide-line">
                  {selectedDay.entries.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-3 py-2">
                      <p className="truncate text-sm text-ink-primary">{entry.description}</p>
                      <div className="flex items-center gap-3">
                        <span className="tabular-money whitespace-nowrap text-sm font-medium text-ink-primary">
                          -{formatMoney(entry.amount, template.currencyCode)}
                        </span>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
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

              <form onSubmit={handleAddEntry} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <Input
                  required
                  placeholder="Café, almuerzo, transporte..."
                  value={entryForm.description}
                  onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                  className="sm:flex-1"
                />
                <div className="sm:w-32">
                  <AmountCalcInput
                    value={entryForm.amount}
                    currencyCode={template.currencyCode}
                    onChange={(v) => setEntryForm({ ...entryForm, amount: v })}
                  />
                </div>
                <Button type="submit" disabled={addingEntry}>
                  <Plus size={16} />
                </Button>
              </form>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
