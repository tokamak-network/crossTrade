// ============================================================================
// Component: ErrorState — Displays errors with retry option
// ============================================================================

"use client";

import { motion } from "framer-motion";
import { AlertCircle, RotateCcw } from "lucide-react";

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-xl mx-auto py-12"
    >
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Decoding Failed
        </h3>
        <p className="text-zinc-400 mb-6 max-w-md mx-auto">{message}</p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </motion.div>
  );
}
