import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import useCsrf from "../hooks/useCsrf";
import { deleteBulkScans, getScans } from "../utils/http/zap";
import ScanCard from "../components/targets/ScanCard";
import { LIST_VARIANTS } from "../data/constants";
import toast from "react-hot-toast";
import { queryClient } from "../utils/http/userAuth";
import DeleteConfirmationModal from "../components/targets/DeleteConfirmationModal";
import ScansPagination from "../components/targets/ScansPagination";
import TargetsStandardHeader from "../components/targets/TargetsStandardHeader";
import TargetsBulkHeader from "../components/targets/TargetsBulkHeader";
import EmptyList from "../components/targets/EmptyList";

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

  function handleFilterChange(val) {
    setStatusFilter(val);
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
      <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 mt-5">
        <AnimatePresence mode="popLayout">
          <Motion.div
            key={selectedIds.size > 0 ? "bulk" : "standard"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 50, delay: 0.1 }}
            className="relative z-20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-900/40 backdrop-blur-md p-6 rounded-3xl border border-white/5"
          >
            {/* Header Content Switches based on Selection */}
            {selectedIds.size > 0 ? (
              // Bulk Action Header
              <TargetsBulkHeader
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                scans={scans}
                handleDeleteSelected={handleDeleteSelected}
                toggleSelectAll={toggleSelectAll}
                isDeleting={isDeleting}
              />
            ) : (
              // Standard Header
              <TargetsStandardHeader
                statusFilter={statusFilter}
                handleFilterChange={handleFilterChange}
                scans={scans}
              />
            )}
          </Motion.div>
        </AnimatePresence>

        {/* Scans List */}
        {isPending ? (
          <div className="flex h-64 w-full items-center justify-center text-primary-200/50">
            <Loader2 className="animate-spin mr-3" size={32} />
            <span className="animate-pulse">Loading scans...</span>
          </div>
        ) : scans.length > 0 ? (
          <>
            <Motion.div
              key={page}
              variants={LIST_VARIANTS}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
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

            {/* Pagination */}
            <ScansPagination
              page={page}
              totalPages={totalPages}
              handlePrev={handlePrev}
              handleNext={handleNext}
              isPlaceholderData={isPlaceholderData}
            />
          </>
        ) : (
          // Empty State
          <EmptyList statusFilter={statusFilter} />
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
