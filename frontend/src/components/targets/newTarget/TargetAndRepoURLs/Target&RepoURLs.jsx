import { useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  PencilLine,
  ListChecks,
  Globe,
  ShieldCheck,
  Github,
  Tag,
} from "lucide-react";
import CheckField from "./CheckField";
import LockButton from "../../../../react-bits/LockButton";
import CustomTargetInput from "./CustomTargetInput";
import GitHubRepoDropdown from "./GitHubRepoDropdown";
import ConnectGitHubBanner from "./ConnectGitHubBanner";

export default function TargetAndRepoURLs({
  formData,
  updateField,
  error,
  setError,
  isAnimatePulse,
  user,
}) {
  const hasGitHub = Boolean(user?.githubUsername);
  const [manualMode, setManualMode] = useState(false);

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Background glow effects for the whole section */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 size-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Form Card */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-black/20 border border-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Header Section */}
        <div className="mb-8 relative z-10">
          <Motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary-100 via-primary-400 to-primary-800"
          >
            Target & Repository
          </Motion.h2>
          <Motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mt-2 text-sm text-gray-400 font-medium"
          >
            Define the destination for your security scan.
          </Motion.p>
        </div>

        <div className="flex flex-col gap-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Target URL */}
            <CustomTargetInput
              label="Target URL"
              name="targetUrl"
              leftIcon={Globe}
              value={formData.targetUrl}
              onChange={(e) => {
                updateField("targetUrl", e.target.value);
                setError((prev) => ({ ...prev, targetUrl: "" }));
              }}
              placeholder="https://example.com"
              error={error.targetUrl}
              isAnimatePulse={true}
            />

            {/* Target Name */}
            <CustomTargetInput
              label="Target Name"
              span="(Helps you identify the target easily)"
              name="targetName"
              leftIcon={Tag}
              value={formData.targetName}
              onChange={(e) => updateField("targetName", e.target.value)}
              placeholder="Target Name (optional)"
            />
          </div>

          {/* GitHub Repo URL*/}
          {hasGitHub ? (
            <div className="flex flex-col gap-3 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
              {/* Mode toggle pill */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-y-3">
                <label
                  className={`text-sm font-bold tracking-wide transition-colors duration-300 flex items-center ${
                    error.githubRepoUrl ? "text-red-400" : "text-white"
                  }`}
                >
                  GitHub Repository
                  <AnimatePresence mode="wait">
                    <Motion.span
                      key={manualMode}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -6 }}
                      transition={{ duration: 0.3 }}
                      className={`text-xs ml-3 font-medium px-2 py-0.5 rounded shadow-inner ${
                        error.githubRepoUrl
                          ? "bg-red-500/10 text-red-300"
                          : "bg-primary-500/10 text-primary-300"
                      }`}
                    >
                      {!manualMode ? "List Select" : "Manual Entry"}
                    </Motion.span>
                  </AnimatePresence>
                </label>

                <div
                  className="relative flex items-center gap-1 rounded-[10px] bg-black/40
                    border border-white/10 p-1 backdrop-blur-md self-start sm:self-auto shadow-inner"
                >
                  {[
                    {
                      id: "list",
                      label: "Pick from list",
                      icon: ListChecks,
                      active: !manualMode,
                      action: () => setManualMode(false),
                    },
                    {
                      id: "manual",
                      label: "Type manually",
                      icon: PencilLine,
                      active: manualMode,
                      action: () => setManualMode(true),
                    },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={mode.action}
                      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs
                        font-bold tracking-wide transition-all duration-300 z-10 cursor-pointer
                        ${
                          mode.active
                            ? "text-black shadow-sm"
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                    >
                      {mode.active && (
                        <Motion.div
                          layoutId="activeModePill"
                          className="absolute inset-0 rounded-md bg-gradient-to-r from-primary-400 to-primary-500 shadow-[0_0_15px_rgba(var(--color-primary-400),0.4)]"
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 25,
                          }}
                          style={{ zIndex: -1 }}
                        />
                      )}
                      <mode.icon
                        size={14}
                        strokeWidth={2.5}
                        className={mode.active ? "text-black" : "text-gray-400"}
                      />
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content based on mode */}
              <AnimatePresence mode="popLayout">
                {manualMode ? (
                  <Motion.div
                    key="manual"
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    transition={{ type: "spring" }}
                  >
                    <CustomTargetInput
                      label="Enter GitHub Repo URL"
                      name="githubRepoUrl"
                      leftIcon={Github}
                      value={formData.githubRepoUrl}
                      onChange={(e) => {
                        updateField("githubRepoUrl", e.target.value);
                        setError((prev) => ({ ...prev, githubRepoUrl: "" }));
                      }}
                      placeholder="https://github.com/username/repo-name"
                      error={error.githubRepoUrl}
                      isAnimatePulse={isAnimatePulse}
                    />
                  </Motion.div>
                ) : (
                  <Motion.div
                    key="dropdown"
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ type: "spring" }}
                  >
                    <GitHubRepoDropdown
                      value={formData.githubRepoUrl}
                      onChange={(url) => {
                        updateField("githubRepoUrl", url);
                        setError((prev) => ({ ...prev, githubRepoUrl: "" }));
                      }}
                      error={error.githubRepoUrl}
                    />
                  </Motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
              <CustomTargetInput
                label="GitHub Repository"
                name="githubRepoUrl"
                value={formData.githubRepoUrl}
                onChange={(e) => {
                  updateField("githubRepoUrl", e.target.value);
                  setError((prev) => ({ ...prev, githubRepoUrl: "" }));
                }}
                placeholder="https://github.com/username/repo-name"
                error={error.githubRepoUrl}
                isAnimatePulse={isAnimatePulse}
              />
              <Motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <ConnectGitHubBanner />
              </Motion.div>
            </div>
          )}
        </div>

        {/* Glowing Divider */}
        <div className="relative h-px w-full my-8 bg-white/10">
          <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary-500/50 to-transparent blur-[1px]" />
          <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-black border border-white/10">
            <ShieldCheck size={14} className="text-white" />
          </div>
        </div>

        {/* Legal checkboxes */}
        <div className="relative p-6 rounded-2xl bg-primary-950/20 border border-primary-900/50">
          <div className="absolute top-0 left-4 -mt-3.5 px-2 rounded-sm bg-[#050505] text-xs font-bold tracking-widest text-primary-400 uppercase">
            Legal Agreement
          </div>

          <div className="flex flex-col space-y-2 text-white">
            <CheckField
              index={0}
              spanText="Unauthorized scanning of third-party targets is strictly prohibited"
            />
            <CheckField
              index={1}
              spanText="Users must own or have explicit permission to scan a target"
            />
            <CheckField index={2} spanText="Terms and Conditions apply" />

            <Motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-4 mt-6 pt-6 border-t border-white/5"
            >
              <div className="shrink-0 relative group">
                <LockButton
                  isChecked={formData.isChecked}
                  onChange={(e) => updateField("isChecked", e.target.checked)}
                />
              </div>
              <span
                className={`text-sm font-semibold tracking-wide transition-colors duration-500 ${
                  formData.isChecked ? "text-emerald-400" : "text-gray-400"
                }`}
              >
                I confirm that I have the legal authorization to scan this
                target
              </span>
            </Motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
