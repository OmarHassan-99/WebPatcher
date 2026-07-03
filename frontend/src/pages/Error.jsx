import { motion as Motion } from "framer-motion";
import Lottie from "lottie-react";
import { RefreshCw, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ErrorLottieAnimation from "../lottie/Error Occurred!.json";

export default function ErrorPage() {
  const navigate = useNavigate();

  return (
    <div className="relative flex flex-col w-full min-h-screen items-center justify-center overflow-hidden bg-[#030014] p-4 sm:p-8">
      {/* Background glowing orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-full max-h-[600px] pointer-events-none opacity-30">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary-400 rounded-full mix-blend-screen filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary-600 rounded-full mix-blend-screen filter blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <Motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 70, damping: 20 }}
        className="glass-panel relative w-full max-w-2xl p-8 sm:p-12 rounded-3xl z-10 flex flex-col items-center text-center"
      >
        <Lottie
          animationData={ErrorLottieAnimation}
          loop={true}
          className="h-48 sm:h-56 -mt-8 mb-4 drop-shadow-2xl"
        />

        <Motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-7xl sm:text-8xl font-extrabold hero-gradient-text tracking-tighter mb-4"
        >
          500
        </Motion.h1>

        <Motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl sm:text-3xl font-semibold text-white mb-4"
        >
          Oops! Something went wrong.
        </Motion.h2>

        <Motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-base sm:text-lg text-surface-300 max-w-md mx-auto mb-10 leading-relaxed"
        >
          We're experiencing some technical difficulties on our end. Please try refreshing the page or go back home.
        </Motion.p>

        <Motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Motion.button
            whileHover={{ scale: 1.03, translateY: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary-400 to-primary-600 hover:from-primary-300 hover:to-primary-500 shadow-lg shadow-primary-500/25 transition-all duration-300 border border-primary-400/30 cursor-pointer"
          >
            <RefreshCw size={18} />
            Reload Page
          </Motion.button>

          <Motion.button
            whileHover={{ scale: 1.03, translateY: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold text-white bg-surface-800 hover:bg-surface-700 shadow-lg shadow-black/20 transition-all duration-300 border border-white/10 cursor-pointer"
          >
            <Home size={18} />
            Go Home
          </Motion.button>
        </Motion.div>
      </Motion.div>
    </div>
  );
}
