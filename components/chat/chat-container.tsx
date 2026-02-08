"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { SchemaSidebar } from "./schema-sidebar";
import { sendChatMessage } from "@/lib/api";
import { executeQuery } from "@/lib/duckdb";
import { generateSuggestedQuestions } from "@/lib/prompt";
import type {
  SchemaInfo,
  ChatMessage as ChatMessageType,
  LLMResponse,
  QueryResult,
} from "@/lib/types";

interface ChatContainerProps {
  schema: SchemaInfo;
}

export function ChatContainer({ schema }: ChatContainerProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
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

        if (llmResponse.sql) {
          try {
            queryResult = await executeQuery(llmResponse.sql);
          } catch (err) {
            queryError =
              err instanceof Error ? err.message : "SQL execution failed";
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  content: llmResponse.explanation,
                  sql: llmResponse.sql,
                  chart: llmResponse.chart,
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

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden">
      <SchemaSidebar schema={schema} />

      <div className="flex flex-1 flex-col">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-medium text-gray-400">
                  Ask a question about your data
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  I&apos;ll write SQL, run it, and visualize the results
                </p>
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
          disabled={isLoading}
          suggestedQuestions={suggestedQuestions}
        />
      </div>
    </div>
  );
}
