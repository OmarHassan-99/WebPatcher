import { Loader2, Trash2, X } from "lucide-react";

export default function TargetsBulkHeader({
  selectedIds,
  setSelectedIds,
  scans,
  handleDeleteSelected,
  toggleSelectAll,
  isDeleting,
}) {
  return (
    <div className="flex items-center justify-between w-full animate-fade-in-up">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSelectedIds(new Set())}
          className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
        <span className="font-semibold text-white text-lg">
          {selectedIds.size} selected
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSelectAll}
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          {selectedIds.size === scans.length ? "Deselect All" : "Select All"}
        </button>
        <button
          onClick={handleDeleteSelected}
          disabled={isDeleting}
          className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-5 py-2.5 rounded-xl transition-all font-medium text-sm disabled:opacity-50"
        >
          {isDeleting ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Trash2 size={18} />
          )}
          Delete Selected
        </button>
      </div>
    </div>
  );
}
