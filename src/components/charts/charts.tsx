"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCompact, formatCurrency, formatNumber } from "@/lib/utils/format";

export const CHART_COLORS = ["#FF6B00", "#102A43", "#2E90FA", "#12B76A", "#7A5AF8", "#F79009", "#EE46BC"];

/** Recharts hands formatters a loose ValueType; normalise before formatting. */
const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const axisProps = {
  stroke: "#94a3b8",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  fontSize: 12,
  boxShadow: "0 8px 20px rgba(16,42,67,0.08)",
} as const;

export function ChartFrame({ height = 280, children }: { height?: number; children: React.ReactElement }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function TrendAreaChart({
  data,
  series,
}: {
  data: Record<string, unknown>[];
  series: { key: string; label: string; color?: string; currency?: boolean }[];
}) {
  return (
    <ChartFrame>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          {series.map((entry, index) => (
            <linearGradient key={entry.key} id={`fill-${entry.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={entry.color ?? CHART_COLORS[index % CHART_COLORS.length]}
                stopOpacity={0.35}
              />
              <stop
                offset="95%"
                stopColor={entry.color ?? CHART_COLORS[index % CHART_COLORS.length]}
                stopOpacity={0.02}
              />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
        <XAxis dataKey="date" {...axisProps} minTickGap={24} />
        <YAxis {...axisProps} tickFormatter={(value) => formatCompact(toNumber(value))} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, name) => {
            const match = series.find((entry) => entry.label === name);
            return [
              match?.currency ? formatCurrency(toNumber(value)) : formatNumber(toNumber(value)),
              String(name),
            ];
          }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        {series.map((entry, index) => (
          <Area
            key={entry.key}
            type="monotone"
            dataKey={entry.key}
            name={entry.label}
            stroke={entry.color ?? CHART_COLORS[index % CHART_COLORS.length]}
            fill={`url(#fill-${entry.key})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ChartFrame>
  );
}

export function HorizontalBarChart({
  data,
  currency = false,
}: {
  data: { name: string; value: number }[];
  currency?: boolean;
}) {
  return (
    <ChartFrame height={Math.max(220, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" horizontal={false} />
        <XAxis type="number" {...axisProps} tickFormatter={(value) => formatCompact(toNumber(value))} />
        <YAxis type="category" dataKey="name" width={140} {...axisProps} tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) =>
            currency ? formatCurrency(toNumber(value)) : formatNumber(toNumber(value))
          }
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
          {data.map((_, index) => (
            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}

export function ComparisonBarChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ChartFrame height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
        <XAxis dataKey="name" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(value) => formatCompact(toNumber(value))} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatNumber(toNumber(value))} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={44}>
          {data.map((_, index) => (
            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}

export function DonutChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ChartFrame height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={58}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatNumber(toNumber(value))} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ChartFrame>
  );
}

export function PriceHistoryChart({ data }: { data: { date: string; price: number }[] }) {
  return (
    <ChartFrame height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
        <XAxis dataKey="date" {...axisProps} minTickGap={20} />
        <YAxis {...axisProps} tickFormatter={(value) => formatCompact(toNumber(value))} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(toNumber(value))} />
        <Line
          type="monotone"
          dataKey="price"
          stroke="#FF6B00"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ChartFrame>
  );
}
