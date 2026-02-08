import type { QueryResult } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let duckdb: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let conn: any = null;

async function getDuckDB() {
  if (!duckdb) {
    duckdb = await import("@duckdb/duckdb-wasm");
  }
  return duckdb;
}

export async function initDB(): Promise<void> {
  if (db) return;

  const mod = await getDuckDB();
  const JSDELIVR_BUNDLES = mod.getJsDelivrBundles();
  const bundle = await mod.selectBundle(JSDELIVR_BUNDLES);

  const worker = new Worker(bundle.mainWorker!);
  const logger = new mod.ConsoleLogger();
  db = new mod.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  conn = await db.connect();
}

export async function loadCSV(file: File): Promise<void> {
  if (!db || !conn) throw new Error("DuckDB not initialized");

  await conn.query("DROP TABLE IF EXISTS uploaded_data");

  await db.registerFileBuffer(
    "upload.csv",
    new Uint8Array(await file.arrayBuffer())
  );
  await conn.query(
    "CREATE TABLE uploaded_data AS SELECT * FROM read_csv_auto('upload.csv')"
  );
}

export async function executeQuery(sql: string): Promise<QueryResult> {
  if (!conn) throw new Error("DuckDB not initialized");

  const result = await conn.query(sql);
  const columns = result.schema.fields.map((f: { name: string }) => f.name);
  const rows: Record<string, unknown>[] = [];

  for (let i = 0; i < result.numRows; i++) {
    const row: Record<string, unknown> = {};
    for (let j = 0; j < columns.length; j++) {
      const val = result.getChildAt(j)?.get(i);
      row[columns[j]] =
        val !== null && val !== undefined && typeof val === "bigint"
          ? Number(val)
          : val;
    }
    rows.push(row);
  }

  return { columns, rows };
}

export async function getRowCount(): Promise<number> {
  const result = await executeQuery(
    "SELECT COUNT(*) as cnt FROM uploaded_data"
  );
  return Number(result.rows[0]?.cnt ?? 0);
}

export async function close(): Promise<void> {
  if (conn) {
    await conn.close();
    conn = null;
  }
  if (db) {
    await db.terminate();
    db = null;
  }
}
