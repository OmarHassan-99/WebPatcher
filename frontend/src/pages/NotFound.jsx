import { motion as Motion } from "framer-motion";
import Lottie from "lottie-react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Error404LottieAnimation from "../lottie/Error 404.json";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col w-full min-h-[70vh] items-center justify-center text-center px-4">
      <Motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 60, damping: 18 }}
        className="flex flex-col items-center gap-1"
      >
        <Lottie
          animationData={Error404LottieAnimation}
          loop
          autoplay
          className="h-56"
        />

        <p className="text-lg text-surface-300 max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <Motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link
            to="/"
            className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 shadow-lg transition-colors duration-300"
          >
            <ArrowLeft size={16} />
            Return to Home
          </Link>
        </Motion.div>
      </Motion.div>
    </div>
  );
}
