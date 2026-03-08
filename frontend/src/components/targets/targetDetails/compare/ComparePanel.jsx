import { useState, useMemo } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { getFindings } from "../../../../utils/http/zap";
import CountUp from "../../../../react-bits/CountUp";
import SpotlightCard from "../../../../react-bits/SpotlightCard";

export default function ComparePanel({ currentScan, csrfToken }) {
  const [filter, setFilter] = useState("all");

  const {
    data: previousData,
    isPending,
    error,
  } = useQuery({
    queryKey: ["scans", currentScan.previousScanId],
    queryFn: () =>
      getFindings({ csrfToken, scanId: currentScan.previousScanId }),
    enabled: !!currentScan.previousScanId,
    staleTime: Infinity,
  });

  const comparison = useMemo(() => {
    if (!previousData || !previousData.findings) return null;

    const oldFindings = previousData.findings;
    const currentFindings = currentScan?.findings || [];

    const oldKeys = new Set(oldFindings.map((f) => f.pluginId + f.alertName));
    const newKeys = new Set(
      currentFindings.map((f) => f.pluginId + f.alertName),
    );

    const resolved = oldFindings.filter(
      (f) => !newKeys.has(f.pluginId + f.alertName),
    );
    const introduced = currentFindings.filter(
      (f) => !oldKeys.has(f.pluginId + f.alertName),
    );
    const persistent = currentFindings.filter((f) =>
      oldKeys.has(f.pluginId + f.alertName),
    );

    return { resolved, introduced, persistent };
  }, [previousData, currentScan]);

  if (!currentScan.previousScanId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-400">
        <p>This scan was not run from a previous scan.</p>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex h-64 w-full items-center justify-center text-primary-200/50">
        <Loader2 className="animate-spin mr-3" size={32} />
        <span className="animate-pulse">Loading previous scan data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-red-400">
        <AlertTriangle size={32} className="mb-2" />
        <p>Failed to load previous scan data for comparison.</p>
      </div>
    );
  }

  if (!comparison) return null;

  const { resolved, introduced, persistent } = comparison;

  const displayList =
    filter === "resolved"
      ? resolved
      : filter === "introduced"
        ? introduced
        : filter === "persistent"
          ? persistent
          : [...introduced, ...resolved, ...persistent]; // All

  return (
    <div className="flex flex-col w-full space-y-8 animate-in fade-in duration-500">
      {/* Hero Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Resolved Card */}
        <div className="relative group p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 overflow-hidden glass-card transition-all duration-300 hover:bg-emerald-500/20">
          <div className="absolute top-0 right-0 p-16 bg-emerald-500/20 blur-[50px] rounded-full pointer-events-none" />
          <div className="relative z-10 flex flex-col">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <CheckCircle size={20} />
              <h3 className="font-bold tracking-wide uppercase text-sm">
                Resolved
              </h3>
            </div>
            <div className="text-5xl font-black text-white drop-shadow-md">
              <CountUp from={0} to={resolved.length} duration={1} />
            </div>
            <p className="text-emerald-200/60 text-xs mt-2">
              Vulnerabilities fixed
            </p>
          </div>
        </div>

        {/* Introduced Card */}
        <div className="relative group p-6 rounded-3xl bg-red-500/10 border border-red-500/30 overflow-hidden glass-card transition-all duration-300 hover:bg-red-500/20">
          <div className="absolute top-0 right-0 p-16 bg-red-500/20 blur-[50px] rounded-full pointer-events-none" />
          <div className="relative z-10 flex flex-col">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <ShieldAlert size={20} />
              <h3 className="font-bold tracking-wide uppercase text-sm">
                New Risks
              </h3>
            </div>
            <div className="text-5xl font-black text-white drop-shadow-md">
              <CountUp from={0} to={introduced.length} duration={1} />
            </div>
            <p className="text-red-200/60 text-xs mt-2">Newly introduced</p>
          </div>
        </div>

        {/* Persistent Card */}
        <div className="relative group p-6 rounded-3xl bg-amber-500/10 border border-amber-500/30 overflow-hidden glass-card transition-all duration-300 hover:bg-amber-500/20">
          <div className="absolute top-0 right-0 p-16 bg-amber-500/20 blur-[50px] rounded-full pointer-events-none" />
          <div className="relative z-10 flex flex-col">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <Clock size={20} />
              <h3 className="font-bold tracking-wide uppercase text-sm">
                Persistent
              </h3>
            </div>
            <div className="text-5xl font-black text-white drop-shadow-md">
              <CountUp from={0} to={persistent.length} duration={1} />
            </div>
            <p className="text-amber-200/60 text-xs mt-2">Remained unfixed</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex justify-center mt-4">
        <div className="inline-flex gap-2 p-1 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10">
          {["all", "introduced", "resolved", "persistent"].map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all duration-300 z-10 relative cursor-pointer ${
                filter === opt
                  ? "text-gray-900 bg-white shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* List Display */}
      <Motion.div
        layout
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4"
      >
        <AnimatePresence>
          {displayList.map((finding, idx) => {
            const isResolved = resolved.some(
              (f) =>
                f.pluginId === finding.pluginId &&
                f.alertName === finding.alertName,
            );
            const isIntroduced = introduced.some(
              (f) =>
                f.pluginId === finding.pluginId &&
                f.alertName === finding.alertName,
            );

            const typeColor = isResolved
              ? "text-emerald-400"
              : isIntroduced
                ? "text-red-400"
                : "text-amber-400";

            const badgeBg = isResolved
              ? "bg-emerald-500/10 border-emerald-500/20"
              : isIntroduced
                ? "bg-red-500/10 border-red-500/20"
                : "bg-amber-500/10 border-amber-500/20";

            return (
              <Motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                key={
                  finding.pluginId +
                  finding.alertName +
                  (isResolved ? "resolved" : "active")
                }
                className="h-full"
              >
                <SpotlightCard
                  className="h-full flex flex-col p-6 glass-card rounded-3xl"
                  spotlightColor="rgba(120, 119, 198, 0.3)"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wide rounded-lg border ${badgeBg} ${typeColor}`}
                    >
                      {isResolved
                        ? "Resolved"
                        : isIntroduced
                          ? "New Risk"
                          : "Persistent"}
                    </div>
                    {/* Severity Badge */}
                    <div className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-white/10 text-gray-300">
                      {finding.severity}
                    </div>
                  </div>

                  <h4
                    className={`text-lg font-bold mb-2 ${isResolved ? "line-through text-gray-400" : "text-white"}`}
                  >
                    {finding.alertName}
                  </h4>
                  <p className="text-sm text-gray-400 line-clamp-3 mb-4 flex-grow">
                    {finding.description}
                  </p>

                  <div className="mt-auto text-xs text-gray-500 flex items-center justify-between">
                    <span>Plugin ID: {finding.pluginId}</span>
                    {isResolved && (
                      <CheckCircle size={16} className="text-emerald-500" />
                    )}
                    {isIntroduced && (
                      <ShieldAlert
                        size={16}
                        className="text-red-500 animate-pulse"
                      />
                    )}
                  </div>
                </SpotlightCard>
              </Motion.div>
            );
          })}
        </AnimatePresence>

        {displayList.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 italic">
            No vulnerabilities match this filter.
          </div>
        )}
      </Motion.div>
    </div>
  );
}
