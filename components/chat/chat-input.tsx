"use client";

import { useState, useCallback } from "react";
import { Send, Sparkles } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onGetInsights?: () => void;
  disabled?: boolean;
  suggestedQuestions?: string[];
}

export function ChatInput({ onSend, onGetInsights, disabled, suggestedQuestions }: ChatInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed || disabled) return;
      onSend(trimmed);
      setValue("");
    },
    [value, disabled, onSend]
  );

  const handleSuggestionClick = useCallback(
    (question: string) => {
      if (disabled) return;
      onSend(question);
    },
    [disabled, onSend]
  );

  return (
    <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-black/80 backdrop-blur-xl">
      {suggestedQuestions && suggestedQuestions.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-3">
          {onGetInsights && (
            <button
              onClick={onGetInsights}
              disabled={disabled}
              className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 dark:bg-primary/20 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:border-primary/50 hover:bg-primary/20 dark:hover:bg-primary/30 disabled:pointer-events-none disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Get Insights
            </button>
          )}
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => handleSuggestionClick(q)}
              disabled={disabled}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 transition-all hover:border-primary/30 hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary disabled:pointer-events-none disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask a question about your data..."
          disabled={disabled}
          className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-4 py-3 text-sm text-foreground placeholder:text-zinc-500 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="rounded-xl bg-primary p-3 text-white transition-all hover:bg-primary-dark disabled:opacity-50 disabled:hover:bg-primary"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
