import { AnimatePresence, motion as Motion } from "framer-motion";

export default function CustomTargetInput({
  label,
  span,
  name,
  value,
  onChange,
  placeholder,
  error,
  isAnimatePulse,
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className={`text-lg font-semibold transition-colors duration-300 ${
          error ? "text-red-400" : "text-white"
        }`}
      >
        {label}{" "}
        {span && (
          <span
            className={`text-base ml-1 ${error ? "text-red-300" : "text-gray-400"}`}
          >
            {span}
          </span>
        )}
      </label>

      <input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        type="url"
        required
        className={`p-2 rounded-md mt-2 w-full bg-primary-800 focus:outline-none transition-all duration-500 border ${
          error
            ? "border-red-500 focus:ring-2 focus:ring-red-500 placeholder-red-300/50"
            : "border-transparent focus:ring-2 focus:ring-primary-400"
        }`}
      />

      <AnimatePresence mode="wait">
        {error && (
          <Motion.p
            key="error"
            initial={{
              opacity: 0,
              y: -10,
              scale: 0.95,
              originX: 0,
              originY: 0.5,
            }}
            animate={{ opacity: 1, y: 0, scale: 1, originX: 0, originY: 0.5 }}
            exit={{ opacity: 0, y: -10, scale: 0.95, originX: 0, originY: 0.5 }}
            className={`text-red-400 mt-2 text-sm ${isAnimatePulse && "animate-pulse"}`}
          >
            {error}
          </Motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
