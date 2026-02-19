import { Link, useSearchParams } from "react-router-dom";

export default function CustomLink({ to, mode, onClick, title }) {
  const [searchParams] = useSearchParams();
  const paramMode = searchParams.get("mode");
  const isActive = mode === paramMode;

  return (
    <Link
      to={to}
      className={`
        relative px-4 py-2 rounded-full transition-all duration-300
        text-sm font-medium
        ${
          isActive
            ? "bg-white/10 text-white shadow-lg shadow-primary-500/20"
            : "text-gray-400 hover:text-white hover:bg-white/5"
        }
      `}
      onClick={onClick}
    >
      {title}
    </Link>
  );
}
