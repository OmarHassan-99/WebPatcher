import { motion as Motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle } from "lucide-react";
import { RISK_COLORS_SCAN } from "../../../../data/constants";

export default function PatchList({ patches, patchTotal }) {
  if (!patches.length) return null;
  const successCount = patches.filter((p) => p.success).length;
  const failCount = patches.filter((p) => !p.success).length;

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex items-center gap-3 text-[11px] text-white/40">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          {successCount} patched
        </span>
        {failCount > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
            {failCount} failed
          </span>
        )}
        <span className="ml-auto font-mono tabular-nums text-white/25">
          {patches.length} / {patchTotal || "?"}
        </span>
      </div>

      <div className="h-[3px] w-full rounded-full bg-white/6 overflow-hidden">
        <Motion.div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400"
          animate={{
            width: patchTotal
              ? `${(patches.length / patchTotal) * 100}%`
              : "0%",
          }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/8 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {patches.map((p, i) => {
            const risk = RISK_COLORS_SCAN[p.risk_level];
            return (
              <Motion.div
                key={p.index}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-150 cursor-default group"
              >
                {p.success ? (
                  <CheckCircle className="size-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="size-3.5 text-red-400 shrink-0" />
                )}
                <span className="flex-1 text-xs text-white/60 truncate group-hover:text-white/80 transition-colors">
                  {p.alert_name}
                </span>
                {risk && (
                  <span
                    className={`shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${risk.pill} ${risk.text}`}
                  >
                    <span className={`w-1 h-1 rounded-full ${risk.dot}`} />
                    {p.risk_level}
                  </span>
                )}
              </Motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
