import { motion as Motion } from "framer-motion";
import Lottie from "lottie-react";
import { RefreshCw } from "lucide-react";
import ErrorLottieAnimation from "../lottie/Error Occurred!.json";

export default function ErrorPage() {
  return (
    <div className="flex flex-col w-full min-h-screen items-center justify-center text-center bg-primary-900 px-4">
      <Motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 60, damping: 18 }}
        className="flex flex-col items-center gap-2"
      >
        <Lottie
          animationData={ErrorLottieAnimation}
          loop={false}
          className="h-40"
        />

        <h1 className="text-6xl font-bold text-primary-100 tracking-tight">
          500
        </h1>
        <p className="text-xl text-surface-300 max-w-md">
          Something went wrong on our end. Please try again later or reload the
          page.
        </p>

        <Motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white bg-primary-400 hover:bg-primary-300 shadow-lg shadow-primary-400/20 transition-colors duration-300 cursor-pointer"
        >
          <RefreshCw size={16} />
          Reload Page
        </Motion.button>
      </Motion.div>
    </div>
  );
}
