import { AlertTriangle } from "lucide-react";
import { AnimatePresence, motion as Motion } from "framer-motion";

export default function DeleteModal({
  showDeleteModal,
  setShowDeleteModal,
  handleDeleteAccount,
  isDeleting,
}) {
  return (
    <AnimatePresence>
      {showDeleteModal && (
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <Motion.div
            initial={{ opacity: 0, scale: 0.9, x: 0 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: [0, -5, 5, -3, 3, 0],
              transition: { duration: 0.6, ease: "easeInOut" },
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-gray-900 text-white rounded-2xl p-8 shadow-2xl w-[90%] max-w-md border border-red-600"
          >
            <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
              <AlertTriangle size={20} className="text-red-500" /> Confirm
              Account Deletion
            </h3>

            <p className="text-gray-300 mb-6">
              Are you{" "}
              <span className="text-red-400 font-semibold">
                absolutely sure
              </span>{" "}
              you want to delete your account? This will permanently erase all
              your data and cannot be undone.
            </p>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <Motion.button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Permanently"}
              </Motion.button>
            </div>
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}
