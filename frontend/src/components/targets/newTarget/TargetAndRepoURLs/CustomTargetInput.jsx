import { useState, useRef } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { AlertCircle, ChevronDown } from "lucide-react";

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
  isGitHubToken,
}) {
  const [showDocs, setShowDocs] = useState(false);
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
            <div className="flex items-center justify-between pr-3">
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
                      error ? "text-red-300/70" : "text-gray-300"
                    }`}
                  >
                    {span}
                  </Motion.span>
                )}
              </div>

              {isGitHubToken && (
                <button
                  type="button"
                  onClick={() => setShowDocs(!showDocs)}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  How to get this?{" "}
                  <Motion.div
                    animate={{
                      rotate: showDocs ? 180 : 0,
                      y: showDocs ? 1 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <ChevronDown size={14} strokeWidth={2.5} />
                  </Motion.div>
                </button>
              )}
            </div>
          )}

          {/* Instructions Dropdown Container for github token */}
          <AnimatePresence>
            {showDocs && (
              <Motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", damping: 20 }}
                className="overflow-hidden"
              >
                <div className="p-4 rounded-md text-sm text-gray-300">
                  <p className="font-semibold text-white mb-2">
                    To generate your Personal Access Token:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 ml-1">
                    <li>
                      Go to your GitHub{" "}
                      <a
                        href="https://github.com/settings/tokens/new"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        Developer Settings
                      </a>
                      .
                    </li>
                    <li>Add a note (e.g., "WebPatcher Access").</li>
                    <li>Set the Expiration to your preference.</li>
                    <li>
                      Under <strong>Select scopes</strong>, check the{" "}
                      <strong className="text-white">repo</strong> box (Full
                      control of private repositories).
                    </li>
                    <li>
                      Click <strong>Generate token</strong> at the bottom.
                    </li>
                    <li>
                      Copy the token (it starts with{" "}
                      <code className="bg-black px-1 rounded text-green-400">
                        ghp_...
                      </code>
                      ) and paste it below.
                    </li>
                  </ol>
                </div>
              </Motion.div>
            )}
          </AnimatePresence>

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
              type={isGitHubToken ? "password" : "url"}
              required
              className="flex-1 bg-transparent text-white text-sm placeholder-gray-600
                outline-none caret-gray-300 transition-colors duration-300"
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
            {typeof error !== "object" && <AlertCircle size={14} />}
            <span className="text-xs font-semibold">{error}</span>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
