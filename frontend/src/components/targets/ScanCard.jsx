import { useState } from "react";
import { Link } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { Calendar, GitBranch, Globe, ShieldAlert, Trash2 } from "lucide-react";
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

export default function ScanCard({ scan }) {
  const csrfToken = useCsrf();
  const [showModal, setShowModal] = useState(false);

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

  function handleDeleteClick(e) {
    // Stop propagation so the Card Link isn't clicked
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
          whileHover={{ y: -4 }}
          className="group relative h-full flex flex-col justify-between p-5 rounded-2xl border border-gray-700 bg-gray-900/50 hover:bg-gray-800/50 transition-all"
        >
          {/* HEADER: Title + Status Badge */}
          <div className="flex justify-between items-start mb-4 pr-1">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-primary-100 group-hover:text-primary-400 transition-colors duration-500 line-clamp-1">
                {scan.targetName || "Untitled Target"}
              </h3>
              <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                <Globe size={12} />
                <span className="truncate max-w-[180px]">{scan.targetUrl}</span>
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

          <div className="h-px w-full bg-gray-700/50 my-2" />

          {/* FOOTER: Stats + Date */}
          <div className="flex justify-between items-center text-sm text-gray-400 mt-2">
            <div className="flex gap-3">
              <div
                className="flex items-center gap-1.5"
                title="Vulnerabilities Found"
              >
                <ShieldAlert
                  size={14}
                  className={
                    scan.findings?.length > 0
                      ? "text-red-400"
                      : "text-green-400"
                  }
                />
                <span>{scan.findings?.length || 0}</span>
              </div>

              {scan.context?.branch && (
                <div className="flex items-center gap-1.5" title="Git Branch">
                  <GitBranch size={14} />
                  <span>{scan.context.branch}</span>
                </div>
              )}
            </div>

            <div
              className="flex items-center gap-1.5 text-xs text-gray-500 mr-8"
              title="Scan Date"
            >
              <Calendar size={12} />
              {FORMAT_DATE(scan.createdAt)}
            </div>
          </div>

          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="absolute bottom-3.5 right-2 p-2 rounded-full text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all z-20 cursor-pointer"
            title="Delete Scan"
          >
            <Trash2 size={18} className={isDeleting ? "animate-pulse" : ""} />
          </button>
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
