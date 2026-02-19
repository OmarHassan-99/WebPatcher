import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ScansPagination({
  page,
  totalPages,
  handlePrev,
  handleNext,
  isPlaceholderData,
}) {
  return (
    <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/5">
      <span className="text-sm text-gray-500">
        Page <span className="text-white font-bold">{page}</span> of{" "}
        <span className="text-white font-bold">{totalPages}</span>
      </span>

      <div className="flex gap-3">
        <button
          onClick={handlePrev}
          disabled={page === 1}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-surface-800 text-gray-300 hover:bg-surface-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={16} />
          Previous
        </button>

        <button
          onClick={handleNext}
          disabled={isPlaceholderData || page === totalPages}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-surface-800 text-gray-300 hover:bg-surface-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
