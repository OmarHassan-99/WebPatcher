import { motion as Motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function LoadingResultsPanel() {
  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-start gap-3 h-full justify-center"
    >
      <p className="text-[10px] font-medium tracking-widest uppercase text-white/30 font-mono">
        Next Step
      </p>

      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-8 h-8 shrink-0">
          <span className="absolute w-8 h-8 rounded-full bg-emerald-500/15 animate-ping opacity-50" />
          <Motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
          >
            <Loader2 className="size-4 text-emerald-400 relative z-10" />
          </Motion.div>
        </div>
        <div>
          <h3 className="text-base font-semibold text-white leading-tight">
            Loading scan details…
          </h3>
          <p className="text-xs text-white/35 mt-0.5">
            Fetching vulnerabilities &amp; AI recommendations
          </p>
        </div>
      </div>

      <div className="w-full space-y-2 mt-1">
        {[80, 60, 70].map((w, i) => (
          <Motion.div
            key={i}
            className="h-2 rounded-full bg-white/[0.06]"
            style={{ width: `${w}%` }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </Motion.div>
  );
}
