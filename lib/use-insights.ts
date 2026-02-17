import { useState, useCallback } from "react";
import { executeQuery } from "./duckdb";
import {
  requestAnalysisPlan,
  synthesizeInsights,
  type PlanItemWithResult,
} from "./insights-api";
import type {
  SchemaInfo,
  InsightsProgress,
  InsightItem,
} from "./types";

export interface InsightsResult {
  summary: string;
  insights: InsightItem[];
}

export function useInsights(schema: SchemaInfo) {
  const [progress, setProgress] = useState<InsightsProgress>({
    phase: "done",
    totalQueries: 0,
    completedQueries: 0,
  });

  const runInsights = useCallback(async (): Promise<InsightsResult> => {
    // Phase 1: Planning
    setProgress({
      phase: "planning",
      totalQueries: 0,
      completedQueries: 0,
    });

    const plan = await requestAnalysisPlan(schema);

    if (plan.queries.length === 0) {
      throw new Error("No analysis queries were generated. Please try again.");
    }

    // Phase 2: Executing queries locally
    setProgress({
      phase: "executing",
      totalQueries: plan.queries.length,
      completedQueries: 0,
    });

    const planWithResults: PlanItemWithResult[] = [];

    for (let i = 0; i < plan.queries.length; i++) {
      const query = plan.queries[i];

      setProgress({
        phase: "executing",
        totalQueries: plan.queries.length,
        completedQueries: i,
        currentQueryTitle: query.title,
      });

      const item: PlanItemWithResult = {
        id: query.id,
        title: query.title,
        sql: query.sql,
        rationale: query.rationale,
      };

      try {
        item.result = await executeQuery(query.sql);
      } catch (err) {
        item.error = err instanceof Error ? err.message : "Query execution failed";
      }

      planWithResults.push(item);
    }

    // Phase 3: Synthesizing insights
    setProgress({
      phase: "synthesizing",
      totalQueries: plan.queries.length,
      completedQueries: plan.queries.length,
    });

    const response = await synthesizeInsights(schema, planWithResults);

    // Attach query results to matching insights
    const insightsWithResults = response.insights.map((insight) => {
      const matchingQuery = planWithResults.find((q) => q.sql === insight.sql);
      return {
        ...insight,
        queryResult: matchingQuery?.result,
      };
    });

    setProgress({
      phase: "done",
      totalQueries: plan.queries.length,
      completedQueries: plan.queries.length,
    });

    return {
      summary: response.summary,
      insights: insightsWithResults,
    };
  }, [schema]);

  return { progress, runInsights };
}
