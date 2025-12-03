export default function CustomProfileInput({
  label,
  name,
  type,
  placeholder,
  value,
  onChange,
}) {
  return (
    <>
      {label && (
        <label className="text-white mb-1" htmlFor={name}>
          {label}
        </label>
      )}
      <input
        name={name}
        id={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full bg-transparent border-b-2 border-primary-500 text-primary-100 focus:border-primary-200 focus:outline-none py-2 transition"
      />
    </>
  );
}
