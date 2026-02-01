import { useState } from "react";
import { Link } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  GitBranch,
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
} from "lucide-react";
import { FORMAT_DATE, GET_STATUS_COLOR } from "../../data/constants";
import { useMutation } from "@tanstack/react-query";
import { deleteScan } from "../../utils/http/zap";
import useCsrf from "../../hooks/useCsrf";
import toast from "react-hot-toast";
import { queryClient } from "../../utils/http/userAuth";
import DeleteConfirmationModal from "./DeleteConfirmationModal";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 50 },
  },
};

const checkboxVariants = {
  initial: { scale: 0.5, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.5, opacity: 0 },
};

function getDuration(start, end) {
  if (!start || !end) return null;
  const diff = new Date(end) - new Date(start);
  const minutes = Math.floor(diff / 60000);
  const seconds = ((diff % 60000) / 1000).toFixed(0);
  if (minutes > 60) return `${(minutes / 60).toFixed(1)}h`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// eslint-disable-next-line no-unused-vars
function ContextBadge({ icon: Icon, label }) {
  if (!label) return null;
  return (
    <div className="flex items-center gap-1 px-1.5 py-1 rounded bg-gray-800 border border-gray-700 text-[11px] text-gray-300">
      <Icon size={15} className="text-primary-100" />
      <span className="truncate max-w-[80px]">{label}</span>
    </div>
  );
}

export default function ScanCard({ scan, isSelected, onToggle }) {
  const csrfToken = useCsrf();
  const [showModal, setShowModal] = useState(false);

  const duration = getDuration(scan.startedAt, scan.finishedAt);
  const primaryDb = scan.context?.db?.[0];
  const primaryLang = scan.context?.lang?.[0];
  const primaryFw = scan.context?.fw?.[0];

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
      <Link to={`/targets/${scan._id}`}>
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
          className={`group relative h-full flex flex-col justify-between p-5 rounded-2xl border border-gray-700 bg-gray-900/50 transition-all duration-200 ${isSelected ? "scale-[0.96] ring-2 ring-primary-500 bg-gray-900/80 rounded-lg" : "hover:bg-gray-800/50"}`}
        >
          {/* SELECTION CHECKBOX */}
          <div
            onClick={handleToggleSelect}
            className="absolute top-5 left-5 z-30 cursor-pointer"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isSelected ? (
                <Motion.div
                  key="check"
                  variants={checkboxVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.15 }}
                  className="text-primary-100 hover:text-white transition-colors duration-500"
                >
                  <CheckSquare size={22} />
                </Motion.div>
              ) : (
                <Motion.div
                  key="square"
                  variants={checkboxVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.15 }}
                  className="text-gray-500 hover:text-white transition-colors duration-500"
                >
                  <Square size={22} />
                </Motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CARD CONTENT */}
          <div
            className={`flex flex-col h-full justify-between transition-all duration-300 ${
              isSelected
                ? "opacity-40 grayscale-[50%] blur-[0.5px]"
                : "opacity-100"
            }`}
          >
            {/* HEADER */}
            <div className="flex justify-between items-start mb-3 pr-1 pl-8">
              <div className="flex-1 pr-2 overflow-hidden">
                <div className="flex items-center gap-2 mb-1">
                  <h3
                    className={`text-lg font-bold text-primary-100 transition-colors duration-500 truncate -mt-1 ${!isSelected && "group-hover:text-primary-400"}`}
                    title="Target Name"
                  >
                    {scan.targetName || "Untitled Target"}
                  </h3>
                  {scan.githubRepoUrl && (
                    <a
                      href={scan.githubRepoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-gray-500 hover:text-white transition-colors z-20 ml-1"
                    >
                      <Github size={18} />
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Globe size={12} />
                  <span className="truncate">{scan.targetUrl}</span>
                </div>
              </div>

              <span
                className={`px-2 py-1 rounded-full text-xs font-medium border ${GET_STATUS_COLOR(
                  scan.status,
                )} capitalize whitespace-nowrap`}
              >
                {scan.status}
              </span>
            </div>

            {/* CONTEXT */}
            {(primaryDb || primaryLang || primaryFw) && (
              <div className="flex flex-wrap gap-2 mb-3 pl-8">
                <ContextBadge icon={Database} label={primaryDb} />
                <ContextBadge icon={Code2} label={primaryLang} />
                <ContextBadge icon={Layers} label={primaryFw} />
              </div>
            )}

            <div className="h-px w-full bg-gray-700/50 my-2" />

            {/* FOOTER */}
            <div className="flex justify-between items-center text-sm text-gray-400 mt-1">
              <div className="flex gap-3 items-center">
                <div
                  className="flex items-center gap-1.5"
                  title="Vulnerabilities"
                >
                  <ShieldAlert
                    size={14}
                    className={
                      scan.findings?.length > 0
                        ? "text-red-400"
                        : "text-green-400"
                    }
                  />
                  <span className="font-mono">
                    {scan.findings?.length || 0}
                  </span>
                </div>

                {scan.context?.branch && (
                  <div className="flex items-center gap-1.5" title="Branch">
                    <GitBranch size={14} />
                    <span className="max-w-[80px] truncate">
                      {scan.context.branch}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end text-xs text-gray-500 mr-8 gap-0.5">
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} />
                  {FORMAT_DATE(scan.startedAt || scan.createdAt)}
                </div>
                {duration && (
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <Clock size={12} />
                    {duration}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Delete Button */}
          {!isSelected && (
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="absolute bottom-3.5 right-2 p-2 rounded-full text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all z-20 cursor-pointer"
              title="Delete Scan"
            >
              <Trash2 size={18} className={isDeleting ? "animate-pulse" : ""} />
            </button>
          )}
        </Motion.div>
      </Link>

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
