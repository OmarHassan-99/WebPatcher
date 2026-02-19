import { useRef, useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";

// eslint-disable-next-line no-unused-vars
export default function ContextBadge({ icon: Icon, values }) {
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef(null);

  if (values.length === 0) return null;

  const hasMultiple = values.length > 1;

  function handleMouseEnter() {
    clearTimeout(timeoutRef.current);
    setIsHovered(true);
  }

  function handleMouseLeave() {
    // Adds a 150ms delay before closing
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 150);
  }

  return (
    <div
      className="relative flex items-center justify-center p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-primary-100 hover:bg-white/10 hover:border-primary-500/30 transition-all duration-300"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Icon size={16} />

      {/* Count badge for multiple values */}
      {hasMultiple && (
        <span className="absolute -top-1 -right-1 flex size-3 items-center justify-center rounded-full bg-primary-500 text-[7px] font-bold text-white leading-none">
          {values.length}
        </span>
      )}

      <AnimatePresence>
        {isHovered && (
          <Motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 left-0 bg-surface-800 border border-white/10 rounded shadow-xl z-[200]"
          >
            {hasMultiple ? (
              <ul className="flex flex-col gap-0.5 px-2 py-1.5 min-w-[90px] max-h-40 overflow-y-auto">
                {values.map((item) => (
                  <li
                    key={item}
                    className="text-[10px] text-gray-200 font-medium whitespace-nowrap flex items-center gap-1"
                  >
                    <span className="size-1 rounded-full bg-primary-400 inline-block shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="block px-2 py-1 text-[10px] text-white font-medium whitespace-nowrap">
                {values[0]}
              </span>
            )}
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
