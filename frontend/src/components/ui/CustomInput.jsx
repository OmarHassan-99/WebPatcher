import { useField } from "formik";

export default function CustomInput({ label, icon, ...props }) {
  const [field, meta] = useField(props);
  const isError = meta.touched && meta.error;

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
          className={`
            w-full ${icon ? "pl-11" : "px-4"} pr-4 py-3 rounded-xl 
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
