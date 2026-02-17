"use client";

import { motion } from "framer-motion";
import { Loader2, Check, Brain, Database, Sparkles } from "lucide-react";
import type { InsightsProgress as InsightsProgressType } from "@/lib/types";

interface InsightsProgressProps {
  progress: InsightsProgressType;
}

const steps = [
  { key: "planning", label: "Planning analysis", icon: Brain },
  { key: "executing", label: "Running queries", icon: Database },
  { key: "synthesizing", label: "Synthesizing insights", icon: Sparkles },
] as const;

type StepKey = (typeof steps)[number]["key"];

function getStepStatus(
  stepKey: StepKey,
  currentPhase: InsightsProgressType["phase"]
): "pending" | "active" | "completed" {
  const order: StepKey[] = ["planning", "executing", "synthesizing"];
  const stepIndex = order.indexOf(stepKey);
  const phaseIndex = order.indexOf(currentPhase as StepKey);

  if (currentPhase === "done") return "completed";
  if (currentPhase === "error") {
    return stepIndex < phaseIndex ? "completed" : stepIndex === phaseIndex ? "active" : "pending";
  }
  if (stepIndex < phaseIndex) return "completed";
  if (stepIndex === phaseIndex) return "active";
  return "pending";
}

export function InsightsProgress({ progress }: InsightsProgressProps) {
  if (progress.phase === "done") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900 p-4"
    >
      <div className="space-y-3">
        {steps.map((step) => {
          const status = getStepStatus(step.key, progress.phase);
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex items-center gap-3">
              {/* Status indicator */}
              <div className="shrink-0">
                {status === "completed" ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                ) : status === "active" ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <Icon className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                  </div>
                )}
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm ${
                    status === "active"
                      ? "font-medium text-zinc-800 dark:text-zinc-200"
                      : status === "completed"
                        ? "text-zinc-500 dark:text-zinc-400"
                        : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {step.label}
                </span>
                {/* Show query progress during executing phase */}
                {step.key === "executing" && status === "active" && (
                  <span className="ml-2 text-xs text-zinc-500">
                    ({progress.completedQueries}/{progress.totalQueries}
                    {progress.currentQueryTitle && `: ${progress.currentQueryTitle}`})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
