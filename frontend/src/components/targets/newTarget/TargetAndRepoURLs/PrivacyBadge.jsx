import { Lock, Globe } from "lucide-react";
import { motion as Motion } from "framer-motion";

export default function PrivacyBadge({ isPrivate }) {
  return (
    <Motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.2 }}
      className="relative flex items-center justify-center shrink-0"
    >
      <span
        className={`relative inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5
          rounded-full border tracking-wider shadow-sm transition-all duration-300 backdrop-blur-sm
          ${
            isPrivate
              ? "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20"
          }`}
      >
        {isPrivate ? (
          <Lock size={9} className="shrink-0" />
        ) : (
          <Globe size={9} className="shrink-0" />
        )}
        {isPrivate ? "PRIVATE" : "PUBLIC"}
      </span>
    </Motion.div>
  );
}
