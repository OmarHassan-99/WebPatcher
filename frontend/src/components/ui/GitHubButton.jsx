import { Github } from "lucide-react";
import api from "../../api/axios";

export default function GitHubButton({ mode = "login", onClick, isClicked }) {
  function handleGitHubLogin() {
    if (onClick) onClick();
    const redirectUrl = `${api.defaults.baseURL}/auth/github?mode=${mode}&redirect=${window.location.href}`;
    window.location.href = redirectUrl;
  }

  return (
    <button
      type="button"
      onClick={handleGitHubLogin}
      disabled={isClicked}
      className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold shadow-lg transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-primary-600"
      style={{ width: mode === "login" && "100%" }}
    >
      <Github size={20} />
      {mode === "login"
        ? isClicked
          ? "Logging in..."
          : "Login with GitHub"
        : isClicked
        ? "Linking..."
        : "Link GitHub"}
    </button>
  );
}
