import { motion as Motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function AuthTest({ onTest, canTest, isTesting, testResult }) {
  return (
    <div className="flex flex-col items-center gap-6 mt-4 pb-6">
      <Motion.button
        type="button"
        onClick={onTest}
        disabled={!canTest || isTesting}
        whileHover={canTest && !isTesting ? { scale: 1.02, y: -2 } : {}}
        whileTap={canTest && !isTesting ? { scale: 0.98 } : {}}
        className={`
          relative flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-sm
          transition-all duration-300 shadow-2xl
          ${
            canTest && !isTesting
              ? "bg-black/20 border border-white/10 text-white hover:shadow-primary-500/25 cursor-pointer"
              : "bg-white/5 text-primary-300/80 border border-white/5 cursor-not-allowed"
          }
        `}
      >
        {isTesting ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            <span className="tracking-wide">Validating Credentials…</span>
          </>
        ) : (
          <>
            <ShieldCheck className="size-5" />
            <span className="tracking-wide text-white">Test Connection</span>
          </>
        )}
      </Motion.button>

      <AnimatePresence mode="wait">
        {testResult && (
          <Motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className={`
              flex items-center gap-3 text-sm px-6 py-4 rounded-2xl border backdrop-blur-md
              ${
                testResult.success
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.1)]"
              }
            `}
          >
            {testResult.success ? (
              <CheckCircle2 className="size-5 shrink-0" />
            ) : (
              <XCircle className="size-5 shrink-0" />
            )}
            <span className="font-medium tracking-tight">
              {testResult.message}
            </span>
          </Motion.div>
        )}
      </AnimatePresence>

      {!canTest && !isTesting && (
        <p className="text-[11px] text-primary-300/80 font-medium uppercase tracking-[0.1em]">
          Fill in required fields to test connection
        </p>
      )}
    </div>
  );
}
