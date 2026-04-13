// ============================================================================
// Main Page — TX Interpreter
// ============================================================================

"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github } from "lucide-react";
import SearchForm from "@/components/SearchForm";
import TransactionOverview from "@/components/TransactionOverview";
import UserModeView from "@/components/UserModeView";
import DevModeView from "@/components/DevModeView";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import { ViewMode, DecodeResponse, TransactionTrace, InterpretationResult } from "@/lib/types";

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("user");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trace, setTrace] = useState<TransactionTrace | null>(null);
  const [interpretation, setInterpretation] = useState<InterpretationResult | null>(null);
  const [currentChain, setCurrentChain] = useState<string>("ethereum");
  const [lastSearch, setLastSearch] = useState<{
    txHash: string;
    chainId: string;
    aiModel: string;
  } | null>(null);

  const handleDecode = useCallback(
    async (txHash: string, chainId: string, aiModel: string) => {
      setIsLoading(true);
      setError(null);
      setTrace(null);
      setInterpretation(null);
      setCurrentChain(chainId);
      setLastSearch({ txHash, chainId, aiModel });

      try {
        const response = await fetch("/api/decode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ txHash, chainId, aiModel }),
        });

        const data: DecodeResponse = await response.json();

        if (!data.success || !data.trace || !data.interpretation) {
          throw new Error(data.error || "Failed to decode transaction");
        }

        setTrace(data.trace);
        setInterpretation(data.interpretation);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleRetry = () => {
    if (lastSearch) {
      handleDecode(lastSearch.txHash, lastSearch.chainId, lastSearch.aiModel);
    }
  };

  const hasResult = trace && interpretation;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
              <span className="text-lg">🔬</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                TX Interpreter
              </h1>
              <p className="text-[10px] text-zinc-500 -mt-0.5">
                by Tokamak Network
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-500 hidden sm:block">
              AI-Powered Transaction Decoder
            </span>
            <a
              href="https://github.com/tokamak-network"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section (shown when no results) */}
          {!hasResult && !isLoading && !error && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12 pt-8"
            >
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
                Decode Any Transaction
              </h2>
              <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                Paste a transaction hash, pick your chain and AI model — get a
                clear, visual explanation of exactly what happened on-chain.
              </p>
              <div className="flex items-center justify-center gap-6 mt-6 text-sm text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Multi-chain
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  AI-powered
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-400" />
                  User & Dev modes
                </span>
              </div>
            </motion.div>
          )}

          {/* Search Form */}
          <div className={hasResult ? "mb-8" : "mb-16"}>
            <SearchForm
              onSubmit={handleDecode}
              isLoading={isLoading}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          </div>

          {/* Loading */}
          {isLoading && <LoadingState />}

          {/* Error */}
          {error && !isLoading && (
            <ErrorState message={error} onRetry={handleRetry} />
          )}

          {/* Results */}
          <AnimatePresence mode="wait">
            {hasResult && !isLoading && (
              <motion.div
                key={`${trace.basic.hash}-${viewMode}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Transaction Overview */}
                <TransactionOverview
                  tx={trace.basic}
                  chainId={currentChain}
                  viewMode={viewMode}
                />

                {/* Mode-specific view */}
                {viewMode === "user" ? (
                  <UserModeView
                    interpretation={interpretation.userMode}
                    balanceChanges={trace.balanceChanges}
                  />
                ) : (
                  <DevModeView
                    interpretation={interpretation.devMode}
                    trace={trace}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-zinc-500">
          <span>&copy; 2026 Tokamak Network. TX Interpreter.</span>
          <span>Built with AI-powered analysis</span>
        </div>
      </footer>
    </div>
  );
}
