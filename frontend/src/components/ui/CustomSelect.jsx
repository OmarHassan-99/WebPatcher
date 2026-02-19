import { useState, useRef, useEffect } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Filter } from "lucide-react";

export default function CustomSelect({ value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative z-50" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`
          flex items-center justify-between w-full
          px-4 py-2.5 rounded-xl
          bg-surface-800/50 backdrop-blur-sm
          border border-white/10 hover:border-primary-500/50
          text-sm font-medium text-gray-200
          transition-all duration-300
          focus:outline-none focus:ring-2 focus:ring-primary-500/20
          ${isOpen ? "border-primary-500 ring-2 ring-primary-500/20" : ""}
        `}
      >
        <Filter size={18} className="text-primary-100" />
        <span className="truncate">
          {selectedOption ? selectedOption.label : "Select option"}
        </span>
        <ChevronDown
          size={16}
          className={`ml-2 text-gray-400 transition-transform duration-300 ${
            isOpen ? "rotate-180 text-primary-400" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <Motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="
              absolute z-50 w-full mt-2
              bg-surface-900/95 backdrop-blur-xl
              border border-white/10 rounded-xl
              shadow-xl shadow-black/50
              overflow-hidden
              max-h-60 overflow-y-auto
            "
          >
            <div className="p-1.5 space-y-0.5">
              {options.map((option) => {
                const isSelected = value === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`
                      flex items-center justify-between w-full
                      px-3 py-2 rounded-lg text-sm text-left
                      transition-colors duration-200 cursor-pointer
                      ${
                        isSelected
                          ? "bg-primary-500/20 text-primary-300"
                          : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                      }
                    `}
                  >
                    <span>{option.label}</span>
                    {isSelected && (
                      <Check size={14} className="text-primary-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
