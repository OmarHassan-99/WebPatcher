import { motion as Motion } from "framer-motion";
import { Link, useRouteLoaderData } from "react-router-dom";
import { ArrowRight, Shield } from "lucide-react";

export default function Hero() {
  const session = useRouteLoaderData("root");
  const { user } = session;

  return (
    <section className="relative flex flex-col items-center justify-center text-center px-6 pt-20 pb-10 overflow-hidden">
      {/* Floating badge */}
      <Motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 60 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-400/10 border border-primary-400/20 text-primary-100 text-sm font-medium mb-8"
      >
        <Shield size={14} className="text-primary-200" />
        AI-Powered Vulnerability Scanning & Patching
      </Motion.div>

      {/* Headline with animated gradient */}
      <Motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, type: "spring", stiffness: 50, damping: 18 }}
        className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight max-w-3xl"
      >
        <span className="text-white">Detect, Analyze & </span>
        <span className="hero-gradient-text">Patch Vulnerabilities</span>
        <span className="text-white"> with AI</span>
      </Motion.h1>

      {/* Subtitle */}
      <Motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, type: "spring", stiffness: 50, damping: 18 }}
        className="mt-5 text-base sm:text-lg text-surface-300 max-w-xl leading-relaxed"
      >
        WebPatcher scans your web applications with OWASP ZAP, leverages AI to
        generate precise fix recommendations, and auto-creates GitHub pull
        requests — all in one seamless workflow.
      </Motion.p>

      {/* CTA buttons */}
      <Motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, type: "spring", stiffness: 50, damping: 18 }}
        className="flex flex-wrap items-center justify-center gap-4 mt-9"
      >
        <Link
          to={user ? "/targets" : "/auth?mode=register"}
          className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white bg-primary-400 hover:bg-primary-300 shadow-lg shadow-primary-400/20 transition-all duration-300"
        >
          Get Started
          <ArrowRight
            size={16}
            className="transition-transform group-hover:translate-x-1"
          />
        </Link>

        {!user && (
          <Link
            to="/auth?mode=login"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-surface-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300"
          >
            Sign In
          </Link>
        )}
      </Motion.div>

      {/* Trust signal */}
      <Motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.6 }}
        className="mt-6 text-xs text-surface-400"
      >
        Powered by OWASP ZAP · AI-Driven Security · GitHub Integration
      </Motion.p>
    </section>
  );
}
