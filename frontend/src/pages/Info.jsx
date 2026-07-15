import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Key,
  Lock,
  TerminalSquare,
  PenTool,
  Settings,
  Layers,
  UserX,
  ShieldAlert,
  Activity,
  Globe,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { OWASP_TOP_10 } from "../data/owaspTop10";
import { LIST_VARIANTS, CONTENT_VARIANTS } from "../data/constants";

const iconMap = {
  Key,
  Lock,
  TerminalSquare,
  PenTool,
  Settings,
  Layers,
  UserX,
  ShieldAlert,
  Activity,
  Globe,
};

export default function InfoPage() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <Motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center mb-12 mt-4"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold hero-gradient-text inline-block pb-2 mb-4 tracking-tight">
          OWASP Top 10 Security Risks
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
          The globally recognized standard for developers and web application security.
          Explore the most critical security risks and understand their impact on organizations.
        </p>
      </Motion.div>

      {/* Accordion List */}
      <Motion.div
        variants={LIST_VARIANTS}
        initial="hidden"
        animate="visible"
        className="space-y-4 mb-20"
      >
        {OWASP_TOP_10.map((item, index) => {
          const IconComponent = iconMap[item.icon] || Shield;
          const isOpen = openIndex === index;

          return (
            <Motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-2xl border transition-all duration-300 overflow-hidden backdrop-blur-md ${
                isOpen
                  ? "bg-white/[0.08] border-primary-500/40 shadow-xl shadow-primary-500/10"
                  : "bg-white/[0.03] border-white/10 hover:bg-white/[0.05] hover:border-white/20"
              }`}
            >
              <button
                onClick={() => toggleAccordion(index)}
                className="w-full flex items-center gap-4 p-6 text-left focus:outline-none cursor-pointer"
              >
                <div
                  className={`p-3 rounded-xl transition-colors duration-300 ${
                    isOpen
                      ? "bg-primary-500/20 text-primary-300"
                      : "bg-white/5 text-white/50 group-hover:text-white/80"
                  }`}
                >
                  <IconComponent size={24} />
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
                    <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-white/10 text-white/70 w-max">
                      {item.id}
                    </span>
                    <h3 className={`text-xl font-bold transition-colors ${isOpen ? "text-white" : "text-white/80"}`}>
                      {item.title}
                    </h3>
                  </div>
                </div>

                <div
                  className={`p-2 rounded-full transition-transform duration-300 ${
                    isOpen ? "bg-white/10 rotate-180" : "bg-transparent"
                  }`}
                >
                  <ChevronDown size={20} className={isOpen ? "text-white" : "text-white/40"} />
                </div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <Motion.div
                    variants={CONTENT_VARIANTS}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <div className="px-6 pb-6 pt-2">
                      <div className="pl-[68px] space-y-6">
                        <div>
                          <h4 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-2">
                            Description
                          </h4>
                          <p className="text-white/80 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                        
                        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                          <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2">
                            Business Impact
                          </h4>
                          <p className="text-red-200/80 leading-relaxed text-sm">
                            {item.impact}
                          </p>
                        </div>

                        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                          <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                            How to Prevent
                          </h4>
                          <p className="text-emerald-200/80 leading-relaxed text-sm">
                            {item.prevention}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Motion.div>
                )}
              </AnimatePresence>
            </Motion.div>
          );
        })}
      </Motion.div>
    </div>
  );
}
