import { forwardRef } from "react";
import { motion as Motion } from "framer-motion";

const DangerZoneSection = forwardRef(({ isDeleting, onDeleteClick }, ref) => {
  return (
    <Motion.div
      ref={ref}
      key="dangerZone"
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <p className="text-sm text-red-300 mb-6">
        Deleting your account will permanently remove all your data, including
        scans, reports, and linked GitHub information.{" "}
        <strong>This action cannot be undone.</strong>
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          type="button"
          onClick={onDeleteClick}
          disabled={isDeleting}
          className="flex-1 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-white font-semibold shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-red-700"
        >
          {isDeleting ? "Deleting..." : "Delete Account Permanently"}
        </button>
      </div>
    </Motion.div>
  );
});

export default DangerZoneSection;
