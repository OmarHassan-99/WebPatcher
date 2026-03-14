import { useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { Info } from "lucide-react";

export default function AuthField({
  label,
  tooltip,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  suffix,
  id,
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const fieldId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="relative w-full group hover:z-50 transition-all duration-300">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <label
            htmlFor={fieldId}
            className="text-xs font-semibold uppercase tracking-wider text-primary-300/80 group-focus-within:text-primary-400 transition-colors"
          >
            {label}
            {required && <span className="text-primary-500 ml-1">*</span>}
          </label>

          {tooltip && (
            <div className="relative flex items-center">
              <Info
                className="size-3.5 text-primary-500/50 hover:text-primary-400 cursor-help transition-colors"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              />
              <AnimatePresence>
                {showTooltip && (
                  <Motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 text-[11px] leading-relaxed text-white bg-primary-900 border border-white/10 rounded-xl px-4 py-3 shadow-2xl z-[100] backdrop-blur-md"
                  >
                    {tooltip}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-primary-900" />
                  </Motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <input
          id={fieldId}
          type={type}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`
            w-full px-4 py-3 rounded-2xl bg-white/5 border backdrop-blur-sm
            text-white text-sm placeholder-primary-400/80 outline-none
            transition-all duration-300 ease-out
            ${
              isFocused
                ? "border-primary-500/50 bg-white/10 ring-4 ring-primary-500/10 shadow-[0_0_20px_rgba(var(--primary-500-rgb),0.1)]"
                : "border-white/5 hover:border-white/10 hover:bg-white/[0.07]"
            }
          `}
        />

        {suffix && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
            <div className="h-4 w-[1px] bg-white/10 mr-4" />
            {suffix}
          </div>
        )}

        {/* Animated focus underline/glow */}
        <AnimatePresence>
          {isFocused && (
            <Motion.div
              layoutId="field-glow"
              className="absolute -inset-[1px] rounded-2xl border border-primary-500/30 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
