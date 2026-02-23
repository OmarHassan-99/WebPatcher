import { useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  ChevronDown,
  Link2,
  AlertTriangle,
  BrainCircuit,
  Lightbulb,
  Bug,
  Code2,
  Wrench,
  FileCode2,
} from "lucide-react";
import { CONTENT_VARIANTS, RISK_COLORS } from "../../../data/constants";
import Section from "./Section";
import CodeBlock from "./CodeBlock";
import FixBlock from "./FixBlock";

export default function RecommendationCard({ rec, index = 0 }) {
  const [isOpen, setIsOpen] = useState(false);

  const riskClass =
    RISK_COLORS[rec.risk_level] ||
    "text-gray-400 bg-gray-900/30 border-gray-700/50";

  return (
    <Motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 60, delay: index * 0.06 }}
      className="rounded-2xl border border-white/8 bg-gray-900/60 backdrop-blur-sm overflow-hidden shadow-lg"
    >
      {/* Card Header */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-5 flex justify-between cursor-pointer group"
      >
        <div className="flex-1 min-w-0 space-y-2">
          {/* Alert name + risk badge */}
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle
              size={18}
              className={`shrink-0 ${riskClass.split(" ")[0]}`}
            />
            <h3 className="text-base font-bold text-white leading-snug">
              {rec.alert_name}
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${riskClass}`}
            >
              {rec.risk_level}
            </span>
          </div>

          {/* Affected URL */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono">
            <Link2 size={12} className="shrink-0 text-gray-500" />
            <a
              href={rec.affected_url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate max-w-lg hover:text-primary-100 transition-colors duration-300"
              title={rec.affected_url}
            >
              {rec.affected_url}
            </a>
          </div>

          {/* File type pill */}
          {rec.file_type && (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-900/40 border border-indigo-700/40 text-indigo-300 text-xs font-mono">
                <FileCode2 size={11} />
                {rec.file_type}
              </span>
            </div>
          )}
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
            key="body"
            variants={CONTENT_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="overflow-hidden"
          >
            <div className="px-5 pb-6 space-y-5 border-t border-white/5 pt-4">
              {/* Description */}
              {rec.description && (
                <Section icon={BrainCircuit} label="Description">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {rec.description}
                  </p>
                </Section>
              )}

              {/* Reasoning */}
              <Section icon={Lightbulb} label="Why This Is Dangerous">
                <p className="text-sm text-gray-300 leading-relaxed">
                  {rec.reasoning}
                </p>
              </Section>

              {/* Root Cause */}
              <Section icon={Bug} label="Root Cause">
                <p className="text-sm text-gray-300 leading-relaxed">
                  {rec.root_cause}
                </p>
              </Section>

              {/* Vulnerable Code Example */}
              <Section icon={Code2} label="Vulnerable Code Example">
                <CodeBlock
                  code={rec.vulnerable_code_example}
                  lang={rec.file_type}
                />
              </Section>

              {/* Analysis */}
              <Section icon={BrainCircuit} label="AI Analysis">
                <p className="text-sm text-gray-300 leading-relaxed">
                  {rec.analysis}
                </p>
              </Section>

              {/* Suggested Fix */}
              <Section icon={Wrench} label="Suggested Fix">
                <FixBlock text={rec.suggested_fix} />
              </Section>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.div>
  );
}
