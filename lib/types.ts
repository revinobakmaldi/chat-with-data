export interface ColumnInfo {
  name: string;
  type: string;
}

export interface SchemaInfo {
  tableName: string;
  columns: ColumnInfo[];
  sampleRows: Record<string, unknown>[];
  rowCount: number;
}

export interface ChartConfig {
  type: "bar" | "line" | "pie" | "area" | "scatter" | "histogram";
  xKey: string;
  yKey: string;
  title: string;
}

export interface LLMResponse {
  sql: string;
  explanation: string;
  chart?: ChartConfig;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  queryResult?: QueryResult;
  chart?: ChartConfig;
  error?: string;
  loading?: boolean;
}

export type AppState = "upload" | "loading" | "ready" | "error";
