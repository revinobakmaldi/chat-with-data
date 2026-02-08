import { executeQuery, getRowCount } from "./duckdb";
import type { SchemaInfo } from "./types";

export async function extractSchema(): Promise<SchemaInfo> {
  const descResult = await executeQuery("DESCRIBE uploaded_data");
  const columns = descResult.rows.map((row) => ({
    name: String(row.column_name),
    type: String(row.column_type),
  }));

  const sampleResult = await executeQuery(
    "SELECT * FROM uploaded_data LIMIT 5"
  );

  const rowCount = await getRowCount();

  return {
    tableName: "uploaded_data",
    columns,
    sampleRows: sampleResult.rows,
    rowCount,
  };
}
