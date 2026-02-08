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
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { ChartConfig, QueryResult } from "@/lib/types";

interface DataChartProps {
  chart: ChartConfig;
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

export function DataChart({ chart, data }: DataChartProps) {
  if (!data.rows.length) return null;

  const chartData = data.rows.map((row) => {
    const entry: Record<string, unknown> = {};
    for (const col of data.columns) {
      const val = row[col];
      entry[col] = typeof val === "number" ? val : val;
    }
    return entry;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
    >
      <h4 className="mb-3 text-sm font-medium text-gray-300">{chart.title}</h4>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === "bar" ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey={chart.xKey}
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                tickLine={{ stroke: "#374151" }}
                axisLine={{ stroke: "#374151" }}
              />
              <YAxis
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                tickLine={{ stroke: "#374151" }}
                axisLine={{ stroke: "#374151" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#e5e7eb",
                }}
              />
              <Legend wrapperStyle={{ color: "#9ca3af" }} />
              <Bar dataKey={chart.yKey} fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : chart.type === "line" ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey={chart.xKey}
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                tickLine={{ stroke: "#374151" }}
                axisLine={{ stroke: "#374151" }}
              />
              <YAxis
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                tickLine={{ stroke: "#374151" }}
                axisLine={{ stroke: "#374151" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#e5e7eb",
                }}
              />
              <Legend wrapperStyle={{ color: "#9ca3af" }} />
              <Line
                type="monotone"
                dataKey={chart.yKey}
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 4 }}
              />
            </LineChart>
          ) : chart.type === "area" ? (
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey={chart.xKey}
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                tickLine={{ stroke: "#374151" }}
                axisLine={{ stroke: "#374151" }}
              />
              <YAxis
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                tickLine={{ stroke: "#374151" }}
                axisLine={{ stroke: "#374151" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#e5e7eb",
                }}
              />
              <Legend wrapperStyle={{ color: "#9ca3af" }} />
              <Area
                type="monotone"
                dataKey={chart.yKey}
                stroke="#14b8a6"
                fill="#14b8a6"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          ) : (
            <PieChart>
              <Pie
                data={chartData}
                dataKey={chart.yKey}
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
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#e5e7eb",
                }}
              />
              <Legend wrapperStyle={{ color: "#9ca3af" }} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
