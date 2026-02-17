"use client";

import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  Cell,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { ChartSpec, QueryResult } from "@/lib/types";

interface DataChartProps {
  chart: ChartSpec;
  data: QueryResult;
}

const COLORS = [
  "#10b981",
  "#3b82f6",
  "#14b8a6",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
];

const tooltipStyle = {
  backgroundColor: "var(--chart-tooltip-bg)",
  border: "1px solid var(--chart-tooltip-border)",
  borderRadius: "8px",
  color: "var(--chart-tooltip-text)",
};

const tickStyle = { fill: "var(--chart-axis)", fontSize: 12 };
const axisLineStyle = { stroke: "var(--chart-axis-line)" };

function getColor(yKey: { key: string; color?: string }, index: number): string {
  return yKey.color || COLORS[index % COLORS.length];
}

export function DataChart({ chart, data }: DataChartProps) {
  if (!data.rows.length) return null;

  // Validate that xKey and all yKeys exist in columns
  const missingKeys: string[] = [];
  if (!data.columns.includes(chart.xKey)) missingKeys.push(chart.xKey);
  for (const yk of chart.yKeys) {
    if (!data.columns.includes(yk.key)) missingKeys.push(yk.key);
  }

  if (missingKeys.length > 0) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4 text-sm text-amber-700 dark:text-amber-300">
        Chart unavailable: column{missingKeys.length > 1 ? "s" : ""}{" "}
        {missingKeys.map((k) => `"${k}"`).join(", ")}{" "}
        not found in query results. Available columns: {data.columns.join(", ")}
      </div>
    );
  }

  const chartData = data.rows.map((row) => {
    const entry: Record<string, unknown> = {};
    for (const col of data.columns) {
      entry[col] = row[col];
    }
    return entry;
  });

  // For pie chart, use only the first yKey
  const firstYKey = chart.yKeys[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900 p-4"
    >
      <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">{chart.title}</h4>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === "bar" ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis
                dataKey={chart.xKey}
                tick={tickStyle}
                tickLine={axisLineStyle}
                axisLine={axisLineStyle}
              />
              <YAxis
                tick={tickStyle}
                tickLine={axisLineStyle}
                axisLine={axisLineStyle}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: "var(--chart-axis)" }} />
              {chart.yKeys.map((yk, i) => (
                <Bar
                  key={yk.key}
                  dataKey={yk.key}
                  name={yk.label || yk.key}
                  fill={getColor(yk, i)}
                  radius={[4, 4, 0, 0]}
                  stackId={chart.stacked ? "stack" : undefined}
                />
              ))}
            </BarChart>
          ) : chart.type === "line" ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis
                dataKey={chart.xKey}
                tick={tickStyle}
                tickLine={axisLineStyle}
                axisLine={axisLineStyle}
              />
              <YAxis
                tick={tickStyle}
                tickLine={axisLineStyle}
                axisLine={axisLineStyle}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: "var(--chart-axis)" }} />
              {chart.yKeys.map((yk, i) => (
                <Line
                  key={yk.key}
                  type="monotone"
                  dataKey={yk.key}
                  name={yk.label || yk.key}
                  stroke={getColor(yk, i)}
                  strokeWidth={2}
                  dot={{ fill: getColor(yk, i), r: 4 }}
                />
              ))}
            </LineChart>
          ) : chart.type === "area" ? (
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis
                dataKey={chart.xKey}
                tick={tickStyle}
                tickLine={axisLineStyle}
                axisLine={axisLineStyle}
              />
              <YAxis
                tick={tickStyle}
                tickLine={axisLineStyle}
                axisLine={axisLineStyle}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: "var(--chart-axis)" }} />
              {chart.yKeys.map((yk, i) => (
                <Area
                  key={yk.key}
                  type="monotone"
                  dataKey={yk.key}
                  name={yk.label || yk.key}
                  stroke={getColor(yk, i)}
                  fill={getColor(yk, i)}
                  fillOpacity={0.2}
                  strokeWidth={2}
                  stackId={chart.stacked ? "stack" : undefined}
                />
              ))}
            </AreaChart>
          ) : chart.type === "scatter" ? (
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis
                dataKey={chart.xKey}
                name={chart.xKey}
                type="number"
                tick={tickStyle}
                tickLine={axisLineStyle}
                axisLine={axisLineStyle}
              />
              <YAxis
                dataKey={firstYKey.key}
                name={firstYKey.label || firstYKey.key}
                type="number"
                tick={tickStyle}
                tickLine={axisLineStyle}
                axisLine={axisLineStyle}
              />
              <ZAxis range={[40, 40]} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3", stroke: "#6b7280" }}
                contentStyle={tooltipStyle}
              />
              <Legend wrapperStyle={{ color: "var(--chart-axis)" }} />
              <Scatter name={chart.title} data={chartData} fill={getColor(firstYKey, 0)} />
            </ScatterChart>
          ) : (
            <PieChart>
              <Pie
                data={chartData}
                dataKey={firstYKey.key}
                nameKey={chart.xKey}
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) =>
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
                labelLine={{ stroke: "#6b7280" }}
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: "var(--chart-axis)" }} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
