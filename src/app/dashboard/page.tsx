import { Wallet, Receipt, CreditCard, PiggyBank, Scale, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { KpiCard } from "@/components/KpiCard";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { DashboardControls } from "@/components/DashboardControls";
import { TrendChart } from "@/components/charts/TrendChart";
import { CategoryDonut } from "@/components/charts/CategoryDonut";
import { api, API_URL } from "@/lib/api";
import { formatMoney, formatMoneyCompact, formatDate, todayIso } from "@/lib/format";
import { ESTADO_DEUDA_LABELS, CATEGORIA_LABELS } from "@/lib/labels";
import type { BalanceSummary, Currency, DashboardSummary, Expense } from "@/lib/types";

export const dynamic = "force-dynamic";

async function safeGetSummary(query: string): Promise<DashboardSummary | null> {
  try {
    return await api.get<DashboardSummary>(`/api/dashboard/summary?${query}`);
  } catch {
    return null;
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string; currency?: string };
}) {
  const now = new Date();
  const year = Number(searchParams.year) || now.getFullYear();
  const month = Number(searchParams.month) || now.getMonth() + 1;
  const currency = searchParams.currency || "COP";

  const [summary, currencies, balance, expenses] = await Promise.all([
    safeGetSummary(`year=${year}&month=${month}&baseCurrency=${currency}`),
    api.get<Currency[]>("/api/currencies").catch(() => [] as Currency[]),
    api.get<BalanceSummary>(`/api/balances/summary?year=${year}&month=${month}&baseCurrency=${currency}`).catch(() => null),
    api.get<Expense[]>(`/api/expenses?year=${year}&month=${month}`).catch(() => [] as Expense[]),
  ]);

  const pendingExpenses = expenses
    .filter((e) => e.status === "Pendiente")
    .sort((a, b) => a.date.localeCompare(b.date));
  const today = todayIso();

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-primary">Resumen financiero</h1>
          <p className="text-sm text-ink-secondary">Tu panorama de ingresos, deudas y ahorro.</p>
        </div>
        <DashboardControls year={year} month={month} currency={currency} currencies={currencies} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
        {balance && (
          <KpiCard
            label="Disponible este periodo"
            value={formatMoneyCompact(balance.available, currency)}
            fullValue={formatMoney(balance.available, currency)}
            icon={Scale}
            tone={balance.available >= 0 ? "good" : "critical"}
          />
        )}
        <KpiCard
          label="Ingresos del mes"
          value={formatMoneyCompact(summary.totalIncomeBase, currency)}
          fullValue={formatMoney(summary.totalIncomeBase, currency)}
          icon={Wallet}
          tone="good"
        />
        <KpiCard
          label="Gastos del mes"
          value={formatMoneyCompact(summary.totalExpensesBase, currency)}
          fullValue={formatMoney(summary.totalExpensesBase, currency)}
          icon={Receipt}
        />
        <KpiCard
          label="Deuda total"
          value={formatMoneyCompact(summary.totalDebtBase, currency)}
          fullValue={formatMoney(summary.totalDebtBase, currency)}
          icon={CreditCard}
          tone="critical"
        />
        <KpiCard
          label="Ahorro total"
          value={formatMoneyCompact(summary.totalSavingsBase, currency)}
          fullValue={formatMoney(summary.totalSavingsBase, currency)}
          icon={PiggyBank}
          tone="good"
        />
      </div>

      {pendingExpenses.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-warning" />
              <h2 className="font-display text-base font-semibold text-ink-primary">
                Gastos pendientes por pagar
              </h2>
            </div>
            <Link href="/gastos" className="text-xs font-medium text-brand hover:underline">
              Ver todos
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {pendingExpenses.slice(0, 6).map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-ink-primary">{e.description}</p>
                  <p className="text-xs text-ink-secondary">
                    {CATEGORIA_LABELS[e.category]} · {formatDate(e.date)}
                    {e.date < today && <span className="ml-1 text-critical">· vencido</span>}
                  </p>
                </div>
                <span className="tabular-money whitespace-nowrap font-medium text-ink-primary">
                  {formatMoney(e.amount, e.currencyCode)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h2 className="mb-2 font-display text-base font-semibold text-ink-primary">
            Ingresos vs. gastos — últimos 6 meses
          </h2>
          <TrendChart data={summary.lastSixMonths} baseCurrency={currency} />
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-2 font-display text-base font-semibold text-ink-primary">
            Gastos por categoría
          </h2>
          <CategoryDonut data={summary.expensesByCategory} baseCurrency={currency} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink-primary">
              Deudas activas
            </h2>
            <Link href="/deudas" className="text-xs font-medium text-brand hover:underline">
              Ver todas
            </Link>
          </div>
          {summary.activeDebts.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">
              No tienes deudas activas registradas.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {summary.activeDebts.slice(0, 5).map((debt) => (
                <li key={debt.id}>
                  <Link href={`/deudas/${debt.id}`} className="block">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-ink-primary">{debt.name}</span>
                      <Badge tone={debt.status === "EnMora" ? "critical" : "neutral"}>
                        {ESTADO_DEUDA_LABELS[debt.status]}
                      </Badge>
                    </div>
                    <ProgressBar value={debt.progressPercentage} colorClassName="bg-critical" />
                    <div className="mt-1 flex justify-between text-xs text-ink-secondary">
                      <span>{formatMoney(debt.currentBalance, debt.currencyCode)} pendiente</span>
                      <span>{debt.progressPercentage.toFixed(0)}% pagado</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink-primary">
              Bolsillos de ahorro
            </h2>
            <Link href="/ahorros" className="text-xs font-medium text-brand hover:underline">
              Ver todos
            </Link>
          </div>
          {summary.savingsGoals.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">
              Aún no has creado bolsillos de ahorro.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {summary.savingsGoals.slice(0, 5).map((goal) => (
                <li key={goal.id}>
                  <Link href={`/ahorros/${goal.id}`} className="block">
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-ink-primary">
                        {goal.icon ? `${goal.icon} ` : ""}
                        {goal.name}
                      </span>
                      {goal.status === "Cumplida" && <Badge tone="good">Cumplida</Badge>}
                    </div>
                    <ProgressBar value={goal.progressPercentage} colorClassName="bg-brand" />
                    <div className="mt-1 flex justify-between text-xs text-ink-secondary">
                      <span>
                        {formatMoney(goal.currentAmount, goal.currencyCode)} de{" "}
                        {formatMoney(goal.targetAmount, goal.currencyCode)}
                      </span>
                      <span>{goal.progressPercentage.toFixed(0)}%</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
