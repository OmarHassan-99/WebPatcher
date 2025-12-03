import { useState } from "react";
import {
  CONTENT_VARIANTS,
  ITEM_VARIANTS,
  RISK_COLORS,
} from "../../data/constants";
import { ChevronDown, ShieldAlert } from "lucide-react";
import VulnerabilityCard from "./VulnerabilityCard";
import { motion as Motion, AnimatePresence } from "motion/react";

export default function FindingRow({ finding }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Motion.div
      variants={ITEM_VARIANTS}
      layout
      transition={{ type: "spring" }}
      className="p-4 border border-gray-700 rounded-2xl mx-10 my-4 bg-gray-900"
    >
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <ShieldAlert size={24} className="text-primary-100" />
          <h2 className="text-xl font-semibold text-primary-100">
            {finding.alertName} ({finding.count}) {""}
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
        >
          <ChevronDown size={32} className="text-white" />
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
            layout
            transition={{ type: "spring" }}
            className="overflow-hidden"
          >
            <div className="pt-4">
              <VulnerabilityCard finding={finding} />
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.div>
  );
}
