"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
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

const LIGHT_THEME = {
  fontColor: "#3f3f46",       // zinc-700
  gridColor: "rgba(0,0,0,0.06)",
  axisLineColor: "#d4d4d8",   // zinc-300
};

const DARK_THEME = {
  fontColor: "#d4d4d8",       // zinc-300
  gridColor: "rgba(255,255,255,0.05)",
  axisLineColor: "#374151",   // gray-700
};

function useIsDark() {
  const [isDark, setIsDark] = useState(false);

  const check = useCallback(() => {
    setIsDark(document.documentElement.classList.contains("dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  useEffect(() => {
    check();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", check);
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      mq.removeEventListener("change", check);
      observer.disconnect();
    };
  }, [check]);

  return isDark;
}

export function DynamicChart({ spec, title }: DynamicChartProps) {
  const isDark = useIsDark();
  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  const { data, layout } = useMemo(() => {
    const plotData = (spec.data ?? []) as Plotly.Data[];
    const specLayout = (spec.layout ?? {}) as Record<string, unknown>;

    // Strip LLM-set template so our overrides take effect
    const { template: _template, ...restLayout } = specLayout;

    const plotLayout = {
      ...restLayout,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { color: theme.fontColor },
      autosize: true,
      margin: { l: 50, r: 20, t: 30, b: 50 },
      xaxis: {
        ...(restLayout.xaxis as Record<string, unknown> ?? {}),
        color: theme.fontColor,
        gridcolor: theme.gridColor,
        linecolor: theme.axisLineColor,
      },
      yaxis: {
        ...(restLayout.yaxis as Record<string, unknown> ?? {}),
        color: theme.fontColor,
        gridcolor: theme.gridColor,
        linecolor: theme.axisLineColor,
      },
      coloraxis: {
        ...(restLayout.coloraxis as Record<string, unknown> ?? {}),
        colorbar: {
          tickfont: { color: theme.fontColor },
          titlefont: { color: theme.fontColor },
        },
      },
      legend: {
        ...(restLayout.legend as Record<string, unknown> ?? {}),
        font: { color: theme.fontColor },
      },
    };
    return { data: plotData, layout: plotLayout };
  }, [spec, theme]);

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
