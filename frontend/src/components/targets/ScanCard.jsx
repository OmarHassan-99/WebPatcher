import { useState } from "react";
import { Link } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  GitBranch,
  GitFork,
  Globe,
  ShieldAlert,
  Trash2,
  Github,
  Clock,
  Database,
  Code2,
  Layers,
  CheckSquare,
  Square,
  Server,
  Wrench,
  ArrowRight,
} from "lucide-react";
import {
  CHECKBOX_VARIANTS,
  FORMAT_DATE,
  GET_DURATION,
  GET_STATUS_COLOR,
} from "../../data/constants";
import { useMutation } from "@tanstack/react-query";
import { deleteScan } from "../../utils/http/zap";
import useCsrf from "../../hooks/useCsrf";
import toast from "react-hot-toast";
import { queryClient } from "../../utils/http/userAuth";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import ContextBadge from "./ContextBadge";
import ShinyText from "../../react-bits/ShinyText";
import { generateTargetSlug } from "../../utils/slugify";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 50 },
  },
};

export default function ScanCard({ scan, isSelected, onToggle, page = 1 }) {
  const csrfToken = useCsrf();
  const [showModal, setShowModal] = useState(false);

  const createdDate = FORMAT_DATE(scan.createdAt);
  const duration = GET_DURATION(scan.startedAt, scan.finishedAt);

  const CTX_LIST = [
    { icon: Database, values: scan.context?.db },
    { icon: Code2, values: scan.context?.lang },
    { icon: Layers, values: scan.context?.fw },
    { icon: Server, values: scan.context?.os },
    { icon: GitFork, values: scan.context?.scm },
    { icon: Wrench, values: scan.context?.ws },
  ];

  const { mutate: deleteScanMutate, isPending: isDeleting } = useMutation({
    mutationFn: () => deleteScan({ csrfToken, scanId: scan._id }),
    onSuccess: (data) => {
      toast.success(data.message || "Scan deleted successfully!");
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ["scans"] });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete scan");
      setShowModal(false);
    },
  });

  function handleToggleSelect(e) {
    e.preventDefault();
    e.stopPropagation();
    if (onToggle) onToggle(scan._id);
  }

  function handleDeleteClick(e) {
    e.preventDefault();
    e.stopPropagation();
    setShowModal(true);
  }

  function handleCloseModal(e) {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowModal(false);
  }

  return (
    <>
      <div>
        <Motion.div
          variants={itemVariants}
          whileHover={!isSelected ? { y: -4 } : {}}
          animate={
            isSelected
              ? { scale: 0.96, y: -2, opacity: 1 }
              : { scale: 1, y: 0, opacity: 1 }
          }
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 18,
          }}
          className={`
            group relative h-full flex flex-col justify-between
            rounded-3xl transition-all duration-500 overflow-hidden
            ${isSelected
              ? "ring-2 ring-primary-500 bg-surface-900/90 shadow-2xl shadow-primary-500/20"
              : "glass-card hover:shadow-2xl hover:shadow-primary-500/10 hover:border-primary-500/30"
            }
          `}
        >
          {/* SELECTION OVERLAY */}
          <div
            onClick={handleToggleSelect}
            className="absolute top-4 left-4 z-30 cursor-pointer"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isSelected ? (
                <Motion.div
                  key="check"
                  variants={CHECKBOX_VARIANTS}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="text-primary-400 drop-shadow-lg"
                >
                  <CheckSquare size={24} weight="fill" />
                </Motion.div>
              ) : (
                <Motion.div
                  key="square"
                  variants={CHECKBOX_VARIANTS}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="text-gray-600 group-hover:text-gray-400 transition-colors"
                >
                  <Square size={24} />
                </Motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CARD HEADER (Frosted) */}
          <div className="relative p-6 pb-4 border-b border-white/5 bg-white/5 backdrop-blur-sm">
            <div className="flex justify-between mb-2 pl-8">
              <div className="flex-1 pr-2 overflow-hidden">
                <div className="flex items-center gap-x-3">
                  <h3
                    className="text-lg font-bold text-white tracking-tight truncate group-hover:text-primary-300 transition-colors duration-300"
                    title={scan.targetName}
                  >
                    {scan.targetName || "Untitled Target"}
                  </h3>
                  {scan.githubRepoUrl && (
                    <a
                      href={scan.githubRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-gray-500 hover:text-white transition-colors"
                    >
                      <Github size={20} />
                    </a>
                  )}
                </div>
                <div className="mt-1">
                  <a
                    href={scan.targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-primary-200/80 hover:text-primary-100 flex items-center gap-1 transition-colors"
                  >
                    <Globe size={12} />
                    <span className="truncate max-w-[150px]">
                      {scan.targetUrl}
                    </span>
                  </a>
                </div>
              </div>

              <div className="flex flex-col justify-end">
                <div
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg
                    ${GET_STATUS_COLOR(scan.status)}
                    ${scan.status === "running" ||
                      scan.status === "analyzing" ||
                      scan.status === "patching"
                      ? "animate-pulse"
                      : ""
                    }
                  `}
                >
                  {scan.status}
                </div>
              </div>
            </div>
          </div>

          <div className="absolute top-0 right-0 p-20 bg-primary-500/10 blur-[60px] rounded-full pointer-events-none group-hover:bg-primary-500/20 transition-all duration-500" />

          {/* CARD BODY */}
          <div className="p-6 pt-4 flex-1 flex flex-col justify-end relative z-10">
            {/* CONTEXT PILLS */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                {CTX_LIST.map((ctx, i) => (
                  <ContextBadge key={i} icon={ctx.icon} values={ctx.values} />
                ))}
              </div>

              <Link
                to={`/targets/${generateTargetSlug(scan._id, scan.targetName)}`}
                state={{ page }}
                className="px-3 py-2 hover:bg-white/10 rounded-full transition duration-500 flex items-center gap-2"
              >
                <ShinyText text="View Scan" />
                <ArrowRight size={14} className="text-gray-500 animate-pulse" />
              </Link>
            </div>

            {/* METRICS ROW */}
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
              <div className="flex items-center gap-4">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${scan.findingsCount > 0
                      ? "bg-red-500/10 border-red-500/20 text-red-200"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                    }`}
                >
                  <ShieldAlert size={14} />
                  <span className="font-bold text-sm">
                    {scan.findingsCount || 0}
                  </span>
                </div>

                {scan.context?.branch && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
                    <GitBranch size={12} />
                    <span className="max-w-[80px] truncate">
                      {scan.context.branch}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-x-5 justify-end flex-1">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-0.5">
                    Duration
                  </p>
                  <div className="flex items-center justify-end gap-1.5 text-xs text-gray-300 font-medium">
                    <Clock size={12} className="text-primary-500" />
                    {duration || "--"}
                  </div>
                </div>
                <div className="text-xs text-wrap w-20 text-gray-500">
                  {createdDate}
                </div>
              </div>
            </div>
          </div>

          {/* Delete Button (Hover) */}
          {!isSelected && (
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-all duration-300 z-50 backdrop-blur-md cursor-pointer"
              title="Delete Scan"
            >
              <Trash2 size={16} className={isDeleting ? "animate-pulse" : ""} />
            </button>
          )}
        </Motion.div>
      </div>

      <AnimatePresence>
        {showModal && (
          <DeleteConfirmationModal
            isOpen={showModal}
            onClose={handleCloseModal}
            onConfirm={() => deleteScanMutate()}
            targetName={scan.targetName}
          />
        )}
      </AnimatePresence>
    </>
  );
}
