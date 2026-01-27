import { motion as Motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useEffect } from "react";

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  targetName,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose(e);
      } else if (e.key === "Enter") {
        onConfirm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()} // Prevent click from closing if clicking modal
        className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-3 bg-red-500/10 rounded-full">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">Delete Scan?</h3>
            <p className="text-gray-400 mt-2 text-sm">
              Are you sure you want to delete the scan for{" "}
              <span className="text-primary-100 font-semibold">
                {targetName || "this target"}
              </span>
              ? This action cannot be undone.
            </p>
          </div>

          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 font-medium hover:bg-gray-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20 cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      </Motion.div>
    </div>
  );
}
