import type {
  SchemaInfo,
  AnalysisPlanResponse,
  AnalysisPlanItem,
  InsightsResponse,
  InsightItem,
  QueryResult,
} from "./types";

const VALID_CHART_TYPES = new Set(["bar", "line", "pie", "area", "scatter"]);
const VALID_PRIORITIES = new Set(["high", "medium", "low"]);

export function validatePlanResponse(data: unknown): AnalysisPlanResponse {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid plan response: expected an object");
  }

  const obj = data as Record<string, unknown>;
  const queries = obj.queries;

  if (!Array.isArray(queries)) {
    throw new Error("Invalid plan response: missing or invalid 'queries' array");
  }

  const validated: AnalysisPlanItem[] = [];
  for (let idx = 0; idx < queries.length; idx++) {
    const q = queries[idx];
    if (
      typeof q === "object" &&
      q !== null &&
      typeof (q as Record<string, unknown>).title === "string" &&
      typeof (q as Record<string, unknown>).sql === "string"
    ) {
      const item = q as Record<string, unknown>;
      let id: string;
      if (typeof item.id === "string" && item.id) {
        id = item.id;
      } else if (typeof item.id === "number") {
        id = String(item.id);
      } else {
        id = `q${idx + 1}`;
      }
      validated.push({
        id,
        title: item.title as string,
        sql: item.sql as string,
        rationale: (item.rationale as string) || "",
      });
    }
  }

  return { queries: validated };
}

export function validateInsightsResponse(data: unknown): InsightsResponse {
  if (typeof data !== "object" || data === null) {
    throw new Error("Invalid insights response: expected an object");
  }

  const obj = data as Record<string, unknown>;
  const summary = typeof obj.summary === "string" ? obj.summary : "Analysis complete.";
  const rawInsights = Array.isArray(obj.insights) ? obj.insights : [];

  const insights: InsightItem[] = [];
  for (const item of rawInsights) {
    if (typeof item !== "object" || item === null) continue;
    const i = item as Record<string, unknown>;

    if (typeof i.title !== "string" || typeof i.finding !== "string") continue;

    const priority = VALID_PRIORITIES.has(i.priority as string)
      ? (i.priority as InsightItem["priority"])
      : "medium";

    const entry: InsightItem = {
      title: i.title,
      priority,
      finding: i.finding,
      sql: typeof i.sql === "string" ? i.sql : "",
    };

    if (typeof i.chart === "object" && i.chart !== null) {
      const chart = i.chart as Record<string, unknown>;
      if (
        VALID_CHART_TYPES.has(chart.type as string) &&
        typeof chart.xKey === "string"
      ) {
        let yKeysRaw = chart.yKeys;
        // Support legacy single yKey format
        if (!Array.isArray(yKeysRaw) || yKeysRaw.length === 0) {
          if (typeof chart.yKey === "string") {
            yKeysRaw = [{ key: chart.yKey }];
          } else {
            yKeysRaw = [];
          }
        }

        const validYKeys: NonNullable<InsightItem["chart"]>["yKeys"] = [];
        for (const yk of yKeysRaw as Record<string, unknown>[]) {
          if (typeof yk === "object" && yk !== null && typeof yk.key === "string") {
            const ykEntry: { key: string; label?: string; color?: string } = { key: yk.key };
            if (typeof yk.label === "string") ykEntry.label = yk.label;
            if (typeof yk.color === "string") ykEntry.color = yk.color;
            validYKeys.push(ykEntry);
          }
        }

        if (validYKeys.length > 0) {
          entry.chart = {
            type: chart.type as NonNullable<InsightItem["chart"]>["type"],
            title: typeof chart.title === "string" ? chart.title : i.title,
            xKey: chart.xKey,
            yKeys: validYKeys,
            stacked: typeof chart.stacked === "boolean" ? chart.stacked : false,
          };
        }
      }
    }

    insights.push(entry);
  }

  return { summary, insights };
}

export async function requestAnalysisPlan(
  schema: SchemaInfo
): Promise<AnalysisPlanResponse> {
  const res = await fetch("/api/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phase: "plan", schema }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `Plan request failed (${res.status})`);
  }

  const json = await res.json();
  return validatePlanResponse(json);
}

export interface PlanItemWithResult {
  id: string;
  title: string;
  sql: string;
  rationale: string;
  result?: QueryResult;
  error?: string;
}

export async function synthesizeInsights(
  schema: SchemaInfo,
  planWithResults: PlanItemWithResult[]
): Promise<InsightsResponse> {
  // Cap rows at 20 per query for the API payload
  const capped = planWithResults.map((item) => ({
    ...item,
    result: item.result
      ? {
          columns: item.result.columns,
          rows: item.result.rows.slice(0, 20),
        }
      : undefined,
  }));

  const res = await fetch("/api/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phase: "synthesize", schema, planWithResults: capped }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `Synthesize request failed (${res.status})`);
  }

  const json = await res.json();
  return validateInsightsResponse(json);
}
