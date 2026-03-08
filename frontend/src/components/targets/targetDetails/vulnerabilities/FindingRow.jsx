import { useEffect, useState } from "react";
import { CONTENT_VARIANTS, RISK_COLORS } from "../../../../data/constants";
import { ChevronDown, ShieldAlert } from "lucide-react";
import VulnerabilityCard from "./VulnerabilityCard";
import { motion as Motion, AnimatePresence } from "motion/react";

export default function FindingRow({ finding, forceOpen, index }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(forceOpen);
  }, [forceOpen]);

  return (
    <Motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 60,
        default: { delay: index * 0.06 },
        layout: { delay: 0 },
      }}
      className="mx-10 my-4 rounded-2xl border border-white/8 bg-gray-900/60 backdrop-blur-sm overflow-hidden shadow-lg"
    >
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-4 flex justify-between items-center group cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <ShieldAlert size={24} className="hidden sm:block text-primary-100" />
          <h2 className="text-xl font-semibold text-primary-100">
            {finding.alertName}
            <span
              className={`px-3 py-1 ml-2 text-base rounded-full font-medium border ${
                RISK_COLORS[finding.severity]
              }`}
            >
              {finding.severity}
            </span>
          </h2>
        </div>

        <Motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-center text-gray-400 group-hover:text-white transition-colors duration-300"
        >
          <ChevronDown size={22} />
        </Motion.div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <Motion.div
            key="content"
            variants={CONTENT_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="overflow-hidden"
          >
            <div className="px-4 pt-3 pb-5 border-t border-white/5">
              <VulnerabilityCard finding={finding} />
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.div>
  );
}
