import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col w-full items-center justify-center text-center text-primary-300">
      <h1 className="text-7xl font-bold mb-4">404</h1>
      <p className="text-2xl">
        Sorry , the page you are looking for was not found
      </p>
      <Link
        to="/"
        className="mt-4 border border-primary-300 rounded-full px-4 py-2 hover:bg-primary-300 hover:text-primary-100 transition-colors duration-500"
      >
        Return to Home Page
      </Link>
    </div>
  );
}
