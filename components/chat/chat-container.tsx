"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { SchemaSidebar } from "./schema-sidebar";
import { sendChatMessage, requestVisualization } from "@/lib/api";
import { executeQuery } from "@/lib/duckdb";
import { generateSuggestedQuestions } from "@/lib/prompt";
import { useInsights } from "@/lib/use-insights";
import type {
  SchemaInfo,
  ChatMessage as ChatMessageType,
  LLMResponse,
  QueryResult,
  ChartSpec,
} from "@/lib/types";

interface ChatContainerProps {
  schema: SchemaInfo;
}

export function ChatContainer({ schema }: ChatContainerProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { progress: insightsProgress, runInsights } = useInsights(schema);
  const suggestedQuestions = messages.length === 0
    ? generateSuggestedQuestions(schema)
    : undefined;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(
    async (content: string) => {
      if (isLoading) return;

      const userMsg: ChatMessageType = {
        id: crypto.randomUUID(),
        role: "user",
        content,
      };

      const assistantMsg: ChatMessageType = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        loading: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsLoading(true);

      try {
        const historyForApi = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const llmResponse: LLMResponse = await sendChatMessage(
          schema,
          historyForApi
        );

        let queryResult: QueryResult | undefined;
        let queryError: string | undefined;
        let chartSpec: ChartSpec | undefined;

        if (llmResponse.sql) {
          try {
            queryResult = await executeQuery(llmResponse.sql);
          } catch (err) {
            queryError =
              err instanceof Error ? err.message : "SQL execution failed";
          }

          // Phase 2: ask LLM to generate chart spec based on actual results
          if (queryResult && queryResult.rows.length > 0) {
            try {
              const chart = await requestVisualization(
                content,
                llmResponse.sql,
                queryResult.columns,
                queryResult.rows
              );
              if (chart) chartSpec = chart;
            } catch {
              // Chart generation failure is non-critical
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  content: llmResponse.explanation,
                  sql: llmResponse.sql,
                  chart: chartSpec,
                  queryResult,
                  error: queryError,
                  loading: false,
                }
              : m
          )
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Something went wrong";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  content: errorMessage,
                  loading: false,
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, schema]
  );

  const handleGetInsights = useCallback(async () => {
    if (isLoading) return;

    const userMsg: ChatMessageType = {
      id: crypto.randomUUID(),
      role: "user",
      content: "Get insights from this dataset",
    };

    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMessageType = {
      id: assistantId,
      role: "assistant",
      content: "Analyzing your dataset...",
      loading: true,
      insightsProgress: {
        phase: "planning",
        totalQueries: 0,
        completedQueries: 0,
      },
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    // Set up progress tracking
    const updateProgress = () => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, insightsProgress: { ...insightsProgress } }
            : m
        )
      );
    };
    const progressInterval = setInterval(updateProgress, 200);

    try {
      const result = await runInsights();

      clearInterval(progressInterval);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: result.summary,
                insightsSummary: result.summary,
                insights: result.insights,
                loading: false,
                insightsProgress: {
                  phase: "done",
                  totalQueries: 0,
                  completedQueries: 0,
                },
              }
            : m
        )
      );
    } catch (err) {
      clearInterval(progressInterval);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate insights";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: errorMessage,
                loading: false,
                insightsProgress: undefined,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, insightsProgress, runInsights]);

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden">
      <SchemaSidebar schema={schema} />

      <div className="flex flex-1 flex-col">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-medium text-zinc-600 dark:text-zinc-400">
                  Ask a question about your data
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  I&apos;ll write SQL, run it, and visualize the results
                </p>
                <button
                  onClick={handleGetInsights}
                  disabled={isLoading}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 dark:bg-primary/20 px-4 py-2 text-sm font-medium text-primary transition-all hover:border-primary/50 hover:bg-primary/20 dark:hover:bg-primary/30 disabled:pointer-events-none disabled:opacity-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                  </svg>
                  Get Insights
                </button>
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          onGetInsights={handleGetInsights}
          disabled={isLoading}
          suggestedQuestions={suggestedQuestions}
        />
      </div>
    </div>
  );
}
