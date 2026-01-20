import Lottie from "lottie-react";
import { Link } from "react-router-dom";
import Error404LottieAnimation from "../lottie/Error 404.json";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col w-full items-center justify-center text-center">
      <Lottie animationData={Error404LottieAnimation} loop autoplay />
      <Link
        to="/"
        className="mt-4 border border-primary-300 rounded-full px-4 py-2 hover:bg-primary-300 text-white transition-colors duration-500"
      >
        Return to Home Page
      </Link>
    </div>
  );
}
