import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { ClipboardList, Plus } from "lucide-react";

export default function EmptyList({ statusFilter }) {
  return (
    <Motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col justify-center items-center gap-6 w-full min-h-[50vh] text-center border border-dashed border-white/10 rounded-3xl bg-surface-900/30 backdrop-blur-sm"
    >
      <div className="bg-gradient-to-br from-surface-800 to-surface-900 p-8 rounded-full shadow-2xl border border-white/5">
        <ClipboardList size={64} className="text-primary-400 opacity-80" />
      </div>
      <div className="space-y-2 max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-white">No scans found</h2>
        <p className="text-gray-400">
          {statusFilter === "all"
            ? "Your dashboard is looking a bit empty. Launch your first scan to see vulnerabilities here."
            : `No scans found with status "${statusFilter}".`}
        </p>
      </div>
      {statusFilter === "all" && (
        <Link
          to="/targets/new"
          className="mt-4 flex items-center gap-2 bg-primary-600/20 text-primary-300 hover:bg-primary-600/30 border border-primary-500/30 px-8 py-3 rounded-full transition-all font-semibold hover:scale-105 active:scale-95"
        >
          <Plus size={20} />
          Start New Scan
        </Link>
      )}
    </Motion.div>
  );
}
