export default function FilterPill({ active, onClick, children, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={`
      px-3 py-1.5 rounded-full text-sm border transition-all duration-300 flex items-center gap-1.5 cursor-pointer
      ${
        active
          ? "bg-primary-100 text-white border-primary-200 shadow-md shadow-primary-500/20"
          : "text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-200 hover:bg-gray-800"
      }
    `}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}
