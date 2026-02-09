"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { fadeInUp } from "@/lib/animations";
import { formatBytes } from "@/lib/utils";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const MAX_SIZE = 4 * 1024 * 1024; // 4MB

export function FileDropzone({ onFileSelect, disabled }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSelect = useCallback(
    (file: File) => {
      setError(null);
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setError("Please upload a CSV file.");
        return;
      }
      if (file.size > MAX_SIZE) {
        setError(`File too large (${formatBytes(file.size)}). Max 4MB.`);
        return;
      }
      if (file.size === 0) {
        setError("File is empty.");
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) validateAndSelect(file);
    },
    [disabled, validateAndSelect]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (disabled) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) validateAndSelect(file);
    };
    input.click();
  }, [disabled, validateAndSelect]);

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible">
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`group relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-300 ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-zinc-300 dark:border-zinc-700 hover:border-primary/50 hover:bg-zinc-50 dark:hover:bg-zinc-900"
        } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className={`rounded-2xl p-4 transition-colors ${
              isDragging ? "bg-primary/20" : "bg-zinc-100 dark:bg-zinc-800 group-hover:bg-primary/10"
            }`}
          >
            {isDragging ? (
              <FileSpreadsheet className="h-10 w-10 text-primary" />
            ) : (
              <Upload className="h-10 w-10 text-zinc-400 dark:text-zinc-500 group-hover:text-primary" />
            )}
          </div>
          <div>
            <p className="text-lg font-medium text-foreground">
              {isDragging ? "Drop your CSV here" : "Drop CSV file here or click to browse"}
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              CSV files up to 4MB
            </p>
          </div>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </motion.div>
      )}
    </motion.div>
  );
}
