import type { SchemaInfo, LLMResponse, ChatMessage } from "./types";

const VALID_CHART_TYPES = new Set(["bar", "line", "pie", "area", "scatter", "histogram"]);

export function validateLLMResponse(data: unknown): LLMResponse {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid response: expected an object");
  }

  const obj = data as Record<string, unknown>;

  // Default sql to empty string for chat-only responses
  if (obj.sql === undefined || obj.sql === null) {
    obj.sql = "";
  }
  if (typeof obj.sql !== "string") {
    throw new Error("Invalid response: invalid 'sql' field");
  }

  if (typeof obj.explanation !== "string") {
    throw new Error("Invalid response: missing or invalid 'explanation' field");
  }

  if (obj.chart != null) {
    const chart = obj.chart as Record<string, unknown>;
    if (
      typeof chart !== "object" ||
      !VALID_CHART_TYPES.has(chart.type as string) ||
      typeof chart.xKey !== "string" ||
      typeof chart.yKey !== "string"
    ) {
      throw new Error("Invalid response: chart config is malformed");
    }
  }

  return data as LLMResponse;
}

export async function sendChatMessage(
  schema: SchemaInfo,
  messages: Pick<ChatMessage, "role" | "content">[]
): Promise<LLMResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schema, messages }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `Request failed (${res.status})`);
  }

  const json = await res.json();
  return validateLLMResponse(json);
}
