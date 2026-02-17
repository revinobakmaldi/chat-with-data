"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

const Plot = dynamic(
  () =>
    Promise.all([
      import("plotly.js-dist-min"),
      import("react-plotly.js/factory"),
    ]).then(([Plotly, factory]) => ({
      default: factory.default(Plotly.default),
    })),
  { ssr: false }
);

interface DynamicChartProps {
  spec: Record<string, unknown>;
  title?: string;
}

export function DynamicChart({ spec, title }: DynamicChartProps) {
  const { data, layout } = useMemo(() => {
    const plotData = (spec.data ?? []) as Plotly.Data[];
    const plotLayout = {
      ...(spec.layout as Record<string, unknown> ?? {}),
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { color: "var(--chart-axis, #a1a1aa)" },
      autosize: true,
      margin: { l: 50, r: 20, t: 30, b: 50 },
    };
    return { data: plotData, layout: plotLayout };
  }, [spec]);

  if (!data || (Array.isArray(data) && data.length === 0)) return null;

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
        <Plot
          data={data}
          layout={layout}
          config={{ displayModeBar: false, responsive: true }}
          useResizeHandler
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </motion.div>
  );
}
