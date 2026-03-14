import { useState, useRef } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

export default function CustomTargetInput({
  label,
  span,
  name,
  value,
  onChange,
  placeholder,
  error,
  isAnimatePulse,
  leftIcon: LeftIcon,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  const isActive = isFocused || value;

  return (
    <div>
      <div
        className={`relative rounded-xl p-[1px] transition-all duration-700 backdrop-blur-md shadow-[0_4px_20px_-5px_rgba(0,0,0,0.5)] ${
          error
            ? "bg-red-950/40 border-red-500/50 hover:bg-red-900/40"
            : isFocused
              ? "bg-primary-800/60 border-primary-500/50"
              : "bg-primary-900/60 border-primary-700/40 hover:border-primary-500/50 hover:bg-primary-800/40"
        } border`}
      >
        {/* Glow effect behind the card on focus */}
        <div
          className={`absolute -inset-1 rounded-xl blur-xl transition-opacity duration-700 pointer-events-none ${
            error ? "bg-red-500/15" : "bg-primary-500/15"
          }`}
          style={{ opacity: isFocused ? 1 : 0 }}
        />

        <div className="relative rounded-[11px] overflow-hidden">
          {/* Label area */}
          {label && (
            <div
              className="flex items-center gap-2 px-4 pt-3 pb-0 cursor-text"
              onClick={() => inputRef.current?.focus()}
            >
              <Motion.label
                htmlFor={name}
                animate={{
                  scale: isActive ? 0.85 : 1,
                  y: isActive ? -2 : 0,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`origin-left text-sm font-semibold tracking-wide transition-colors duration-300 cursor-text select-none ${
                  error
                    ? "text-red-400"
                    : isFocused
                      ? "text-primary-300"
                      : "text-gray-300"
                }`}
              >
                {label}
              </Motion.label>
              {span && (
                <Motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: isActive ? 1 : 0.6, x: 0 }}
                  className={`text-[10px] font-normal transition-colors duration-300 ${
                    error ? "text-red-300/70" : "text-gray-500"
                  }`}
                >
                  {span}
                </Motion.span>
              )}
            </div>
          )}

          {/* Input row */}
          <div className="relative flex items-center gap-2 px-4 pb-3 pt-1">
            {/* Left icon */}
            {LeftIcon && (
              <Motion.div
                animate={{ scale: isFocused ? 1.15 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`shrink-0 transition-colors duration-300 ${
                  isFocused
                    ? "text-primary-300"
                    : error
                      ? "text-red-400"
                      : "text-gray-500"
                }`}
              >
                <LeftIcon size={16} />
              </Motion.div>
            )}

            <input
              ref={inputRef}
              id={name}
              name={name}
              value={value}
              onChange={onChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              type="url"
              required
              className="flex-1 bg-transparent text-white text-sm placeholder-gray-600
                outline-none caret-primary-400 transition-colors duration-300"
            />

            {/* Focus indicator dot */}
            <Motion.div
              animate={{
                scale: isFocused ? 1 : 0,
                opacity: isFocused ? 1 : 0,
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={`shrink-0 w-2 h-2 rounded-full ${
                error
                  ? "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]"
                  : "bg-primary-400 shadow-[0_0_8px_rgba(var(--color-primary-400),0.6)]"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Error message */}
      <AnimatePresence mode="wait">
        {error && (
          <Motion.div
            key="error"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`flex items-center gap-1.5 mt-2.5 ml-1 text-red-400 ${isAnimatePulse && "animate-pulse"}`}
          >
            <AlertCircle size={14} />
            <span className="text-xs font-semibold">{error}</span>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
