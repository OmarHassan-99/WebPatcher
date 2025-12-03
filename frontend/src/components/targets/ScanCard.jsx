import { Link } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import { Calendar, GitBranch, Globe, ShieldAlert } from "lucide-react";
import { FORMAT_DATE, GET_STATUS_COLOR } from "../../data/constants";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 50 },
  },
};

export default function ScanCard({ scan }) {
  return (
    <Link to={`/scans/${scan._id}`}>
      <Motion.div
        variants={itemVariants}
        whileHover={{ y: -4 }}
        className="group relative h-full flex flex-col justify-between p-5 rounded-2xl border border-gray-700 bg-gray-900/50 hover:bg-gray-800/50"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-primary-100 group-hover:text-primary-400 transition-colors duration-500">
              {scan.targetName || "Untitled Target"}
            </h3>
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
              <Globe size={12} />
              <span className="truncate max-w-[200px]">{scan.targetUrl}</span>
            </div>
          </div>

          <span
            className={`px-2 py-1 rounded-full text-xs font-medium border ${GET_STATUS_COLOR(
              scan.status
            )} capitalize`}
          >
            {scan.status}
          </span>
        </div>

        <div className="h-px w-full bg-gray-700/50 my-2" />

        <div className="flex justify-between items-center text-sm text-gray-400 mt-2">
          <div className="flex gap-3">
            <div
              className="flex items-center gap-1.5"
              title="Vulnerabilities Found"
            >
              <ShieldAlert
                size={14}
                className={
                  scan.findings?.length > 0 ? "text-red-400" : "text-green-400"
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
            className="flex items-center gap-1.5 text-xs text-gray-500"
            title="Scan Date"
          >
            <Calendar size={12} />
            {FORMAT_DATE(scan.createdAt)}
          </div>
        </div>
      </Motion.div>
    </Link>
  );
}
