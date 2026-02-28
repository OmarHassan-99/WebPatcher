import { motion as Motion, AnimatePresence } from "framer-motion";
import { Terminal } from "lucide-react";

export default function TerminalPanel({ patches, patchTotal, stage }) {
  return (
    <Motion.div
      initial={{ opacity: 0, width: 0 }}
      animate={{ opacity: 1, width: "auto" }}
      exit={{ opacity: 0, width: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="hidden lg:flex flex-col border-l border-white/5 bg-[#0a0a0c]/60 w-[360px] xl:w-[400px] overflow-hidden"
    >
      {/* Terminal header */}
      <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center gap-2.5 bg-black/40">
        <div className="flex items-center gap-1.5">
          <span className="size-[7px] rounded-full bg-red-500/60" />
          <span className="size-[7px] rounded-full bg-amber-500/60" />
          <span className="size-[7px] rounded-full bg-emerald-500/60" />
        </div>
        <div className="flex items-center gap-2 ml-1">
          <Terminal size={13} className="text-white/25" />
          <span className="text-[11px] font-mono text-white/35 tracking-wider">
            ai_patch_engine.sh
          </span>
        </div>
      </div>

      {/* Terminal body */}
      <div className="p-4 flex-1 overflow-y-auto max-h-[350px] font-mono text-[11px] space-y-2.5 scrollbar-thin scrollbar-thumb-white/8 scrollbar-track-transparent">
        <p className="text-violet-400/70">
          <span className="text-white/20 select-none">$ </span>
          Initializing WebPatcher AI...
        </p>

        <AnimatePresence initial={false}>
          {patches.map((p) => (
            <Motion.div
              key={p.index}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="pl-3 border-l-2 border-white/[0.06] hover:border-white/15 flex flex-col gap-0.5 transition-colors duration-150"
            >
              <div className="flex items-center gap-2">
                <span className="text-white/20 tabular-nums">
                  [{p.index}/{patchTotal}]
                </span>
                {p.success ? (
                  <span className="text-emerald-400 font-semibold text-[10px] tracking-wider">
                    SUCCESS
                  </span>
                ) : (
                  <span className="text-red-400 font-semibold text-[10px] tracking-wider">
                    FAILED
                  </span>
                )}
              </div>
              <p className="text-white/50 leading-relaxed pr-2 text-[10px]">
                {p.alert_name}
              </p>
            </Motion.div>
          ))}
        </AnimatePresence>

        {/* Animated dots while patching */}
        {stage === "patching" && (
          <div className="text-white/30 flex items-center gap-1 mt-3 pt-2">
            <span className="text-violet-500 select-none">$</span>
            <span className="ml-1">generating patches</span>
            <Motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              .
            </Motion.span>
            <Motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
            >
              .
            </Motion.span>
            <Motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
            >
              .
            </Motion.span>
          </div>
        )}
      </div>
    </Motion.div>
  );
}
