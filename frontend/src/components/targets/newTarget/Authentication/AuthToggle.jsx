import { motion as Motion } from "framer-motion";
import { ShieldCheck, ShieldOff } from "lucide-react";

export default function AuthToggle({ isEnabled, onToggle }) {
  return (
    <div className="flex items-center justify-center mb-12">
      <Motion.button
        type="button"
        onClick={onToggle}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={`
          relative flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-sm
          border backdrop-blur-md transition-all duration-500 cursor-pointer overflow-hidden
          ${
            isEnabled
              ? "bg-primary-500/10 border-primary-500/40 text-primary-100 shadow-[0_0_30px_rgba(var(--primary-500-rgb),0.15)]"
              : "bg-white/5 border-white/10 text-primary-100 hover:border-white/20 hover:bg-white/[0.08]"
          }
        `}
      >
        {/* Animated Background Pulse */}
        {isEnabled && (
          <Motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 0.2 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse",
            }}
            className="absolute inset-0 bg-primary-500 blur-2xl -z-10"
          />
        )}

        <div
          className={`p-1.5 rounded-lg ${isEnabled ? "bg-primary-500 text-white" : "bg-white/10"}`}
        >
          {isEnabled ? (
            <ShieldCheck className="size-5" />
          ) : (
            <ShieldOff className="size-5" />
          )}
        </div>

        <span className="relative z-10 transition-colors duration-300">
          {isEnabled
            ? "Authenticated Scanning Active"
            : "Enable Authenticated Scanning"}
        </span>

        {/* Status Indicator Dot */}
        {isEnabled && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
          </span>
        )}
      </Motion.button>
    </div>
  );
}
