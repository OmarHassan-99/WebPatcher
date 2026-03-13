import { useState } from "react";
import { motion as Motion } from "framer-motion";
import { Github, Loader2 } from "lucide-react";
import api from "../../../../api/axios";

export default function ConnectGitHubBanner() {
  const [isRedirecting, setIsRedirecting] = useState(false);

  function handleLinkGitHub() {
    setIsRedirecting(true);
    const redirectUrl = `${api.defaults.baseURL}/auth/github?mode=link&redirect=${window.location.href}`;
    window.location.href = redirectUrl;
  }

  return (
    <div className="relative group">
      {/* Animated gradient ring wrapper */}
      <div className="absolute -inset-[1px] rounded-[13px] bg-gradient-to-r from-primary-400 via-primary-600 to-primary-400 opacity-20 blur-sm group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-gradient-xy"></div>

      <Motion.div
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="relative overflow-hidden rounded-xl border border-primary-500/30 
          bg-primary-900/60 backdrop-blur-md px-5 py-4 shadow-lg shadow-black/20 
          hover:border-primary-500/60 transition-all duration-300 z-10"
      >
        {/* Animated Glow overlay inside */}
        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100
            bg-gradient-to-br from-primary-400/10 via-transparent to-primary-600/10 transition-opacity duration-500"
        />

        {/* Shimmer effect overlay */}
        <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />

        {/* Particles effect overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-primary-400/50 rounded-full animate-float-up"
              style={{
                left: `${15 + i * 20}%`,
                animationDelay: `${i * 0.4}s`,
                top: "100%",
                boxShadow: "0 0 8px rgba(var(--color-primary-400), 0.8)",
              }}
            />
          ))}
        </div>

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 z-20">
          {/* Pulsing GitHub Icon Container */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-xl bg-primary-500/20 animate-ping opacity-75" />
            <div
              className="relative flex h-11 w-11 items-center justify-center
                rounded-xl bg-primary-800/80 border border-primary-500/40 shadow-inner
                group-hover:bg-primary-700/80 transition-colors duration-300"
            >
              <Github size={20} className="text-primary-300 group-hover:text-primary-200 transition-colors" />
            </div>
          </div>

          <div className="flex-1 min-w-0 pr-2">
            <h4 className="text-sm font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400 group-hover:from-white group-hover:to-white transition-all duration-500">
              Connect GitHub to auto-fill
            </h4>
            <p className="mt-1 text-xs text-gray-400/90 leading-relaxed font-medium">
              Link your GitHub account to select repos from a dropdown securely.
            </p>
          </div>

          <Motion.button
            type="button"
            onClick={handleLinkGitHub}
            disabled={isRedirecting}
            whileHover={!isRedirecting ? { scale: 1.05 } : {}}
            whileTap={!isRedirecting ? { scale: 0.95 } : {}}
            className="relative shrink-0 w-full sm:w-auto inline-flex justify-center items-center gap-2 px-5 py-2.5 rounded-lg
              bg-primary-600 hover:bg-primary-500 font-bold text-white text-xs tracking-wider
              shadow-[0_0_15px_rgba(var(--color-primary-500),0.3)] hover:shadow-[0_0_25px_rgba(var(--color-primary-400),0.6)]
              transition-all duration-300 cursor-pointer overflow-hidden border border-primary-400/50
              disabled:opacity-50 disabled:cursor-not-allowed group/btn"
          >
            {/* Button Shimmer */}
            <div className="absolute inset-0 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />

            <div className="relative z-10 flex items-center gap-2">
              {isRedirecting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Github size={14} />
              )}
              {isRedirecting ? "Redirecting…" : "Link GitHub"}
            </div>
          </Motion.button>
        </div>
      </Motion.div>

      <style>{`
        @keyframes gradient-xy {
          0%, 100% { background-size: 400% 400%; background-position: left center; }
          50% { background-size: 200% 200%; background-position: right center; }
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes float-up {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-40px) scale(0); opacity: 0; }
        }
        .animate-gradient-xy { animation: gradient-xy 3s ease infinite; }
        .animate-shimmer { animation: shimmer 2s infinite; }
        .animate-float-up { animation: float-up 3s linear infinite; }
      `}</style>
    </div>
  );
}
