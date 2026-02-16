"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Loader2, AlertCircle, RotateCcw } from "lucide-react";

import { AnimatedBackground } from "@/components/shared/animated-background";
import { Navbar } from "@/components/shared/navbar";
import { FileDropzone } from "@/components/upload/file-dropzone";
import { SampleDatasetButton } from "@/components/upload/sample-dataset-button";
import { ChatContainer } from "@/components/chat/chat-container";
import { initDB, loadCSV, close } from "@/lib/duckdb";
import { extractSchema } from "@/lib/schema";
import type { SchemaInfo, AppState } from "@/lib/types";

export default function Home() {
  const [state, setState] = useState<AppState>("upload");
  const [schema, setSchema] = useState<SchemaInfo | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  const handleFileSelect = useCallback(async (file: File) => {
    setFileName(file.name);
    setState("loading");
    setError("");

    try {
      await initDB();
      await loadCSV(file);
      const schemaInfo = await extractSchema();
      setSchema(schemaInfo);
      setState("ready");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dataset"
      );
      setState("error");
    }
  }, []);

  const handleReset = useCallback(async () => {
    try {
      await close();
    } catch {
      // Ignore cleanup errors
    }
    setState("upload");
    setSchema(null);
    setFileName("");
    setError("");
  }, []);

  return (
    <div className="relative z-10 flex min-h-screen flex-col text-foreground">
      <AnimatedBackground />
      <Navbar onNewChat={handleReset} showNewChat={state === "ready"} />

      {/* Upload State */}
      {state === "upload" && (
        <main className="mx-auto max-w-2xl px-4 pt-16 sm:px-6 sm:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 text-center"
          >
            <div className="mx-auto mb-4 inline-flex rounded-2xl bg-primary/10 p-4">
              <MessageSquare className="h-10 w-10 text-primary" />
            </div>
            <h1 className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 dark:from-white dark:via-gray-200 dark:to-gray-400 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
              Chat with Data
            </h1>
            <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
              Upload a CSV and ask questions in plain English
            </p>
          </motion.div>

          <FileDropzone onFileSelect={handleFileSelect} />

          <div className="mt-4 flex justify-center">
            <SampleDatasetButton onFileReady={handleFileSelect} />
          </div>
        </main>
      )}

      {/* Loading State */}
      {state === "loading" && (
        <main className="flex min-h-[60vh] flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              Loading {fileName}...
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Initializing DuckDB and extracting schema
            </p>

            <div className="mt-10 grid max-w-lg gap-3 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-100 dark:bg-zinc-800"
                />
              ))}
            </div>
          </motion.div>
        </main>
      )}

      {/* Error State */}
      {state === "error" && (
        <main className="flex min-h-[60vh] flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="mx-auto mb-4 inline-flex rounded-2xl bg-red-500/10 p-4">
              <AlertCircle className="h-10 w-10 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Failed to Load Dataset
            </h2>
            <p className="mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">{error}</p>
            <button
              onClick={handleReset}
              className="mt-6 inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-5 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 transition-all hover:border-primary/30 hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary"
            >
              <RotateCcw className="h-4 w-4" />
              Try Again
            </button>
          </motion.div>
        </main>
      )}

      {/* Chat State */}
      {state === "ready" && schema && <ChatContainer schema={schema} />}

      {/* Footer (only on upload) */}
      {state === "upload" && (
        <footer className="mt-auto border-t border-zinc-200/50 dark:border-zinc-800/50 py-6 text-center text-xs text-zinc-500">
          Built by{" "}
          <a
            href="https://revinobakmaldi.vercel.app"
            className="text-primary hover:underline"
          >
            Revino B Akmaldi
          </a>
        </footer>
      )}
    </div>
  );
}
