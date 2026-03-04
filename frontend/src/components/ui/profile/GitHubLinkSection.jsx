import { forwardRef } from "react";
import { motion as Motion } from "framer-motion";
import GitHubButton from "../GitHubButton";

const GitHubLinkSection = forwardRef(
  (
    { user, isClicked, setIsClicked, isSubmittingUnlink, onUnlinkGitHub },
    ref,
  ) => {
    return (
      <Motion.div
        ref={ref}
        key="githubLink"
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
        className="space-y-4"
      >
        {user.githubUsername ? (
          <div>
            <p className="text-white">
              GitHub Username:{" "}
              <span className="text-primary-100">{user.githubUsername}</span>
            </p>
            <p className="text-white">
              GitHub Link:{" "}
              <a
                href={`https://github.com/${user.githubUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-200 hover:text-primary-300 transition-colors"
              >
                {`https://github.com/${user.githubUsername}`}
              </a>
            </p>
          </div>
        ) : (
          <GitHubButton
            mode="link"
            onClick={() => setIsClicked(true)}
            isClicked={isClicked}
          />
        )}

        {user.githubUsername && (
          <button
            type="button"
            onClick={onUnlinkGitHub}
            disabled={isSubmittingUnlink}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-red-600"
          >
            {isSubmittingUnlink ? "Unlinking..." : "Unlink GitHub Account"}
          </button>
        )}
      </Motion.div>
    );
  },
);

export default GitHubLinkSection;
