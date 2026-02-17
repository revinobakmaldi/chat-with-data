import type { SchemaInfo, LLMResponse, ChartSpec, ChatMessage } from "./types";

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

const VALID_CHART_TYPES = new Set(["bar", "line", "pie", "area", "scatter"]);

function validateChartSpec(data: unknown): ChartSpec | null {
  if (typeof data !== "object" || data === null) return null;

  const obj = data as Record<string, unknown>;
  if (!VALID_CHART_TYPES.has(obj.type as string)) return null;
  if (typeof obj.xKey !== "string") return null;
  if (typeof obj.title !== "string") return null;

  const yKeys = obj.yKeys;
  if (!Array.isArray(yKeys) || yKeys.length === 0) return null;

  const validYKeys: ChartSpec["yKeys"] = [];
  for (const yk of yKeys) {
    if (typeof yk === "object" && yk !== null && typeof (yk as Record<string, unknown>).key === "string") {
      const entry: ChartSpec["yKeys"][number] = { key: (yk as Record<string, unknown>).key as string };
      if (typeof (yk as Record<string, unknown>).label === "string") entry.label = (yk as Record<string, unknown>).label as string;
      if (typeof (yk as Record<string, unknown>).color === "string") entry.color = (yk as Record<string, unknown>).color as string;
      validYKeys.push(entry);
    }
  }

  if (validYKeys.length === 0) return null;

  return {
    type: obj.type as ChartSpec["type"],
    title: obj.title,
    xKey: obj.xKey,
    yKeys: validYKeys,
    stacked: typeof obj.stacked === "boolean" ? obj.stacked : false,
  };
}

export async function requestVisualization(
  question: string,
  sql: string,
  columns: string[],
  rows: Record<string, unknown>[]
): Promise<ChartSpec | null> {
  // Cap rows to first 50 before sending
  const cappedRows = rows.slice(0, 50);

  const res = await fetch("/api/visualize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, sql, columns, rows: cappedRows }),
  });

  if (!res.ok) {
    console.warn("[visualize] request failed:", res.status, await res.text().catch(() => ""));
    return null;
  }

  const json = await res.json();
  const spec = validateChartSpec(json.chart);
  if (!spec) {
    console.warn("[visualize] no valid chart spec returned:", JSON.stringify(json));
  }
  return spec;
}
