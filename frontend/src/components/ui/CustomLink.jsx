import { Link } from "react-router-dom";

export default function CustomLink({ to, onClick, title }) {
  return (
    <Link
      to={to}
      className="hover:text-primary-200 transition-colors w-fit"
      onClick={onClick}
    >
      {title}
    </Link>
  );
}
