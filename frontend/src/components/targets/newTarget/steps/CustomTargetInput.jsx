export default function CustomTargetInput({
  label,
  name,
  value,
  onChange,
  placeholder,
  error,
}) {
  return (
    <div>
      <label htmlFor={name} className="text-lg font-semibold">
        {label}
      </label>
      <input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="p-2 rounded-md mt-2 w-full bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all duration-500"
        type="url"
        required
      />
      {error && <p className="text-red-400 mt-2">{error}</p>}
    </div>
  );
}
