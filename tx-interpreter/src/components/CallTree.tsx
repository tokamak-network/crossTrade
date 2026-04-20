// ============================================================================
// Component: CallTree — Interactive expandable call trace for dev mode
// ============================================================================

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Copy, Check, AlertCircle } from "lucide-react";
import { InternalCall } from "@/lib/types";
import { cn, shortenAddress, formatGas } from "@/lib/utils";

interface CallTreeProps {
  calls: InternalCall[];
  onSelectCall: (call: InternalCall) => void;
}

export default function CallTree({ calls, onSelectCall }: CallTreeProps) {
  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        🌳 Execution Call Tree
      </h3>
      <div className="font-mono text-sm overflow-x-auto">
        {calls.map((call, i) => (
          <CallNode key={i} call={call} onSelect={onSelectCall} />
        ))}
      </div>
    </div>
  );
}

function CallNode({
  call,
  onSelect,
}: {
  call: InternalCall;
  onSelect: (call: InternalCall) => void;
}) {
  const [expanded, setExpanded] = useState(call.depth < 2);
  const [copied, setCopied] = useState(false);
  const hasChildren = call.children.length > 0;

  const gasNum = parseInt(call.gasUsed);
  const gasColor =
    gasNum > 100000
      ? "text-red-400"
      : gasNum > 50000
        ? "text-orange-400"
        : gasNum > 10000
          ? "text-yellow-400"
          : "text-emerald-400";

  const typeColors: Record<string, string> = {
    CALL: "text-blue-400",
    STATICCALL: "text-cyan-400",
    DELEGATECALL: "text-violet-400",
    CREATE: "text-emerald-400",
    CREATE2: "text-emerald-400",
    SELFDESTRUCT: "text-red-400",
  };

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(call.to);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ paddingLeft: `${call.depth * 20}px` }}>
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer",
          "hover:bg-zinc-800/80 transition-colors group",
          call.error && "bg-red-500/5"
        )}
        onClick={() => onSelect(call)}
      >
        {/* Expand toggle */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-0.5 hover:bg-zinc-700 rounded"
          >
            <ChevronRight
              className={cn(
                "w-3.5 h-3.5 text-zinc-400 transition-transform",
                expanded && "rotate-90"
              )}
            />
          </button>
        ) : (
          <span className="w-4.5" />
        )}

        {/* Call type badge */}
        <span
          className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded",
            typeColors[call.type] || "text-zinc-400",
            "bg-zinc-800 border border-zinc-700"
          )}
        >
          {call.type}
        </span>

        {/* Contract address */}
        <span className="text-zinc-400 flex items-center gap-1">
          {shortenAddress(call.to, 4)}
          <button
            onClick={handleCopyAddress}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3 text-zinc-500 hover:text-white" />
            )}
          </button>
        </span>

        {/* Method name */}
        <span className="text-white font-medium">
          .{call.methodName || "unknown"}
          {call.decodedInput.length > 0 && (
            <span className="text-zinc-500">
              ({call.decodedInput.map((p) => p.type).join(", ")})
            </span>
          )}
        </span>

        {/* Gas */}
        <span className={cn("text-xs ml-auto", gasColor)}>
          ⛽ {formatGas(call.gasUsed)}
        </span>

        {/* Error indicator */}
        {call.error && (
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
        )}
      </div>

      {/* Children */}
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {call.children.map((child, i) => (
              <CallNode key={i} call={child} onSelect={onSelect} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
