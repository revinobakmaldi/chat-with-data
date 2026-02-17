"use client";

import { motion } from "framer-motion";
import { LiveProvider, LivePreview, LiveError } from "react-live";
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
  RadialBarChart,
  RadialBar,
  ComposedChart,
  Treemap,
  Funnel,
  FunnelChart,
} from "recharts";

interface DynamicChartProps {
  code: string;
  data: Record<string, unknown>[];
  title?: string;
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
const gridStroke = "var(--chart-grid)";

const scope = {
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
  RadialBarChart,
  RadialBar,
  ComposedChart,
  Treemap,
  Funnel,
  FunnelChart,
  COLORS,
  tooltipStyle,
  tickStyle,
  axisLineStyle,
  gridStroke,
};

export function DynamicChart({ code, data, title }: DynamicChartProps) {
  if (!data.length || !code) return null;

  const fullScope = { ...scope, data };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900 p-4"
    >
      {title && (
        <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {title}
        </h4>
      )}
      <div className="h-64">
        <LiveProvider code={code} scope={fullScope} noInline={false}>
          <LivePreview Component="div" className="h-full w-full" />
          <LiveError className="text-sm text-red-500 dark:text-red-400 mt-2" />
        </LiveProvider>
      </div>
    </motion.div>
  );
}
