import { useQuery } from "@tanstack/react-query";
import { motion as Motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ClipboardList, Plus, Loader2 } from "lucide-react";
import useCsrf from "../hooks/useCsrf";
import { getScans } from "../utils/http/zap";
import ScanCard from "../components/targets/ScanCard";
import { LIST_VARIANTS } from "../data/constants";

export default function TargetsPage() {
  const csrfToken = useCsrf();

  const { data: scans, isPending } = useQuery({
    queryKey: ["scans"],
    queryFn: () => getScans({ csrfToken }),
  });

  if (isPending) {
    return (
      <div className="flex h-64 w-full items-center justify-center text-gray-400">
        <Loader2 className="animate-spin mr-2" /> Loading scans...
      </div>
    );
  }

  return (
    <div className="w-full p-4 space-y-6 mt-5">
      <Motion.div
        className="flex justify-between items-center mx-2 gap-x-4"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 50, delay: 0.2 }}
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white">Target Scans</h1>
          <p className="text-gray-400 text-sm">
            Manage and monitor your vulnerability scans
          </p>
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
      </Motion.div>

      {scans?.length > 0 ? (
        <Motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={LIST_VARIANTS}
          initial="hidden"
          animate="visible"
        >
          {scans.map((scan) => (
            <ScanCard key={scan._id} scan={scan} />
          ))}
        </Motion.div>
      ) : (
        <Motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col justify-center items-center gap-4 w-full h-[60vh] text-center border border-dashed border-gray-700 rounded-3xl bg-gray-900/20"
        >
          <div className="bg-gray-800 p-4 rounded-full text-gray-400">
            <ClipboardList size={48} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-white">No targets yet</h2>
            <p className="text-gray-400 max-w-sm">
              Add your first target URL to start scanning for vulnerabilities.
            </p>
          </div>
          <Link
            to="/targets/new"
            className="mt-2 flex items-center gap-2 border border-primary-400 text-primary-300 hover:bg-primary-400 hover:text-white px-6 py-2 rounded-full transition-all duration-300 font-medium"
          >
            <Plus size={18} />
            Add Target
          </Link>
        </Motion.div>
      )}
    </div>
  );
}
