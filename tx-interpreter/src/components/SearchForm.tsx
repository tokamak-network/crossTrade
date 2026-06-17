// ============================================================================
// Component: SearchForm — Transaction hash input, chain selector, model selector
// ============================================================================

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Loader2, Zap, ChevronDown } from "lucide-react";
import { cn, isValidTxHash } from "@/lib/utils";
import { SUPPORTED_CHAINS, AI_MODELS } from "@/lib/constants";
import { ViewMode } from "@/lib/types";

interface SearchFormProps {
  onSubmit: (txHash: string, chainId: string, aiModel: string) => void;
  isLoading: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export default function SearchForm({
  onSubmit,
  isLoading,
  viewMode,
  onViewModeChange,
}: SearchFormProps) {
  const [txHash, setTxHash] = useState("");
  const [chainId, setChainId] = useState("ethereum");
  const [aiModel, setAiModel] = useState("qwen3-coder-flash");
  const [error, setError] = useState("");
  const [chainOpen, setChainOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);

  const selectedChain = SUPPORTED_CHAINS.find((c) => c.id === chainId)!;
  const selectedModel = AI_MODELS.find((m) => m.id === aiModel)!;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!txHash.trim()) {
      setError("Please enter a transaction hash");
      return;
    }

    if (!isValidTxHash(txHash.trim())) {
      setError("Invalid transaction hash. Must be 0x followed by 64 hex characters.");
      return;
    }

    onSubmit(txHash.trim(), chainId, aiModel);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-3xl mx-auto"
    >
      {/* Mode Toggle */}
      <div className="flex justify-center mb-8">
        <div className="relative flex items-center bg-zinc-900 rounded-full p-1 border border-zinc-800">
          <motion.div
            className="absolute h-[calc(100%-8px)] rounded-full bg-gradient-to-r from-blue-600 to-violet-600"
            layout
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            style={{
              width: "calc(50% - 4px)",
              left: viewMode === "user" ? "4px" : "calc(50%)",
              top: "4px",
            }}
          />
          <button
            onClick={() => onViewModeChange("user")}
            className={cn(
              "relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-colors",
              viewMode === "user" ? "text-white" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            👤 User Mode
          </button>
          <button
            onClick={() => onViewModeChange("dev")}
            className={cn(
              "relative z-10 px-6 py-2 rounded-full text-sm font-medium transition-colors",
              viewMode === "dev" ? "text-white" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            🛠 Dev Mode
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Transaction Hash Input */}
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-violet-500/20 blur-xl" />
          <div className="relative">
            <input
              type="text"
              value={txHash}
              onChange={(e) => {
                setTxHash(e.target.value);
                setError("");
              }}
              placeholder="Paste transaction hash (0x...)"
              className={cn(
                "w-full px-6 py-4 bg-zinc-900/90 backdrop-blur-sm border rounded-2xl",
                "text-white placeholder-zinc-500 text-lg font-mono",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50",
                "transition-all duration-200",
                error ? "border-red-500/50" : "border-zinc-700/50"
              )}
              disabled={isLoading}
            />
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-sm text-red-400 pl-2"
              >
                {error}
              </motion.p>
            )}
          </div>
        </div>

        {/* Chain + Model + Submit Row */}
        <div className="flex gap-3 items-stretch">
          {/* Chain Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setChainOpen(!chainOpen); setModelOpen(false); }}
              className={cn(
                "flex items-center gap-2 px-4 py-3 bg-zinc-900/90 border border-zinc-700/50",
                "rounded-xl text-white hover:border-zinc-600 transition-all",
                "min-w-[160px] justify-between"
              )}
              disabled={isLoading}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">{selectedChain.icon}</span>
                <span className="text-sm font-medium">{selectedChain.name}</span>
              </span>
              <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform", chainOpen && "rotate-180")} />
            </button>
            {chainOpen && (
              <motion.div
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute top-full mt-2 left-0 w-56 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden"
              >
                {SUPPORTED_CHAINS.map((chain) => (
                  <button
                    key={chain.id}
                    type="button"
                    onClick={() => {
                      setChainId(chain.id);
                      setChainOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-800 transition-colors",
                      chain.id === chainId && "bg-zinc-800"
                    )}
                  >
                    <span className="text-lg">{chain.icon}</span>
                    <span className="text-sm text-white">{chain.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* AI Model Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setModelOpen(!modelOpen); setChainOpen(false); }}
              className={cn(
                "flex items-center gap-2 px-4 py-3 bg-zinc-900/90 border border-zinc-700/50",
                "rounded-xl text-white hover:border-zinc-600 transition-all",
                "min-w-[200px] justify-between"
              )}
              disabled={isLoading}
            >
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium">{selectedModel.name}</span>
                <span className={cn(
                  "text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase",
                  selectedModel.tier === "free" && "bg-emerald-500/20 text-emerald-400",
                  selectedModel.tier === "standard" && "bg-blue-500/20 text-blue-400",
                  selectedModel.tier === "premium" && "bg-amber-500/20 text-amber-400"
                )}>
                  {selectedModel.tier}
                </span>
              </span>
              <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform", modelOpen && "rotate-180")} />
            </button>
            {modelOpen && (
              <motion.div
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute top-full mt-2 right-0 w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden max-h-[420px] overflow-y-auto"
              >
                {(["free", "standard", "premium"] as const).map((tier) => {
                  const tierModels = AI_MODELS.filter((m) => m.tier === tier);
                  if (tierModels.length === 0) return null;
                  return (
                    <div key={tier}>
                      <div className="px-4 py-2 bg-zinc-800/50 border-b border-zinc-700/50 sticky top-0">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          tier === "free" && "text-emerald-400",
                          tier === "standard" && "text-blue-400",
                          tier === "premium" && "text-amber-400"
                        )}>
                          {tier === "free" ? "⚡ Free" : tier === "standard" ? "💎 Standard" : "👑 Premium"}
                        </span>
                      </div>
                      {tierModels.map((model) => (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => {
                            setAiModel(model.id);
                            setModelOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-zinc-800 transition-colors",
                            model.id === aiModel && "bg-zinc-800"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-white font-medium">{model.name}</span>
                              <span className="text-[9px] text-zinc-500">{model.provider}</span>
                            </div>
                            <span className="text-xs text-zinc-400 line-clamp-1">{model.description}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-6 py-3",
              "bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500",
              "text-white font-semibold rounded-xl transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Decoding...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>Decode Transaction</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Mode description */}
      <motion.p
        key={viewMode}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center text-sm text-zinc-500 mt-4"
      >
        {viewMode === "user"
          ? "Simple, clear explanation of what happened — no technical jargon"
          : "Full technical trace with call tree, gas analysis, and decoded parameters"}
      </motion.p>
    </motion.div>
  );
}
