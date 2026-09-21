"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoryAmount } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { CATEGORY_COLORS } from "@/lib/chartColors";
import { CATEGORIA_LABELS } from "@/lib/labels";

export function CategoryDonut({
  data,
  baseCurrency,
}: {
  data: CategoryAmount[];
  baseCurrency: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-ink-muted">
        Aún no hay gastos registrados este mes.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: CATEGORIA_LABELS[d.category],
    value: d.amountBase,
    category: d.category,
  }));

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width="100%" height={200} className="max-w-[200px]">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            strokeWidth={0}
          >
            {chartData.map((entry) => (
              <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category]} />
            ))}
          </Pie>
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
        </PieChart>
      </ResponsiveContainer>
      <ul className="flex w-full flex-col gap-2 text-sm">
        {chartData.map((entry) => (
          <li key={entry.category} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-ink-secondary">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[entry.category] }}
              />
              {entry.name}
            </span>
            <span className="tabular-money font-medium text-ink-primary">
              {formatMoney(entry.value, baseCurrency)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
