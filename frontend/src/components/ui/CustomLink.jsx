import { Link, useSearchParams } from "react-router-dom";

export default function CustomLink({ to, mode, onClick, title }) {
  const [searchParams] = useSearchParams();
  const paramMode = searchParams.get("mode");

  return (
    <Link
      to={to}
      className={`hover:text-primary-200 transition-colors w-fit ${
        mode === paramMode && "text-primary-200"
      }`}
      onClick={onClick}
    >
      {title}
    </Link>
  );
}
