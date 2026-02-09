"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Code, Table, ChevronDown, ChevronUp } from "lucide-react";
import type { QueryResult } from "@/lib/types";

interface SqlResultProps {
  sql: string;
  result?: QueryResult;
  error?: string;
}

export function SqlResult({ sql, result, error }: SqlResultProps) {
  const [showSql, setShowSql] = useState(false);

  return (
    <div className="space-y-3">
      {/* SQL toggle */}
      <button
        onClick={() => setShowSql(!showSql)}
        className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 transition-colors hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <Code className="h-3.5 w-3.5" />
        {showSql ? "Hide" : "Show"} SQL
        {showSql ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {showSql && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="overflow-hidden"
        >
          <pre className="overflow-x-auto rounded-lg bg-zinc-100 dark:bg-zinc-900 p-3 font-mono text-xs text-green-700 dark:text-green-400">
            {sql}
          </pre>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Result table */}
      {result && result.rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-zinc-200/50 dark:border-zinc-800/50">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-800/50">
                {result.columns.map((col) => (
                  <th
                    key={col}
                    className="whitespace-nowrap px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    <div className="flex items-center gap-1.5">
                      <Table className="h-3 w-3 text-zinc-500" />
                      {col}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.slice(0, 100).map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-zinc-100 dark:border-zinc-800/30 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  {result.columns.map((col) => (
                    <td
                      key={col}
                      className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-400"
                    >
                      {row[col] === null || row[col] === undefined
                        ? "NULL"
                        : String(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {result.rows.length > 100 && (
            <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 px-3 py-2 text-center text-xs text-zinc-500">
              Showing 100 of {result.rows.length} rows
            </div>
          )}
        </div>
      )}

      {result && result.rows.length === 0 && (
        <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400">
          Query returned no results.
        </div>
      )}
    </div>
  );
}
