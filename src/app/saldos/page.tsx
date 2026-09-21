import { Scale, ChevronDown, MapPin } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DashboardControls } from "@/components/DashboardControls";
import { api, API_URL } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import { ESTADO_GASTO_LABELS, ESTADO_INGRESO_LABELS, CATEGORIA_LABELS } from "@/lib/labels";
import type { BalanceSummary, Currency } from "@/lib/types";

function DetailToggle({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-1 text-xs text-ink-muted">
      {count} {count === 1 ? "registro" : "registros"}
      <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
    </span>
  );
}

export const dynamic = "force-dynamic";

async function safeGetSummary(query: string): Promise<BalanceSummary | null> {
  try {
    return await api.get<BalanceSummary>(`/api/balances/summary?${query}`);
  } catch {
    return null;
  }
}

export default async function SaldosPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string; currency?: string };
}) {
  const now = new Date();
  const year = Number(searchParams.year) || now.getFullYear();
  const month = Number(searchParams.month) || now.getMonth() + 1;
  const currency = searchParams.currency || "COP";

  const [summary, currencies] = await Promise.all([
    safeGetSummary(`year=${year}&month=${month}&baseCurrency=${currency}`),
    api.get<Currency[]>("/api/currencies").catch(() => [] as Currency[]),
  ]);

  if (!summary) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
        <p className="font-display text-lg font-semibold text-ink-primary">
          No se pudo conectar con el backend
        </p>
        <p className="max-w-sm text-sm text-ink-secondary">
          Verifica que la API de .NET esté corriendo en{" "}
          <code className="rounded bg-surface-raised px-1.5 py-0.5">{API_URL}</code>.
        </p>
      </div>
    );
  }

  const isSaldoPositive = summary.saldo >= 0;
  const isAvailablePositive = summary.available >= 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-primary">Saldos</h1>
          <p className="text-sm text-ink-secondary">
            Cuánto de tus ingresos ya está comprometido y cuánto te queda libre para usar.
          </p>
        </div>
        <DashboardControls year={year} month={month} currency={currency} currencies={currencies} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className={isSaldoPositive ? "bg-good/5" : "bg-critical/5"}>
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${isSaldoPositive ? "bg-good/15 text-good" : "bg-critical/15 text-critical"}`}
            >
              <Scale size={22} />
            </div>
            <div>
              <p className="text-sm text-ink-secondary">Saldo (lo que tienes ahorita)</p>
              <p className={`tabular-money font-display text-3xl font-bold ${isSaldoPositive ? "text-good" : "text-critical"}`}>
                {formatMoney(summary.saldo, summary.currencyCode)}
              </p>
              <p className="mt-1 text-xs text-ink-muted">Solo descuenta gastos ya pagados.</p>
            </div>
          </div>
        </Card>

        <Card className={isAvailablePositive ? "bg-good/5" : "bg-critical/5"}>
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${isAvailablePositive ? "bg-good/15 text-good" : "bg-critical/15 text-critical"}`}
            >
              <Scale size={22} />
            </div>
            <div>
              <p className="text-sm text-ink-secondary">Disponible para usar este mes</p>
              <p className={`tabular-money font-display text-3xl font-bold ${isAvailablePositive ? "text-good" : "text-critical"}`}>
                {formatMoney(summary.available, summary.currencyCode)}
              </p>
              <p className="mt-1 text-xs text-ink-muted">Saldo menos gastos pendientes por pagar.</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="!p-0">
        <p className="border-b border-line px-4 py-3 text-sm font-medium text-ink-primary sm:px-5">
          Cómo se calculó (toca cada línea para ver el detalle)
        </p>
        <div className="divide-y divide-line">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 sm:px-5">
              <span className="text-sm text-ink-secondary">
                Ingresos del mes
                <span className="ml-1.5 text-xs text-ink-muted">
                  (recibidos {formatMoney(summary.totalIncomeRecibido, summary.currencyCode)} · proyectados{" "}
                  {formatMoney(summary.totalIncomeProyectado, summary.currencyCode)})
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className="tabular-money text-sm font-medium text-good">
                  +{formatMoney(summary.totalIncome, summary.currencyCode)}
                </span>
                <DetailToggle count={summary.incomes.length} />
              </span>
            </summary>
            {summary.incomes.length === 0 ? (
              <p className="px-4 pb-3 text-xs text-ink-muted sm:px-5">Sin ingresos este periodo.</p>
            ) : (
              <ul className="divide-y divide-line bg-surface-raised px-4 sm:px-5">
                {summary.incomes.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="truncate text-ink-primary">{i.description}</p>
                      <p className="flex items-center gap-1.5 text-ink-secondary">
                        {i.source || "Sin fuente"} · {formatDate(i.date)}
                        {i.storageLocation && ` · 📍 ${i.storageLocation}`}
                        <Badge tone={i.status === "Recibido" ? "good" : "warning"}>
                          {ESTADO_INGRESO_LABELS[i.status]}
                        </Badge>
                      </p>
                    </div>
                    <span className="tabular-money whitespace-nowrap font-medium text-ink-primary">
                      {formatMoney(i.amount, i.currencyCode)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </details>

          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 sm:px-5">
              <span className="text-sm text-ink-secondary">
                Gastos
                <span className="ml-1.5 text-xs text-ink-muted">
                  (pagados {formatMoney(summary.totalExpensesPagados, summary.currencyCode)} · pendientes{" "}
                  {formatMoney(summary.totalExpensesPendientes, summary.currencyCode)})
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className="tabular-money text-sm font-medium text-critical">
                  -{formatMoney(summary.totalExpenses, summary.currencyCode)}
                </span>
                <DetailToggle count={summary.expenses.length} />
              </span>
            </summary>
            {summary.expenses.length === 0 ? (
              <p className="px-4 pb-3 text-xs text-ink-muted sm:px-5">Sin gastos este periodo.</p>
            ) : (
              <ul className="divide-y divide-line bg-surface-raised px-4 sm:px-5">
                {summary.expenses.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="truncate text-ink-primary">{e.description}</p>
                      <p className="flex items-center gap-1.5 text-ink-secondary">
                        {CATEGORIA_LABELS[e.category]} · {formatDate(e.date)}
                        <Badge tone={e.status === "Pagado" ? "good" : "warning"}>
                          {ESTADO_GASTO_LABELS[e.status]}
                        </Badge>
                      </p>
                    </div>
                    <span className="tabular-money whitespace-nowrap font-medium text-ink-primary">
                      {formatMoney(e.amount, e.currencyCode)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </details>

          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 sm:px-5">
              <span className="text-sm text-ink-secondary">
                Pagos de deuda
                <span className="ml-1.5 text-xs text-ink-muted">
                  (pagados {formatMoney(summary.totalDebtPaymentsPagados, summary.currencyCode)} · pendientes{" "}
                  {formatMoney(summary.totalDebtPaymentsPendientes, summary.currencyCode)})
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className="tabular-money text-sm font-medium text-critical">
                  -{formatMoney(summary.totalDebtPayments, summary.currencyCode)}
                </span>
                <DetailToggle count={summary.debtPayments.length} />
              </span>
            </summary>
            {summary.debtPayments.length === 0 ? (
              <p className="px-4 pb-3 text-xs text-ink-muted sm:px-5">Sin pagos de deuda este periodo.</p>
            ) : (
              <ul className="divide-y divide-line bg-surface-raised px-4 sm:px-5">
                {summary.debtPayments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="truncate text-ink-primary">{p.debtName}</p>
                      <p className="flex items-center gap-1.5 text-ink-secondary">
                        {formatDate(p.date)}
                        <Badge tone={p.status === "Pagado" ? "good" : "warning"}>
                          {ESTADO_GASTO_LABELS[p.status]}
                        </Badge>
                      </p>
                    </div>
                    <span className="tabular-money whitespace-nowrap font-medium text-ink-primary">
                      {formatMoney(p.amount, p.currencyCode)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </details>

          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 sm:px-5">
              <span className="text-sm text-ink-secondary">
                Neto en bolsillos {summary.totalSavingsNet >= 0 ? "(depositado)" : "(retirado)"}
              </span>
              <span className="flex items-center gap-3">
                <span
                  className={`tabular-money text-sm font-medium ${summary.totalSavingsNet >= 0 ? "text-critical" : "text-good"}`}
                >
                  {summary.totalSavingsNet >= 0 ? "-" : "+"}
                  {formatMoney(Math.abs(summary.totalSavingsNet), summary.currencyCode)}
                </span>
                <DetailToggle count={summary.savingsMovements.length} />
              </span>
            </summary>
            {summary.savingsMovements.length === 0 ? (
              <p className="px-4 pb-3 text-xs text-ink-muted sm:px-5">Sin movimientos en bolsillos este periodo.</p>
            ) : (
              <ul className="divide-y divide-line bg-surface-raised px-4 sm:px-5">
                {summary.savingsMovements.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="truncate text-ink-primary">{m.goalName}</p>
                      <p className="text-ink-secondary">{formatDate(m.date)}</p>
                    </div>
                    <span
                      className={`tabular-money whitespace-nowrap font-medium ${m.type === "Deposito" ? "text-good" : "text-critical"}`}
                    >
                      {m.type === "Deposito" ? "+" : "-"}
                      {formatMoney(m.amount, m.currencyCode)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </details>

          <div className="flex items-center justify-between px-4 py-3 text-sm font-medium text-ink-secondary sm:px-5">
            <span>Saldo (solo pagados)</span>
            <span className={`tabular-money ${isSaldoPositive ? "text-good" : "text-critical"}`}>
              {formatMoney(summary.saldo, summary.currencyCode)}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-base font-semibold text-ink-primary sm:px-5">
            <span>Disponible</span>
            <span className={`tabular-money ${isAvailablePositive ? "text-good" : "text-critical"}`}>
              {formatMoney(summary.available, summary.currencyCode)}
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <p className="mb-3 text-sm font-medium text-ink-primary">Ingresos por fuente</p>
        {summary.incomeBySource.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">
            No has registrado ingresos este mes.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {summary.incomeBySource.map((item) => (
              <li key={item.source} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink-primary">{item.source}</span>
                <span className="tabular-money font-medium text-ink-primary">
                  {formatMoney(item.amount, summary.currencyCode)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-medium text-ink-primary">
            <MapPin size={16} /> Tu plata líquida, por ubicación
          </p>
        </div>
        <p className="mb-3 text-xs text-ink-secondary">
          Efectivo real que tienes ahorita en cada cuenta (Nequi, Bancolombia, Efectivo...): suma tus
          ingresos ya recibidos, resta gastos y pagos de deuda ya pagados desde ahí, y ajusta lo que
          entra/sale de tus bolsillos de ahorro. No cambia con el mes que estés viendo.
        </p>
        {summary.cashByLocation.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">
            Aún no has registrado de dónde sale/entra tu dinero. Indícalo al crear un ingreso, un
            gasto o un pago de deuda.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {summary.cashByLocation.map((item) => (
              <li key={item.location} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink-primary">{item.location}</span>
                <span
                  className={`tabular-money font-medium ${item.amount >= 0 ? "text-ink-primary" : "text-critical"}`}
                >
                  {formatMoney(item.amount, summary.currencyCode)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-medium text-ink-primary">
            <MapPin size={16} /> Ahorrado en bolsillos, por ubicación
          </p>
          <Link href="/ahorros" className="text-xs font-medium text-brand hover:underline">
            Ver bolsillos
          </Link>
        </div>
        <p className="mb-3 text-xs text-ink-secondary">
          Saldo actual de tus bolsillos de ahorro, agrupado por dónde lo tienes guardado (no cambia
          con el mes que estés viendo).
        </p>
        {summary.savingsByLocation.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">Aún no tienes bolsillos de ahorro.</p>
        ) : (
          <ul className="divide-y divide-line">
            {summary.savingsByLocation.map((item) => (
              <li key={item.location} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink-primary">{item.location}</span>
                <span className="tabular-money font-medium text-ink-primary">
                  {formatMoney(item.amount, summary.currencyCode)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
