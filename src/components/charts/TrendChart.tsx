"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { MonthlyPoint } from "@/lib/types";
import { formatMoney, monthLabel } from "@/lib/format";
import { CHART_GRID, CHART_MUTED_TEXT, SERIES_COLORS } from "@/lib/chartColors";

export function TrendChart({
  data,
  baseCurrency,
}: {
  data: MonthlyPoint[];
  baseCurrency: string;
}) {
  const chartData = data.map((p) => ({
    label: monthLabel(p.month),
    Ingresos: p.totalIncome,
    Gastos: p.totalExpenses,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
        <XAxis
          dataKey="label"
          stroke={CHART_MUTED_TEXT}
          tick={{ fill: CHART_MUTED_TEXT, fontSize: 12 }}
          axisLine={{ stroke: CHART_GRID }}
          tickLine={false}
        />
        <YAxis
          stroke={CHART_MUTED_TEXT}
          tick={{ fill: CHART_MUTED_TEXT, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={0}
        />
        <Tooltip
          contentStyle={{
            background: "#1e2024",
            border: "1px solid #2a2b30",
            borderRadius: 10,
            fontSize: 13,
          }}
          labelStyle={{ color: "#f3f3f0" }}
          formatter={(value) => formatMoney(Number(value), baseCurrency)}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: CHART_MUTED_TEXT }} />
        <Line
          type="monotone"
          dataKey="Ingresos"
          stroke={SERIES_COLORS.income}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="Gastos"
          stroke={SERIES_COLORS.expense}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
