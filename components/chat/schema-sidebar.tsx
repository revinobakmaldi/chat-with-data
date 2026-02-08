"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Database, ChevronLeft, ChevronRight } from "lucide-react";
import type { SchemaInfo } from "@/lib/types";

interface SchemaSidebarProps {
  schema: SchemaInfo;
}

const TYPE_COLORS: Record<string, string> = {
  VARCHAR: "text-yellow-400",
  BIGINT: "text-blue-400",
  INTEGER: "text-blue-400",
  DOUBLE: "text-green-400",
  FLOAT: "text-green-400",
  DATE: "text-purple-400",
  TIMESTAMP: "text-purple-400",
  BOOLEAN: "text-orange-400",
};

function getTypeColor(type: string): string {
  const upper = type.toUpperCase();
  for (const key of Object.keys(TYPE_COLORS)) {
    if (upper.includes(key)) return TYPE_COLORS[key];
  }
  return "text-gray-400";
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
      className={`shrink-0 border-r border-white/10 bg-white/[0.02] transition-all ${
        collapsed ? "w-10" : "w-56"
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-gray-300">
              {schema.tableName}
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-1 text-gray-500 hover:bg-white/5 hover:text-gray-300"
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
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setTab("schema")}
              className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === "schema"
                  ? "border-b-2 border-primary text-primary"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Schema
            </button>
            <button
              onClick={() => setTab("preview")}
              className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === "preview"
                  ? "border-b-2 border-primary text-primary"
                  : "text-gray-500 hover:text-gray-300"
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
                <span className="text-[10px] text-gray-500">
                  {schema.rowCount} rows
                </span>
              </div>
              <div className="space-y-1">
                {schema.columns.map((col) => (
                  <div
                    key={col.name}
                    className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-white/5"
                  >
                    <span className="text-gray-300">{col.name}</span>
                    <span className={`font-mono text-[10px] ${getTypeColor(col.type)}`}>
                      {col.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto p-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="whitespace-nowrap px-1.5 py-1 text-left font-medium text-gray-500">
                      #
                    </th>
                    {schema.columns.map((col) => (
                      <th
                        key={col.name}
                        className="whitespace-nowrap px-1.5 py-1 text-left font-medium text-gray-400"
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
                      className="border-b border-white/5 hover:bg-white/5"
                    >
                      <td className="whitespace-nowrap px-1.5 py-1 text-gray-600">
                        {i + 1}
                      </td>
                      {schema.columns.map((col) => (
                        <td
                          key={col.name}
                          className="max-w-[120px] truncate whitespace-nowrap px-1.5 py-1 text-gray-300"
                          title={formatCellValue(row[col.name])}
                        >
                          {formatCellValue(row[col.name])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 text-center text-[10px] text-gray-600">
                Showing {schema.sampleRows.length} of {schema.rowCount} rows
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
