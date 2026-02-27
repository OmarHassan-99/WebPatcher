import { motion as Motion, AnimatePresence } from "framer-motion";
import { XCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Lottie from "lottie-react";
import { useScanProgress } from "../../../../hooks/useScanProgress";
import {
  GET_LOTTIE,
  GET_STAGE_STATUS,
  STAGE_ORDER,
  STAGES,
} from "../../../../data/constants";
import LoadingResultsPanel from "./LoadingResultsPanel";
import Shimmer from "./Shimmer";
import LiveTimer from "./LiveTimer";
import PipelineNode from "./PipelineNode";
import ActiveStageDetails from "./ActiveStageDetails";
import TerminalPanel from "./TerminalPanel";

export default function ScanProgressPanel({
  scanJobId,
  initialStatus,
  isLoadingResults,
}) {
  const {
    stage,
    percent,
    message,
    patches,
    patchTotal,
    isError,
    errorMessage,
  } = useScanProgress(scanJobId, initialStatus);

  const lottie = GET_LOTTIE(stage, isError);
  const currentIdx = STAGE_ORDER[stage] ?? 0;
  const overallPct = Math.round(((currentIdx + 1) / STAGES.length) * 100);
  const activeStage =
    STAGES.find((s) => GET_STAGE_STATUS(s.key, stage) === "active") ?? null;
  const showTerminal =
    stage === "patching" || stage === "done" || patches.length > 0;

  return (
    <Motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-4xl lg:max-w-6xl mx-auto px-4 sm:px-0"
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 -z-10 rounded-2xl blur-3xl bg-gradient-to-br from-violet-600/14 via-indigo-600/7 to-transparent" />

      {/* ── Card shell ── */}
      <div className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-white/[0.015] backdrop-blur-xl overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_28px_72px_-16px_rgba(0,0,0,0.55)]">
        <Shimmer />

        {/* ══ ROW 1: Header ══ */}
        <div className="px-5 sm:px-8 pt-5 sm:pt-6 pb-5">
          {/* ── Title row: [Back btn] [labels] [Timer · % pill] ── */}
          <div className="flex items-center gap-3 mb-5 sm:mb-6">
            {/* Back to targets button */}
            <Link
              to="/targets"
              className="group shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/15 text-white/40 hover:text-white/80 transition-all duration-200 text-xs font-medium"
            >
              <ArrowLeft
                size={13}
                className="transition-transform duration-200 group-hover:-translate-x-0.5"
              />
              <span className="hidden sm:inline">Targets</span>
            </Link>

            {/* Title + subtitle */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium tracking-widest uppercase text-white/25 font-mono leading-none">
                Security Scan
              </p>
              <h2 className="text-sm sm:text-base font-semibold text-white mt-0.5 truncate">
                {isError
                  ? "Scan Error"
                  : stage === "done"
                    ? "Scan Complete"
                    : stage === "queued"
                      ? "Preparing scan…"
                      : "Scanning target for vulnerabilities…"}
              </h2>
            </div>

            <LiveTimer isDone={stage === "done"} isError={isError} />

            {/* Overall % pill */}
            {!isError && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.07]">
                <div className="w-20 h-[3px] rounded-full bg-white/6 overflow-hidden">
                  <Motion.div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400"
                    animate={{
                      width: `${stage === "done" ? 100 : overallPct}%`,
                    }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <span className="text-[11px] font-mono text-white/40 tabular-nums w-8 text-right">
                  {stage === "done" ? "100" : overallPct}%
                </span>
              </div>
            )}
          </div>

          {/* ── Pipeline nodes ── */}
          <div className="flex items-start w-full">
            {STAGES.map((s, idx) => (
              <PipelineNode
                key={s.key}
                s={s}
                status={GET_STAGE_STATUS(s.key, stage)}
                isLast={idx === STAGES.length - 1}
              />
            ))}
          </div>

          {/* Mobile overall progress track (shown instead of pill on xs) */}
          {!isError && (
            <div className="sm:hidden mt-3 flex items-center gap-2">
              <div className="flex-1 h-[3px] rounded-full bg-white/6 overflow-hidden">
                <Motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400"
                  animate={{ width: `${stage === "done" ? 100 : overallPct}%` }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <span className="text-[11px] font-mono text-white/35 tabular-nums">
                {stage === "done" ? "100" : overallPct}%
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.05]" />

        {/* ══ ROW 2: Two-column body (stacks on mobile) ══ */}
        <div className="flex flex-col sm:flex-row min-h-[180px] sm:min-h-[200px]">
          {/* Left col: Lottie + % */}
          <div className="flex sm:flex-col items-center justify-center gap-4 sm:gap-3 sm:w-56 shrink-0 px-6 sm:px-8 py-5 sm:py-6 border-b sm:border-b-0 sm:border-r border-white/[0.05]">
            <AnimatePresence mode="wait">
              <Motion.div
                key={`lottie-${lottie.id}`}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.3 }}
              >
                <Lottie
                  animationData={lottie.animation}
                  className="w-28 h-28 sm:w-32 sm:h-32"
                  loop={lottie.loop}
                  autoplay
                />
              </Motion.div>
            </AnimatePresence>

            {!isError && (
              <div className="text-center">
                <p className="text-3xl font-bold text-white font-mono tabular-nums leading-none">
                  {stage === "done" ? "100" : overallPct}
                  <span className="text-base text-white/30">%</span>
                </p>
                <p className="text-[10px] text-white/25 mt-1">overall</p>
              </div>
            )}
          </div>

          {/* Right col: dynamic content */}
          <div className="flex-1 px-5 sm:px-7 py-5 sm:py-6 min-w-0">
            <AnimatePresence mode="wait">
              {/* ── Loading results transition ── */}
              {isLoadingResults ? (
                <Motion.div
                  key="loading-results"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="h-full"
                >
                  <LoadingResultsPanel />
                </Motion.div>
              ) : isError ? (
                <Motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-red-500/8 border border-red-500/20"
                >
                  <XCircle className="size-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-400 mb-0.5">
                      Scan Error
                    </p>
                    <p className="text-xs text-red-400/70">{errorMessage}</p>
                  </div>
                </Motion.div>
              ) : stage === "done" ? (
                <Motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-2"
                >
                  <p className="text-[10px] font-medium tracking-widest uppercase text-white/30 font-mono">
                    Result
                  </p>
                  <h3 className="text-base font-semibold text-emerald-400">
                    Scan Complete
                  </h3>
                  <p className="text-xs text-white/40 leading-relaxed">
                    {message}
                  </p>
                </Motion.div>
              ) : (
                <Motion.div
                  key={activeStage?.key ?? "idle"}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="h-full"
                >
                  <ActiveStageDetails
                    activeStage={activeStage}
                    percent={percent}
                    message={message}
                    patches={patches}
                    patchTotal={patchTotal}
                  />
                </Motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right col: Terminal panel (lg+ only) */}
          <AnimatePresence mode="popLayout">
            {showTerminal && (
              <TerminalPanel
                key={stage}
                patches={patches}
                patchTotal={patchTotal}
                stage={stage}
              />
            )}
          </AnimatePresence>
        </div>

        {/* ══ Footer ══ */}
        <div className="h-px bg-white/[0.04]" />
        <div className="px-5 sm:px-8 py-3 flex items-center justify-between gap-4">
          <span className="text-[10px] text-white/15 font-mono tracking-wider shrink-0">
            ID · {scanJobId?.slice(-8)?.toUpperCase() ?? "——"}
          </span>
          <span className="flex items-center gap-2 text-[10px] text-white/20 text-right">
            <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            You can leave — scan runs in the background
          </span>
        </div>
      </div>
    </Motion.div>
  );
}
