"use client";

import { motion } from "framer-motion";
import { MessageSquare, ArrowLeft, RotateCcw } from "lucide-react";

interface NavbarProps {
  onNewChat?: () => void;
  showNewChat?: boolean;
}

export function Navbar({ onNewChat, showNewChat }: NavbarProps) {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">Chat with Data</span>
        </div>
        <div className="flex items-center gap-3">
          {showNewChat && onNewChat && (
            <button
              onClick={onNewChat}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 transition-all hover:border-primary/30 hover:bg-white/[0.08] hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              New Chat
            </button>
          )}
          <a
            href="https://revinobakmaldi.vercel.app"
            className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Portfolio
          </a>
        </div>
      </div>
    </motion.nav>
  );
}
