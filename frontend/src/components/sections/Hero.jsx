import { motion as Motion } from "framer-motion";
import { Link, useRouteLoaderData } from "react-router-dom";
import { ArrowRight, Shield } from "lucide-react";
import SplitText from "../../react-bits/SplitText";
import ShinyText from "../../react-bits/ShinyText";

export default function Hero() {
  const session = useRouteLoaderData("root");
  const { user } = session;

  return (
    <section className="relative flex flex-col items-center justify-center text-center px-6 pt-20 pb-10 overflow-hidden">
      {/* Floating badge */}
      <Motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, type: "spring", stiffness: 150, damping: 20 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-400/10 border border-primary-400/20 text-primary-100 text-sm font-medium mb-8"
      >
        <Shield size={14} className="text-primary-200" />
        AI-Powered Vulnerability Scanning & Patching
      </Motion.div>

      {/* Headline with animated gradient */}
      <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight max-w-3xl">
        <SplitText
          text="Detect, Analyze & "
          className="text-white inline-block"
          delay={25}
        />
        <SplitText
          text="Patch Vulnerabilities "
          className="hero-gradient-text inline-block"
          delay={25}
        />
        <SplitText
          text="with AI"
          className="text-white inline-block"
          delay={25}
        />
      </div>

      {/* Subtitle */}
      <Motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.25, type: "spring", stiffness: 150, damping: 22 }}
        className="mt-5 text-base sm:text-lg text-surface-300 max-w-xl leading-relaxed bg-[#0a0a0a]/60 backdrop-blur-md p-4 rounded-xl border border-white/10"
      >
        <ShinyText
          text="WebPatcher scans your web applications with OWASP ZAP, leverages AI to generate precise fix recommendations, and auto-creates GitHub pull requests — all in one seamless workflow."
          speed={3}
          className="w-full"
          color="#94a3b8"
          shineColor="#ffffff"
        />
      </Motion.div>

      {/* CTA buttons */}
      <Motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 150, damping: 22 }}
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
        transition={{ delay: 0.55, duration: 0.4 }}
        className="mt-6 text-xs text-surface-400"
      >
        Powered by OWASP ZAP · AI-Driven Security · GitHub Integration
      </Motion.p>
    </section>
  );
}
