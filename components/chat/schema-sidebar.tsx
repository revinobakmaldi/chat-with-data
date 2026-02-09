"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Database, ChevronLeft, ChevronRight } from "lucide-react";
import type { SchemaInfo } from "@/lib/types";

interface SchemaSidebarProps {
  schema: SchemaInfo;
}

const TYPE_COLORS: Record<string, string> = {
  VARCHAR: "text-yellow-600 dark:text-yellow-400",
  BIGINT: "text-blue-600 dark:text-blue-400",
  INTEGER: "text-blue-600 dark:text-blue-400",
  DOUBLE: "text-green-600 dark:text-green-400",
  FLOAT: "text-green-600 dark:text-green-400",
  DATE: "text-purple-600 dark:text-purple-400",
  TIMESTAMP: "text-purple-600 dark:text-purple-400",
  BOOLEAN: "text-orange-600 dark:text-orange-400",
};

function getTypeColor(type: string): string {
  const upper = type.toUpperCase();
  for (const key of Object.keys(TYPE_COLORS)) {
    if (upper.includes(key)) return TYPE_COLORS[key];
  }
  return "text-zinc-500 dark:text-zinc-400";
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "\u2014";
  if (typeof value === "number") return value.toLocaleString();
  return String(value);
}

export function SchemaSidebar({ schema }: SchemaSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<"schema" | "preview">("schema");

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`shrink-0 border-r border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900 transition-all duration-300 ${
        collapsed ? "w-10" : tab === "preview" ? "w-1/2" : "w-56"
      }`}
    >
      <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/50 px-3 py-2">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {schema.tableName}
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="flex border-b border-zinc-200/50 dark:border-zinc-800/50">
            <button
              onClick={() => setTab("schema")}
              className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === "schema"
                  ? "border-b-2 border-primary text-primary"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Schema
            </button>
            <button
              onClick={() => setTab("preview")}
              className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === "preview"
                  ? "border-b-2 border-primary text-primary"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Preview
            </button>
          </div>

          {tab === "schema" ? (
            <div className="p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-xs text-primary">
                  {schema.tableName}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {schema.rowCount} rows
                </span>
              </div>
              <div className="space-y-1">
                {schema.columns.map((col) => (
                  <div
                    key={col.name}
                    className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
                  >
                    <span className="text-zinc-700 dark:text-zinc-300">{col.name}</span>
                    <span className={`font-mono text-[10px] ${getTypeColor(col.type)}`}>
                      {col.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto p-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-200/50 dark:border-zinc-800/50">
                    <th className="whitespace-nowrap px-2 py-1.5 text-left font-medium text-zinc-500">
                      #
                    </th>
                    {schema.columns.map((col) => (
                      <th
                        key={col.name}
                        className="whitespace-nowrap px-2 py-1.5 text-left font-medium text-zinc-600 dark:text-zinc-400"
                      >
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schema.sampleRows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-zinc-100 dark:border-zinc-800/30 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <td className="whitespace-nowrap px-2 py-1.5 text-zinc-500">
                        {i + 1}
                      </td>
                      {schema.columns.map((col) => (
                        <td
                          key={col.name}
                          className="max-w-[200px] truncate whitespace-nowrap px-2 py-1.5 text-zinc-700 dark:text-zinc-300"
                          title={formatCellValue(row[col.name])}
                        >
                          {formatCellValue(row[col.name])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 text-center text-[10px] text-zinc-500">
                Showing {schema.sampleRows.length} of {schema.rowCount} rows
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
