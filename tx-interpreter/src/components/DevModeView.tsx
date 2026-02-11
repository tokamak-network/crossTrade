// ============================================================================
// Component: DevModeView — Full technical analysis for developers
// ============================================================================

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code2,
  Shield,
  Fuel,
  Activity,
  FileText,
  Zap,
  X,
  ChevronDown,
} from "lucide-react";
import {
  DevModeInterpretation,
  InternalCall,
  EventLog,
  TransactionTrace,
} from "@/lib/types";
import { cn, shortenAddress } from "@/lib/utils";
import CallTree from "./CallTree";

interface DevModeViewProps {
  interpretation: DevModeInterpretation;
  trace: TransactionTrace;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function DevModeView({
  interpretation,
  trace,
}: DevModeViewProps) {
  const [selectedCall, setSelectedCall] = useState<InternalCall | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["overview", "callTree", "functions"])
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-4"
    >
      {/* Technical Overview */}
      <CollapsibleSection
        id="overview"
        title="Technical Overview"
        icon={<Code2 className="w-5 h-5" />}
        expanded={expandedSections.has("overview")}
        onToggle={toggleSection}
        variants={item}
      >
        <p className="text-zinc-300 leading-relaxed mb-4">
          {interpretation.technicalOverview}
        </p>
        <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
          <h4 className="text-sm font-semibold text-zinc-400 mb-2">
            Call Flow
          </h4>
          <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
            {interpretation.callFlowExplanation}
          </p>
        </div>
      </CollapsibleSection>

      {/* Call Tree */}
      <CollapsibleSection
        id="callTree"
        title={`Execution Trace (${countCalls(trace.internalCalls)} calls)`}
        icon={<Activity className="w-5 h-5" />}
        expanded={expandedSections.has("callTree")}
        onToggle={toggleSection}
        variants={item}
      >
        <CallTree calls={trace.internalCalls} onSelectCall={setSelectedCall} />
      </CollapsibleSection>

      {/* Function Explanations */}
      {interpretation.functionExplanations.length > 0 && (
        <CollapsibleSection
          id="functions"
          title={`Function Analysis (${interpretation.functionExplanations.length})`}
          icon={<Zap className="w-5 h-5" />}
          expanded={expandedSections.has("functions")}
          onToggle={toggleSection}
          variants={item}
        >
          <div className="space-y-3">
            {interpretation.functionExplanations.map((fn, i) => (
              <div
                key={i}
                className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50 hover:border-zinc-600/50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                    {shortenAddress(fn.contract, 4)}
                  </span>
                  <span className="text-white font-mono font-medium text-sm">
                    {fn.functionName}
                  </span>
                  {fn.gasUsed && (
                    <span className="text-xs text-zinc-500 ml-auto">
                      ⛽ {fn.gasUsed}
                    </span>
                  )}
                </div>
                <p className="text-zinc-300 text-sm">{fn.explanation}</p>
                {fn.params && (
                  <p className="text-zinc-500 text-xs mt-2 font-mono">
                    Params: {fn.params}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Gas Analysis */}
      <CollapsibleSection
        id="gas"
        title="Gas Analysis"
        icon={<Fuel className="w-5 h-5" />}
        expanded={expandedSections.has("gas")}
        onToggle={toggleSection}
        variants={item}
      >
        <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
          {interpretation.gasAnalysis}
        </p>
      </CollapsibleSection>

      {/* Events */}
      <CollapsibleSection
        id="events"
        title={`Events Emitted (${trace.events.length})`}
        icon={<FileText className="w-5 h-5" />}
        expanded={expandedSections.has("events")}
        onToggle={toggleSection}
        variants={item}
      >
        <div className="space-y-2">
          {trace.events.map((event, i) => (
            <EventRow key={i} event={event} />
          ))}
        </div>
        {interpretation.eventAnalysis && (
          <div className="mt-4 bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
            <h4 className="text-sm font-semibold text-zinc-400 mb-2">
              AI Analysis
            </h4>
            <p className="text-zinc-300 text-sm leading-relaxed">
              {interpretation.eventAnalysis}
            </p>
          </div>
        )}
      </CollapsibleSection>

      {/* State Changes */}
      {interpretation.stateChanges && (
        <CollapsibleSection
          id="state"
          title="State Changes"
          icon={<FileText className="w-5 h-5" />}
          expanded={expandedSections.has("state")}
          onToggle={toggleSection}
          variants={item}
        >
          <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
            {interpretation.stateChanges}
          </p>
        </CollapsibleSection>
      )}

      {/* Security Notes */}
      {interpretation.securityNotes.length > 0 && (
        <CollapsibleSection
          id="security"
          title="Security Notes"
          icon={<Shield className="w-5 h-5" />}
          expanded={expandedSections.has("security")}
          onToggle={toggleSection}
          variants={item}
        >
          <ul className="space-y-2">
            {interpretation.securityNotes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Shield className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="text-zinc-300">{note}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Contracts Involved */}
      <CollapsibleSection
        id="contracts"
        title={`Contracts Involved (${trace.contracts.length})`}
        icon={<Code2 className="w-5 h-5" />}
        expanded={expandedSections.has("contracts")}
        onToggle={toggleSection}
        variants={item}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {trace.contracts.map((contract, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50"
            >
              <div
                className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  contract.verified ? "bg-emerald-400" : "bg-zinc-500"
                )}
              />
              <div className="min-w-0">
                <p className="text-sm text-white font-mono truncate">
                  {shortenAddress(contract.address, 8)}
                </p>
                <p className="text-xs text-zinc-400">
                  {contract.name || "Unknown"}{" "}
                  {contract.verified ? "✓ Verified" : "⚠ Unverified"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Selected Call Detail Panel */}
      <AnimatePresence>
        {selectedCall && (
          <CallDetailPanel
            call={selectedCall}
            onClose={() => setSelectedCall(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------- Sub-components ----------

function CollapsibleSection({
  id,
  title,
  icon,
  expanded,
  onToggle,
  children,
  variants,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
  variants: typeof item;
}) {
  return (
    <motion.div
      variants={variants}
      className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-zinc-800/30 transition-colors"
      >
        <span className="text-zinc-400">{icon}</span>
        <span className="text-white font-semibold flex-1">{title}</span>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-zinc-400 transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function EventRow({ event }: { event: EventLog }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-zinc-800/80 transition-colors"
      >
        <span className="text-xs text-emerald-400 font-mono">
          {event.name}
        </span>
        <span className="text-xs text-zinc-500 font-mono truncate">
          {shortenAddress(event.address, 4)}
        </span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 text-zinc-500 ml-auto transition-transform",
            expanded && "rotate-180"
          )}
        />
      </button>
      {expanded && event.params.length > 0 && (
        <div className="px-3 pb-3 space-y-1">
          {event.params.map((param, i) => (
            <div key={i} className="flex gap-2 text-xs font-mono">
              <span className="text-zinc-500">{param.name}</span>
              <span className="text-zinc-600">({param.type}):</span>
              <span className="text-white break-all">{param.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CallDetailPanel({
  call,
  onClose,
}: {
  call: InternalCall;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed right-0 top-0 h-full w-full max-w-lg bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 overflow-y-auto"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Call Details</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <div className="space-y-4">
          <DetailField label="Type" value={call.type} />
          <DetailField label="From" value={call.from} mono />
          <DetailField label="To" value={call.to} mono />
          <DetailField
            label="Function"
            value={call.methodName || "Unknown"}
          />
          {call.methodSignature && (
            <DetailField
              label="Signature"
              value={call.methodSignature}
              mono
            />
          )}
          <DetailField label="Value" value={call.value} mono />
          <DetailField label="Gas Used" value={call.gasUsed} />

          {call.error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <p className="text-sm text-red-400 font-medium">Error</p>
              <p className="text-sm text-red-300 mt-1">{call.error}</p>
            </div>
          )}

          {call.decodedInput.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-zinc-400 mb-2">
                Input Parameters
              </h4>
              <div className="space-y-2">
                {call.decodedInput.map((param, i) => (
                  <div
                    key={i}
                    className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50"
                  >
                    <div className="flex gap-2 text-xs font-mono">
                      <span className="text-blue-400">{param.name}</span>
                      <span className="text-zinc-500">({param.type})</span>
                    </div>
                    <p className="text-sm text-white mt-1 font-mono break-all">
                      {param.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {call.input && call.input !== "0x" && (
            <div>
              <h4 className="text-sm font-semibold text-zinc-400 mb-2">
                Raw Input Data
              </h4>
              <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                <p className="text-xs text-zinc-300 font-mono break-all max-h-40 overflow-y-auto">
                  {call.input}
                </p>
              </div>
            </div>
          )}

          <DetailField
            label="Child Calls"
            value={`${call.children.length} sub-calls`}
          />
        </div>
      </div>
    </motion.div>
  );
}

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p
        className={cn(
          "text-sm text-white break-all",
          mono && "font-mono"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function countCalls(calls: InternalCall[]): number {
  let count = calls.length;
  for (const call of calls) {
    count += countCalls(call.children);
  }
  return count;
}
