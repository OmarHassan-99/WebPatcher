import { motion as Motion, AnimatePresence } from "framer-motion";
import ProgressBar from "./ProgressBar";
import PatchList from "./PatchList";

export default function ActiveStageDetails({
  activeStage,
  percent,
  message,
  patches,
  patchTotal,
}) {
  if (!activeStage) return null;
  const showBar =
    (activeStage.key === "spider" || activeStage.key === "active_scan") &&
    percent !== null;
  const showPatches = activeStage.key === "patching";

  return (
    <AnimatePresence mode="wait">
      <Motion.div
        key={activeStage.key}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col gap-3 h-full"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium tracking-widest uppercase text-white/30 font-mono mb-0.5">
              Current Stage
            </p>
            <h3 className="text-lg font-semibold text-white leading-tight">
              {activeStage.label}
            </h3>
            <p className="text-xs text-white/35 mt-0.5">{activeStage.desc}</p>
          </div>

          {percent !== null && activeStage.key !== "ajax_spider" && (
            <Motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="shrink-0 flex flex-col items-center px-3 py-2 rounded-xl bg-violet-500/12 border border-violet-400/20"
            >
              <span className="text-2xl font-bold text-violet-300 tabular-nums font-mono leading-none">
                {percent}
              </span>
              <span className="text-[9px] text-violet-400/60 font-mono mt-0.5">
                %
              </span>
            </Motion.div>
          )}
        </div>

        <AnimatePresence mode="wait">
          <Motion.p
            key={message}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="text-xs text-white/40 leading-relaxed"
          >
            {message}
          </Motion.p>
        </AnimatePresence>

        {showBar && <ProgressBar percent={percent} />}
        {showPatches && <PatchList patches={patches} patchTotal={patchTotal} />}
      </Motion.div>
    </AnimatePresence>
  );
}
