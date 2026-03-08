import { Link } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "motion/react";
import GitHubButton from "../ui/GitHubButton";
import { useState } from "react";
import SpotlightCard from "../../react-bits/SpotlightCard";
import DecryptedText from "../../react-bits/DecryptedText";

export default function FormDetails({ texts, mode, children }) {
  const [isClicked, setIsClicked] = useState(false);

  return (
    <div className="m-auto">
      <Motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 80, damping: 18 }}
        className="w-sm sm:w-lg"
      >
        <SpotlightCard
          spotlightColor="rgba(130, 140, 248, 0.15)"
          className="!p-10 !rounded-2xl !border-white/[0.08] !bg-surface-900/80"
        >
          {/* Title with decrypt animation */}
          <AnimatePresence mode="wait">
            <Motion.div
              key={mode}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-3xl font-bold text-white mb-2">
                <DecryptedText
                  text={texts.title}
                  animateOn="view"
                  sequential
                  speed={30}
                  maxIterations={6}
                  revealDirection="start"
                  className="text-white"
                  encryptedClassName="text-surface-500"
                />
              </h2>
              <p className="text-surface-400 text-sm mb-8">{texts.subtitle}</p>
            </Motion.div>
          </AnimatePresence>

          {/* Form content */}
          <AnimatePresence mode="wait">
            <Motion.div
              key={mode}
              initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </Motion.div>
          </AnimatePresence>

          {/* Divider */}
          {mode === "login" && <div className="auth-divider">or</div>}

          {/* GitHub Login */}
          {mode === "login" && (
            <Motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <GitHubButton
                onClick={() => setIsClicked(true)}
                isClicked={isClicked}
              />
            </Motion.div>
          )}

          {/* Mode switch link */}
          <p className="text-center text-surface-400 text-sm mt-6">
            {texts.link}{" "}
            <Link
              to={`/auth?mode=${texts.linkMode}`}
              className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              {texts.linkText}
            </Link>
          </p>
        </SpotlightCard>
      </Motion.div>
    </div>
  );
}
