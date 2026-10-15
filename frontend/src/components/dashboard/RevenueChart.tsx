"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCurrency, formatShortDate } from "@/lib/format";
import type { RevenuePoint } from "@/lib/api/types";

// Colores calcados de --color-accent/--color-border/--color-text-faint
// (frontend/src/app/globals.css) -- recharts no resuelve custom
// properties de forma confiable en <stop>/stroke, así que van
// literales acá en vez de var(--color-accent).
const ACCENT = "#4f8fe0";
const BORDER = "#2a323f";
const TEXT_FAINT = "#5c6572";

interface RevenueChartProps {
  data: RevenuePoint[];
}

export function RevenueChart({ data }: RevenueChartProps) {
  const chartData = data.map((point) => ({ ...point, label: formatShortDate(point.date) }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.28} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          axisLine={{ stroke: BORDER }}
          tickLine={false}
          tick={{ fill: TEXT_FAINT, fontSize: 11, fontFamily: "var(--font-mono)" }}
        />
        <YAxis hide domain={[0, (max: number) => (max > 0 ? max * 1.15 : 10)]} />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          labelFormatter={(label) => label}
          contentStyle={{
            background: "#1c222c",
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            fontSize: 12.5,
            fontFamily: "var(--font-body)",
          }}
          labelStyle={{ color: "#e7eaef", marginBottom: 2 }}
          itemStyle={{ color: "#4f8fe0" }}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke={ACCENT}
          strokeWidth={2}
          fill="url(#revenueFill)"
          activeDot={{ r: 4, fill: ACCENT, stroke: "#1c222c", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
