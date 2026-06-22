import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  Github,
  ChevronDown,
  Search,
  Loader2,
  AlertCircle,
  X,
  Code2,
} from "lucide-react";
import PrivacyBadge from "./PrivacyBadge";
import { fetchGitHubRepos } from "../../../../utils/http/gitHub";
import useClickOutside from "../../../../hooks/useClickOutside";

export default function GitHubRepoDropdown({ value, onChange, error }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Hover state for search icon glow
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  useClickOutside(containerRef, () => setOpen(false));

  const {
    data,
    isPending,
    isError,
    error: fetchError,
  } = useQuery({
    queryKey: ["githubRepos"],
    queryFn: fetchGitHubRepos,
    retry: 1,
  });

  const repos = data?.repos ?? [];

  const filtered = repos.filter((r) =>
    r.full_name.toLowerCase().includes(query.toLowerCase()),
  );

  const selectedRepo = repos.find((r) => r.html_url === value);

  const handleSelect = useCallback(
    (repo) => {
      onChange(repo.html_url);
      setOpen(false);
      setQuery("");
    },
    [onChange],
  );

  const handleClear = useCallback(
    (e) => {
      e.stopPropagation();
      onChange("");
    },
    [onChange],
  );

  // Autofocus search when opening
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const hasError = !!error;

  return (
    <div ref={containerRef} className="relative group/wrapper">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative mt-2 w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl
          backdrop-blur-md transition-all duration-300 text-left group overflow-hidden
          shadow-[0_4px_20px_-5px_rgba(0,0,0,0.5)] cursor-pointer
          ${
            hasError
              ? "bg-red-950/40 border-red-500/50 hover:bg-red-900/40"
              : open
                ? "bg-primary-800/60 border-primary-500/50"
                : "bg-primary-900/60 border-primary-700/40 hover:border-primary-500/50 hover:bg-primary-800/40"
          } border`}
      >
        {/* Shimmer on hover for empty trigger */}
        {!selectedRepo && !open && (
          <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none skew-x-12" />
        )}

        {/* Left: selected repo or placeholder */}
        <span className="relative z-10 flex items-center gap-3 min-w-0 flex-1">
          <Motion.div
            animate={{
              rotate: selectedRepo ? 360 : 0,
              scale: selectedRepo ? 1.1 : 1,
            }}
            transition={{ type: "spring" }}
            className={`shrink-0 drop-shadow-md transition-colors duration-300 ${
              selectedRepo ? "text-primary-300" : "text-gray-400"
            }`}
          >
            {selectedRepo ? <Code2 size={18} /> : <Github size={18} />}
          </Motion.div>

          {selectedRepo ? (
            <span className="flex items-center gap-3 min-w-0 w-full">
              <span className="truncate text-[15px] font-semibold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">
                {selectedRepo.full_name}
              </span>
              <PrivacyBadge isPrivate={selectedRepo.private} />
            </span>
          ) : (
            <span className="text-sm font-medium text-gray-400/90 tracking-wide">
              {isPending ? "Loading repositories..." : "Choose a repository…"}
            </span>
          )}
        </span>

        {/* Right: clear or chevron */}
        <span className="relative z-10 flex items-center gap-2 shrink-0">
          {selectedRepo && (
            <Motion.span
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === "Enter" && handleClear(e)}
              className="p-1 rounded-md hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors drop-shadow-sm"
            >
              <X size={15} strokeWidth={2.5} />
            </Motion.span>
          )}
          <Motion.div
            animate={{ rotate: open ? 180 : 0, y: open ? 1 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`p-1 rounded-full transition-colors ${
              open
                ? "bg-primary-500/20 text-primary-300"
                : "text-gray-400 group-hover:text-primary-300"
            }`}
          >
            <ChevronDown size={16} strokeWidth={2.5} />
          </Motion.div>
        </span>
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <Motion.div
            key="dropdown"
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute z-50 mt-2 w-full rounded-xl bg-primary-900 border border-primary-500/40 shadow-[0_15px_50px_-10px_rgba(0,0,0,0.8),0_0_20px_rgba(var(--color-primary-500),0.15)]
              backdrop-blur-xl overflow-hidden"
          >
            {/* Search bar wrapper with glow */}
            <div className="relative group/search">
              <div
                className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary-500/50 to-transparent opacity-0 transition-opacity duration-300"
                style={{ opacity: isSearchFocused ? 1 : 0 }}
              />

              <div className="flex items-center gap-3 px-4 py-3 border-b border-primary-700/30 bg-black/20">
                <Motion.div
                  animate={{ scale: isSearchFocused ? 1.1 : 1 }}
                  className={`shrink-0 drop-shadow-sm ${isSearchFocused ? "text-primary-400" : "text-gray-500"}`}
                >
                  <Search size={15} strokeWidth={2.5} />
                </Motion.div>

                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Search repositories…"
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 font-medium outline-none caret-primary-400"
                />

                <AnimatePresence>
                  {query && (
                    <Motion.button
                      initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                      onClick={() => {
                        setQuery("");
                        searchRef.current?.focus();
                      }}
                      className="text-gray-500 hover:text-white hover:bg-white/10 p-1 rounded-md transition-colors"
                    >
                      <X size={14} strokeWidth={2.5} />
                    </Motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* List Content */}
            <div className="max-h-64 overflow-y-auto custom-scrollbar relative">
              {isPending && (
                <Motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center gap-3 py-10 text-primary-300/80"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-md animate-pulse" />
                    <Loader2 size={24} className="animate-spin relative z-10" />
                  </div>
                  <span className="text-sm font-medium tracking-wide animate-pulse">
                    Scanning repositories…
                  </span>
                </Motion.div>
              )}

              {isError && (
                <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-red-400 bg-red-500/5 m-2 rounded-lg border border-red-500/20">
                  <AlertCircle size={24} className="mb-1" />
                  <span className="text-sm font-semibold text-center">
                    {fetchError?.message || "Failed to load repositories"}
                  </span>
                </div>
              )}

              {!isPending && !isError && filtered.length === 0 && (
                <Motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center gap-2 py-10"
                >
                  <Github size={24} className="text-gray-600 mb-1" />
                  <p className="text-sm font-medium text-gray-500">
                    {query
                      ? "No repositories matched."
                      : "No repositories found."}
                  </p>
                </Motion.div>
              )}

              {!isPending &&
                !isError &&
                filtered.map((repo, i) => {
                  const isSelected = value === repo.html_url;
                  return (
                    <Motion.button
                      key={repo.full_name}
                      type="button"
                      onClick={() => handleSelect(repo)}
                      initial={{
                        opacity: 0,
                        y: 10,
                      }}
                      animate={{ opacity: 1, y: 0, x: 0 }}
                      transition={{
                        type: "spring",
                        delay: i * 0.1,
                      }}
                      className={`relative w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-300 group overflow-hidden cursor-pointer border-b border-primary-900/30 ${
                        isSelected
                          ? "bg-primary-600/20 text-white"
                          : "hover:bg-primary-800/40 text-gray-300 hover:text-white"
                      }`}
                    >
                      {/* Selected glowing side indicator */}
                      {isSelected && (
                        <Motion.div
                          layoutId="activeGlow"
                          className="absolute left-0 top-0 bottom-0 w-1 bg-primary-400 shadow-[0_0_10px_rgba(var(--color-primary-400),1)]"
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30,
                          }}
                        />
                      )}

                      {/* Spotlight hover effect (CSS) */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/10 to-primary-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                      <Github
                        size={15}
                        className={`shrink-0 transition-colors drop-shadow-sm ${
                          isSelected
                            ? "text-primary-300"
                            : "text-gray-500 group-hover:text-primary-400"
                        }`}
                      />

                      <span className="flex-1 min-w-0 pr-2">
                        <span
                          className={`block truncate text-sm transition-all duration-300 ${
                            isSelected
                              ? "font-bold tracking-wide"
                              : "font-semibold"
                          }`}
                        >
                          {repo.full_name}
                        </span>
                        {repo.description && (
                          <span className="block truncate text-xs text-gray-400/80 mt-0.5 group-hover:text-gray-300 transition-colors">
                            {repo.description}
                          </span>
                        )}
                      </span>

                      <PrivacyBadge isPrivate={repo.private} />

                      {/* Active indicator */}
                      {value === repo.html_url && (
                        <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary-400" />
                      )}
                    </Motion.button>
                  );
                })}
            </div>

            {/* Footer */}
            {!isPending && !isError && repos.length > 0 && (
              <div className="relative px-4 py-2 bg-black/40 border-t border-primary-700/30 flex justify-between items-center">
                <span className="text-[10px] font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600 uppercase">
                  Connected via GitHub
                </span>
                <span className="text-xs font-medium text-gray-400 bg-primary-900/50 px-2 py-0.5 rounded shadow-inner">
                  {filtered.length} / {repos.length} repos
                </span>
              </div>
            )}
          </Motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {hasError && (
          <Motion.div
            key="error"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="flex items-center gap-1.5 mt-2.5 ml-1 text-red-400 animate-pulse"
          >
            <AlertCircle size={14} />
            <span className="text-xs font-semibold">{error}</span>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
