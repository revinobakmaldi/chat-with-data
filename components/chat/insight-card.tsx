"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SqlResult } from "./sql-result";
import { DynamicChart } from "./dynamic-chart";
import type { InsightItem } from "@/lib/types";

interface InsightCardProps {
  insight: InsightItem;
  index: number;
}

const priorityConfig = {
  high: {
    border: "border-red-200 dark:border-red-800/50",
    bg: "bg-red-50 dark:bg-red-950/30",
    badge: "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300",
    icon: AlertTriangle,
    iconColor: "text-red-500",
  },
  medium: {
    border: "border-amber-200 dark:border-amber-800/50",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    badge: "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300",
    icon: TrendingUp,
    iconColor: "text-amber-500",
  },
  low: {
    border: "border-blue-200 dark:border-blue-800/50",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    badge: "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300",
    icon: Info,
    iconColor: "text-blue-500",
  },
};

export function InsightCard({ insight, index }: InsightCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = priorityConfig[insight.priority];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`rounded-xl border ${config.border} ${config.bg} overflow-hidden`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${config.iconColor}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${config.badge}`}
              >
                {insight.priority}
              </span>
              <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
                {insight.title}
              </h4>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {insight.finding}
            </p>
          </div>
        </div>

        {/* Chart */}
        {insight.plotlySpec && (
          <div className="mt-3">
            <DynamicChart
              spec={insight.plotlySpec}
              title={insight.chartTitle}
            />
          </div>
        )}

        {/* Expand toggle for SQL + data */}
        {insight.sql && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            {expanded ? (
              <>
                Hide details <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Show details <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
        )}
      </div>

      {expanded && insight.sql && (
        <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 p-4">
          <SqlResult sql={insight.sql} result={insight.queryResult} />
        </div>
      )}
    </motion.div>
  );
}
