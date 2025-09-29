import { useField } from "formik";

export default function CustomInput({ label, ...props }) {
  const [field, meta] = useField(props);

  return (
    <div className="flex flex-col relative">
      <label htmlFor={field.name} className="text-gray-300 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={field.name}
          {...field}
          {...props}
          className={`w-full px-4 py-2 rounded-md bg-primary-800 text-white border ${
            meta.touched && meta.error
              ? "border-red-500 focus:ring-red-500"
              : "border-primary-600 focus:ring-primary-400"
          } focus:outline-none focus:ring-2 transition-all duration-500 pr-10`}
        />
      </div>
      {meta.touched && meta.error && (
        <div className="text-red-500 text-sm mt-1">{meta.error}</div>
      )}
    </div>
  );
}
