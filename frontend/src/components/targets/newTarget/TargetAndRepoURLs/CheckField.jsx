import { motion as Motion } from "framer-motion";
import { Check } from "lucide-react";

export default function CheckField({ spanText, index = 0 }) {
  return (
    <Motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        delay: index * 0.4,
        duration: 0.4,
        ease: "easeOut",
      }}
      className="group relative flex items-start gap-3 p-2 -mx-2 rounded-lg 
        transition-colors duration-300 hover:bg-primary-900/30"
    >
      {/* Background glow on hover */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary-500/0 via-primary-500/5 to-primary-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Animated Check Icon Container */}
      <div className="relative shrink-0 mt-0.5">
        <Motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
            delay: index * 0.4 + 0.2,
          }}
          className="relative flex size-5 items-center justify-center rounded-full 
            bg-emerald-500/20 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
        >
          <Check size={12} strokeWidth={3} className="text-emerald-400" />
        </Motion.div>

        {/* Subtle pulsing glow behind check */}
        <div className="absolute inset-0 -z-10 rounded-full bg-emerald-400/20 blur-sm scale-150 animate-pulse" />
      </div>

      {/* Text */}
      <span className="text-sm text-gray-300 group-hover:text-white transition-colors duration-300 leading-relaxed font-medium">
        {spanText}
      </span>
    </Motion.div>
  );
}
