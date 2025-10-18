import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";

export default function useGitHubToast() {
  const location = useLocation();
  const lastShownRef = useRef({ error: "", success: "" });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const githubError = params.get("github_error");
    const githubSuccess = params.get("github_success");

    if (githubError && githubError !== lastShownRef.current.error) {
      toast.error(decodeURIComponent(githubError), { id: "github-error" });
      lastShownRef.current.error = githubError;
      params.delete("github_error");
    }

    if (githubSuccess && githubSuccess !== lastShownRef.current.success) {
      toast.success(decodeURIComponent(githubSuccess), {
        id: "github-success",
      });
      lastShownRef.current.success = githubSuccess;
      params.delete("github_success");
    }

    if (githubError || githubSuccess) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [location]);
}
