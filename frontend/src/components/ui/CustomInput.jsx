import { useField } from "formik";

export default function CustomInput({ label, ...props }) {
  const [field, meta] = useField(props);
  const isError = meta.touched && meta.error;

  return (
    <div className="flex flex-col relative group">
      <label
        htmlFor={field.name}
        className={`mb-1.5 text-sm font-medium transition-colors duration-300 ${
          isError
            ? "text-red-400"
            : "text-gray-400 group-focus-within:text-primary-300"
        }`}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={field.name}
          {...field}
          {...props}
          className={`
            w-full px-4 py-3 rounded-xl 
            bg-surface-800/50 backdrop-blur-md
            border transition-all duration-300 outline-none
            placeholder:text-gray-500 text-sm font-medium
            shadow-inner shadow-black/20
            ${
              isError
                ? "border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 text-red-100 placeholder:text-red-300/50"
                : "border-white/5 hover:border-white/10 focus:border-primary-400/80 focus:ring-4 focus:ring-primary-500/10 text-white"
            }
          `}
        />
        {/* Optional: Add an icon slot here if needed later */}
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
