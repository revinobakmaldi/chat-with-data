import type { SchemaInfo } from "./types";

export function buildSystemPrompt(schema: SchemaInfo): string {
  const columnsDesc = schema.columns
    .map((c) => `- ${c.name} (${c.type})`)
    .join("\n");

  const sampleHeader = schema.columns.map((c) => c.name).join(" | ");
  const sampleRows = schema.sampleRows
    .map((row) =>
      schema.columns.map((c) => String(row[c.name] ?? "NULL")).join(" | ")
    )
    .join("\n| ");

  return `You are a SQL analyst. You write DuckDB-compatible SQL queries.

TABLE: ${schema.tableName}
TOTAL ROWS: ${schema.rowCount}
COLUMNS:
${columnsDesc}

SAMPLE ROWS:
| ${sampleHeader} |
| ${sampleRows} |

RULES:
1. Return ONLY valid JSON with keys: sql, explanation, chart (optional)
2. Use only SELECT statements (no INSERT/UPDATE/DELETE/DROP)
3. Always query from "${schema.tableName}"
4. For chart, specify: type (bar|line|pie|area|scatter|histogram), xKey, yKey, title
5. Only suggest a chart when the data is suitable for visualization (aggregations, comparisons, trends)
6. Use scatter for correlation between two numeric columns (both xKey and yKey must be numeric)
7. Use histogram for distribution of a single numeric column — write SQL with WIDTH_BUCKET to bin values, use the bin label as xKey and count as yKey
6. Keep SQL concise and readable
8. Limit results to 100 rows max unless the user asks for more
9. Do NOT wrap the JSON in markdown code blocks — return raw JSON only`;
}

export function generateSuggestedQuestions(schema: SchemaInfo): string[] {
  const questions: string[] = [`How many rows are in the dataset?`];

  const numericCols = schema.columns.filter((c) =>
    ["INTEGER", "BIGINT", "DOUBLE", "FLOAT", "DECIMAL", "HUGEINT", "SMALLINT", "TINYINT", "REAL"].some(
      (t) => c.type.toUpperCase().includes(t)
    )
  );

  const categoricalCols = schema.columns.filter((c) =>
    c.type.toUpperCase().includes("VARCHAR") || c.type.toUpperCase().includes("TEXT")
  );

  if (numericCols.length > 0) {
    questions.push(`What is the average ${numericCols[0].name}?`);
  }

  if (categoricalCols.length > 0 && numericCols.length > 0) {
    questions.push(
      `Show ${numericCols[0].name} by ${categoricalCols[0].name}`
    );
  }

  if (categoricalCols.length > 0) {
    questions.push(
      `What are the top 5 most common ${categoricalCols[0].name} values?`
    );
  }

  return questions.slice(0, 4);
}
