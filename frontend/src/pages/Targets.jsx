import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckSquare,
  Square,
  X,
  Trash2,
} from "lucide-react";
import useCsrf from "../hooks/useCsrf";
import { deleteBulkScans, getScans } from "../utils/http/zap";
import ScanCard from "../components/targets/ScanCard";
import { LIST_VARIANTS, STATUS_OPTIONS } from "../data/constants";
import toast from "react-hot-toast";
import { queryClient } from "../utils/http/userAuth";
import DeleteConfirmationModal from "../components/targets/DeleteConfirmationModal";

export default function TargetsPage() {
  const csrfToken = useCsrf();
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const { data, isPending, isPlaceholderData } = useQuery({
    queryKey: ["scans", page, statusFilter],
    queryFn: () =>
      getScans({ csrfToken, page, size: pageSize, status: statusFilter }),
  });

  const scans = data?.scans || [];
  const totalScans = data?.total || 0;
  const totalPages = Math.ceil(totalScans / pageSize);

  const { mutate: deleteMutation, isPending: isDeleting } = useMutation({
    mutationFn: (ids) => deleteBulkScans({ csrfToken, ids }),
    onSuccess: (data) => {
      toast.success(data.message || `Deleted ${selectedIds.size} scans`);
      setShowModal(false);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["scans"] });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete scans");
      setShowModal(false);
    },
  });

  function toggleSelect(id) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function toggleSelectAll() {
    if (selectedIds.size === scans.length) {
      setSelectedIds(new Set()); // Deselect all
    } else {
      // Select all IDs on the current page
      setSelectedIds(new Set(scans.map((s) => s._id)));
    }
  }

  function handleDeleteSelected(e) {
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

  function handleFilterChange(e) {
    setStatusFilter(e.target.value);
    setPage(1);
  }

  function handlePrev() {
    setPage((old) => Math.max(old - 1, 1));
  }

  function handleNext() {
    if (!isPlaceholderData && page < totalPages) {
      setPage((old) => old + 1);
    }
  }

  return (
    <>
      <div className="w-full py-4 px-12 space-y-6 mt-5">
        <Motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 50, delay: 0.2 }}
          className="flex justify-between items-center mx-2 gap-x-4"
        >
          {/* Header Content Switches based on Selection */}
          {selectedIds.size > 0 ? (
            // Bulk Action Header
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <X size={20} />
                </button>
                <span className="font-semibold text-white">
                  {selectedIds.size} selected
                </span>
              </div>

              <button
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl transition-all font-medium text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Trash2 size={18} />
                )}
                Delete Selected
              </button>
            </div>
          ) : (
            // Standard Header
            <>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-white">Target Scans</h1>
                <p className="text-gray-400 text-sm">
                  Manage and monitor your vulnerability scans
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                {/* Status Filter Dropdown */}
                <div className="relative group">
                  <Filter
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <select
                    value={statusFilter}
                    onChange={handleFilterChange}
                    className="appearance-none bg-gray-900 border border-gray-700 hover:border-gray-600 text-gray-300 text-sm rounded-xl pl-10 pr-8 py-2 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all cursor-pointer min-w-[140px]"
                  >
                    <option value="all">All Statuses</option>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {scans?.length > 0 && (
                  <Link
                    to="/targets/new"
                    className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-xl transition-all font-medium text-sm"
                  >
                    <Plus size={18} />
                    New Target
                  </Link>
                )}
              </div>
            </>
          )}
        </Motion.div>

        {/* Select All Bar */}
        {scans.length > 0 && (
          // <div className="flex items-center gap-2 px-2 text-sm text-gray-400 hover:text-white">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 px-2 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            {selectedIds.size === scans.length && scans.length > 0 ? (
              <CheckSquare size={18} className="text-primary-100" />
            ) : (
              <Square size={18} />
            )}
            {selectedIds.size === scans.length ? "Deselect All" : "Select All"}
          </button>
          // </div>
        )}

        {/* Scans List */}
        {isPending ? (
          <div className="flex h-64 w-full items-center justify-center text-gray-400">
            <Loader2 className="animate-spin mr-2" /> Loading scans...
          </div>
        ) : scans.length > 0 ? (
          <>
            <Motion.div
              key={page}
              variants={LIST_VARIANTS}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {scans.map((scan) => {
                const isSelected = selectedIds.has(scan._id);
                return (
                  <ScanCard
                    key={scan._id}
                    scan={scan}
                    isSelected={isSelected}
                    onToggle={toggleSelect}
                  />
                );
              })}
            </Motion.div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center mt-8 pt-4 pb-20 sm:pb-0 border-t border-gray-800">
              <span className="text-sm text-gray-500">
                Showing page{" "}
                <span className="text-white font-medium">{page}</span> of{" "}
                <span className="text-white font-medium">{totalPages}</span>
              </span>

              <div className="flex gap-2">
                <button
                  onClick={handlePrev}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <button
                  onClick={handleNext}
                  disabled={isPlaceholderData || page === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          // Empty State
          <Motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col justify-center items-center gap-4 w-full h-[60vh] text-center border border-dashed border-gray-700 rounded-3xl bg-gray-900/20"
          >
            <div className="bg-gray-800 p-4 rounded-full text-gray-400">
              <ClipboardList size={48} />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">
                No scans found
              </h2>
              <p className="text-gray-500 max-w-sm text-sm">
                {statusFilter === "all"
                  ? "Add your first target URL to start scanning."
                  : `No scans found with status "${statusFilter}".`}
              </p>
            </div>
            {statusFilter === "all" && (
              <Link
                to="/targets/new"
                className="mt-2 flex items-center gap-2 border border-primary-500/50 text-primary-400 hover:bg-primary-500/10 px-6 py-2 rounded-full transition-all font-medium text-sm"
              >
                <Plus size={16} />
                Add Target
              </Link>
            )}
          </Motion.div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <DeleteConfirmationModal
            isOpen={showModal}
            onClose={handleCloseModal}
            onConfirm={() => deleteMutation(Array.from(selectedIds))}
            deleteBulk={
              selectedIds.size === 1
                ? "this scan"
                : `these ${selectedIds.size} scans`
            }
          />
        )}
      </AnimatePresence>
    </>
  );
}
