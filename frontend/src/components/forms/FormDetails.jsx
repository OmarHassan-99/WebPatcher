import { Link } from "react-router-dom";
import { motion as Motion } from "motion/react";
import GitHubButton from "../ui/GitHubButton";
import { useState } from "react";

export default function FormDetails({ texts, mode, children }) {
  const [isClicked, setIsClicked] = useState(false);

  return (
    <div className="flex h-screen items-center justify-center">
      <Motion.div
        variants={{
          hidden: { opacity: 0, y: 50 },
          visible: { opacity: 1, y: 0 },
        }}
        initial="hidden"
        animate="visible"
        transition={{ type: "spring" }}
        className="bg-gradient-to-r from-primary-800 to-primary-700 p-8 rounded-lg shadow-lg"
      >
        <h2 className="text-2xl font-bold text-white mb-2">{texts.title}</h2>
        <p className="text-white/80 mb-4">{texts.subtitle}</p>
        {children}
        {mode === "login" && (
          <div className="mt-2">
            <GitHubButton
              onClick={() => setIsClicked(true)}
              isClicked={isClicked}
            />
          </div>
        )}
        <p className="text-center text-white mt-4">
          {texts.link}{" "}
          <Link
            to={`/auth?mode=${texts.linkMode}`}
            className="text-primary-100 hover:text-primary-200 transition-colors"
          >
            {texts.linkText}
          </Link>
        </p>
      </Motion.div>
    </div>
  );
}
