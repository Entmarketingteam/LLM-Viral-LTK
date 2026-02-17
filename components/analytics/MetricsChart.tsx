"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type ChartSeries = {
  dataKey: string;
  name: string;
  color?: string;
  /** e.g. (v) => `${v}%` */
  formatter?: (value: number) => string;
};

interface MetricsChartLineProps {
  /** Chart data (array of objects with xKey and series dataKeys) */
  data: unknown[];
  /** Key for X axis (e.g. dateLabel) */
  xKey: string;
  series: ChartSeries[];
  title?: string;
  height?: number;
  loading?: boolean;
  /** Format Y axis ticks */
  yAxisFormatter?: (v: number) => string;
  /** Tooltip label (e.g. show raw date from payload) */
  tooltipLabel?: (payload: Record<string, unknown>) => string;
}

export function MetricsChartLine({
  data,
  xKey,
  series,
  title,
  height = 256,
  loading = false,
  yAxisFormatter,
  tooltipLabel,
}: MetricsChartLineProps) {
  if (loading) {
    return (
      <div className="animate-pulse rounded-lg bg-gray-100" style={{ height }} />
    );
  }
  if (!data?.length) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  const chartData = data as Record<string, unknown>[];

  return (
    <div className="w-full" style={{ height }}>
      {title && (
        <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ left: 0, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            tickFormatter={yAxisFormatter}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            labelFormatter={
              tooltipLabel
                ? (_, payload: unknown) => {
                    const p = Array.isArray(payload) ? (payload[0] as { payload?: Record<string, unknown> })?.payload : undefined;
                    return p ? tooltipLabel(p) : "";
                  }
                : undefined
            }
            formatter={(value: unknown, name: unknown) => {
              const s = series.find((x) => x.dataKey === name);
              const formatted = s?.formatter ? s.formatter(Number(value)) : String(value);
              return [formatted, (s?.name ?? name) as string];
            }}
          />
          {series.map((s, i) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              stroke={s.color ?? (i === 0 ? "#2563eb" : "#8b5cf6")}
              strokeWidth={2}
              dot={{ r: 3 }}
              name={s.name}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface MetricsChartBarProps {
  data: unknown[];
  xKey: string;
  /** For horizontal bar, xKey is the category (e.g. niche), barKey is the value */
  barKey: string;
  barName?: string;
  color?: string;
  title?: string;
  height?: number;
  loading?: boolean;
  /** vertical = category on X, value on Y; horizontal = category on Y, value on X */
  layout?: "vertical" | "horizontal";
  /** e.g. (v) => `${v}%` */
  valueFormatter?: (v: number) => string;
}

export function MetricsChartBar({
  data,
  xKey,
  barKey,
  barName = barKey,
  color = "#3b82f6",
  title,
  height = 256,
  loading = false,
  layout = "vertical",
  valueFormatter,
}: MetricsChartBarProps) {
  if (loading) {
    return (
      <div className="animate-pulse rounded-lg bg-gray-100" style={{ height }} />
    );
  }
  if (!data?.length) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  const isHorizontal = layout === "horizontal";
  const chartData = data as Record<string, unknown>[];

  return (
    <div className="w-full" style={{ height }}>
      {title && (
        <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout={isHorizontal ? "vertical" : "horizontal"}
          margin={isHorizontal ? { left: 60 } : {}}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
          <XAxis
            type={isHorizontal ? "number" : "category"}
            dataKey={isHorizontal ? undefined : xKey}
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            tickFormatter={!isHorizontal && valueFormatter ? valueFormatter : undefined}
          />
          <YAxis
            type={isHorizontal ? "category" : "number"}
            dataKey={isHorizontal ? xKey : undefined}
            width={isHorizontal ? 56 : undefined}
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            tickFormatter={isHorizontal ? undefined : valueFormatter}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={
              valueFormatter
                ? (v: number) => [valueFormatter(v), barName]
                : undefined
            }
          />
          <Bar
            dataKey={barKey}
            fill={color}
            radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            name={barName}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
