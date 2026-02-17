import type { SchemaInfo, LLMResponse, ChatMessage } from "./types";

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

  return { sql: obj.sql, explanation: obj.explanation };
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

export async function requestVisualization(
  question: string,
  sql: string,
  columns: string[],
  rows: Record<string, unknown>[]
): Promise<{ plotlySpec: Record<string, unknown> | null; chartTitle: string }> {
  // Cap rows to first 50 before sending
  const cappedRows = rows.slice(0, 50);

  const res = await fetch("/api/visualize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, sql, columns, rows: cappedRows }),
  });

  if (!res.ok) {
    console.warn("[visualize] request failed:", res.status, await res.text().catch(() => ""));
    return { plotlySpec: null, chartTitle: "" };
  }

  const json = await res.json();
  const plotlySpec = typeof json.plotlySpec === "object" && json.plotlySpec !== null ? json.plotlySpec : null;
  const chartTitle = typeof json.chartTitle === "string" ? json.chartTitle : "Chart";

  if (!plotlySpec) {
    console.warn("[visualize] no plotly spec returned:", JSON.stringify(json));
  }
  return { plotlySpec, chartTitle };
}
