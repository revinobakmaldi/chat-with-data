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
  insights?: InsightItem[];
  insightsSummary?: string;
  insightsProgress?: InsightsProgress;
}

export type InsightPriority = "high" | "medium" | "low";

export interface AnalysisPlanItem {
  id: string;
  title: string;
  sql: string;
  rationale: string;
}

export interface AnalysisPlanResponse {
  queries: AnalysisPlanItem[];
}

export interface InsightItem {
  title: string;
  priority: InsightPriority;
  finding: string;
  sql: string;
  chart?: ChartConfig;
  queryResult?: QueryResult;
}

export interface InsightsResponse {
  summary: string;
  insights: InsightItem[];
}

export type InsightsPhase =
  | "planning"
  | "executing"
  | "synthesizing"
  | "done"
  | "error";

export interface InsightsProgress {
  phase: InsightsPhase;
  totalQueries: number;
  completedQueries: number;
  currentQueryTitle?: string;
}

export type AppState = "upload" | "loading" | "ready" | "error";
