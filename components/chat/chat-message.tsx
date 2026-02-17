"use client";

import { motion } from "framer-motion";
import { User, Bot, Loader2 } from "lucide-react";
import { SqlResult } from "./sql-result";
import { DynamicChart } from "./dynamic-chart";
import { InsightCard } from "./insight-card";
import { InsightsProgress } from "./insights-progress";
import type { ChatMessage as ChatMessageType, InsightItem } from "@/lib/types";

interface ChatMessageProps {
  message: ChatMessageType;
}

const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

function sortInsightsByPriority(insights: InsightItem[]): InsightItem[] {
  return [...insights].sort(
    (a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-secondary/20" : "bg-primary/20"
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-secondary" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </div>

      {/* Content */}
      <div
        className={`max-w-[80%] space-y-3 ${isUser ? "text-right" : ""}`}
      >
        {/* Text bubble */}
        <div
          className={`inline-block rounded-2xl px-4 py-2.5 text-sm ${
            isUser
              ? "bg-secondary/20 text-foreground"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
          }`}
        >
          {message.loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-zinc-600 dark:text-zinc-400">Thinking...</span>
            </div>
          ) : (
            message.content
          )}
        </div>

        {/* SQL + Results */}
        {!isUser && message.sql && !message.loading && (
          <div className="text-left">
            <SqlResult
              sql={message.sql}
              result={message.queryResult}
              error={message.error}
            />
          </div>
        )}

        {/* Chart */}
        {!isUser && message.plotlySpec && !message.loading && (
          <div className="text-left">
            <DynamicChart
              spec={message.plotlySpec}
              title={message.chartTitle}
            />
          </div>
        )}

        {/* Insights Progress */}
        {!isUser && message.insightsProgress && message.insightsProgress.phase !== "done" && (
          <div className="text-left">
            <InsightsProgress progress={message.insightsProgress} />
          </div>
        )}

        {/* Insight Cards */}
        {!isUser && message.insights && message.insights.length > 0 && !message.loading && (
          <div className="text-left space-y-3">
            {sortInsightsByPriority(message.insights).map((insight, i) => (
              <InsightCard key={`${insight.title}-${i}`} insight={insight} index={i} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
