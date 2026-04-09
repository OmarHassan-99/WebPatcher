import { useState } from "react";
import { useField } from "formik";
import { Eye, EyeOff } from "lucide-react";

export default function CustomInput({ label, icon, ...props }) {
  const [field, meta] = useField(props);
  const [showPassword, setShowPassword] = useState(false);

  const isError = meta.touched && meta.error;
  const isPassword = props.name === "password";

  return (
    <div className="flex flex-col relative group">
      <label
        htmlFor={field.name}
        className={`mb-1.5 text-sm font-medium transition-colors duration-300 ${
          isError
            ? "text-red-400"
            : "text-surface-400 group-focus-within:text-blue-400"
        }`}
      >
        {label}
      </label>

      <div className="relative">
        {/* Left Icon */}
        {icon && (
          <div
            className={`absolute z-10 left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 pointer-events-none ${
              isError
                ? "text-red-400"
                : "text-surface-500 group-focus-within:text-blue-400"
            }`}
          >
            {icon}
          </div>
        )}

        <input
          id={field.name}
          {...field}
          {...props}
          // Override the type if it's the password field
          type={isPassword ? (showPassword ? "text" : "password") : props.type}
          className={`
            w-full ${icon ? "pl-11" : "pl-4"} ${isPassword ? "pr-11" : "pr-4"} py-3 rounded-xl 
            bg-surface-800/50 backdrop-blur-md
            border transition-all duration-300 outline-none
            placeholder:text-surface-600 text-sm font-medium
            shadow-inner shadow-black/20
            ${
              isError
                ? "border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 text-red-100 placeholder:text-red-300/50"
                : "border-white/5 hover:border-white/10 focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/20 text-white"
            }
          `}
        />

        {/* Right Password Toggle Icon */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={`absolute z-10 right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-300 focus:outline-none cursor-pointer ${
              isError
                ? "text-red-400"
                : "text-surface-500 hover:text-surface-300 group-focus-within:text-blue-400"
            }`}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>

      <div className="h-5 mt-1">
        {isError && (
          <span className="text-red-400 text-xs flex items-center gap-1 animate-fade-in-up">
            • {meta.error}
          </span>
        )}
      </div>
    </div>
  );
}
