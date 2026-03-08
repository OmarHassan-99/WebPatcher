import { CheckCircle, Loader2, Circle } from "lucide-react";
import { motion as Motion } from "framer-motion";

export default function PipelineNode({ s, status, isLast }) {
  const isActive = status === "active";
  const isDone = status === "done";

  return (
    <div className="flex items-center flex-1 last:flex-none min-w-0">
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        {/* Circle */}
        <div className="relative flex items-center justify-center">
          {isActive && (
            <span className="absolute w-9 h-9 rounded-full bg-violet-500/20 animate-ping opacity-60" />
          )}
          <div
            className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-500 ${
              isDone
                ? "bg-emerald-500/20 border-emerald-400/50 shadow-[0_0_12px_rgba(52,211,153,0.2)]"
                : isActive
                  ? "bg-violet-500/25 border-violet-400/60 shadow-[0_0_14px_rgba(167,139,250,0.3)]"
                  : "bg-white/[0.03] border-white/10"
            }`}
          >
            {isDone ? (
              <CheckCircle className="size-4 text-emerald-400" />
            ) : isActive ? (
              <Motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
              >
                <Loader2 className="size-3.5 text-violet-400" />
              </Motion.div>
            ) : (
              <Circle className="size-3 text-white/15" />
            )}
          </div>
        </div>

        {/* Label — hidden on xs, shown from sm up */}
        <span
          className={`hidden sm:block text-[10px] font-medium text-center leading-tight whitespace-nowrap transition-colors duration-300 ${isDone ? "text-emerald-400" : isActive ? "text-white" : "text-white/20"}`}
        >
          {s.label}
        </span>
      </div>

      {/* Connector */}
      {!isLast && (
        <div className="relative flex-1 mx-1.5 sm:mx-2 h-px">
          <div className="absolute inset-0 bg-white/8 rounded-full" />
          <Motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400/70 to-emerald-400/30"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: isDone ? 1 : 0 }}
            style={{ transformOrigin: "left" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      )}
    </div>
  );
}
