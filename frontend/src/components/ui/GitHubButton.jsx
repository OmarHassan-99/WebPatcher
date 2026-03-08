import { Github } from "lucide-react";
import { motion as Motion } from "motion/react";
import api from "../../api/axios";

export default function GitHubButton({ mode = "login", onClick, isClicked }) {
  function handleGitHubLogin() {
    if (onClick) onClick();
    const redirectUrl = `${api.defaults.baseURL}/auth/github?mode=${mode}&redirect=${window.location.href}`;
    window.location.href = redirectUrl;
  }

  return (
    <Motion.button
      type="button"
      onClick={handleGitHubLogin}
      disabled={isClicked}
      whileHover={!isClicked ? { scale: 1.02 } : {}}
      whileTap={!isClicked ? { scale: 0.98 } : {}}
      className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold shadow-md transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
      style={{ width: mode === "login" && "100%" }}
    >
      <Github size={20} />
      {mode === "login"
        ? isClicked
          ? "Signing in..."
          : "Continue with GitHub"
        : isClicked
        ? "Linking..."
        : "Link GitHub"}
    </Motion.button>
  );
}
