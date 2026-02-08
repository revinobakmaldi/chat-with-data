"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Database, Loader2 } from "lucide-react";
import { fadeInUp } from "@/lib/animations";

interface SampleDatasetButtonProps {
  onFileReady: (file: File) => void;
  disabled?: boolean;
}

export function SampleDatasetButton({ onFileReady, disabled }: SampleDatasetButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (disabled || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/sample.csv");
      const blob = await res.blob();
      const file = new File([blob], "sample_dataset.csv", { type: "text/csv" });
      onFileReady(file);
    } catch {
      console.error("Failed to load sample dataset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      onClick={handleClick}
      disabled={disabled || loading}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-gray-300 transition-all hover:border-primary/30 hover:bg-white/[0.08] hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Database className="h-4 w-4" />
      )}
      Try with sample data
    </motion.button>
  );
}
