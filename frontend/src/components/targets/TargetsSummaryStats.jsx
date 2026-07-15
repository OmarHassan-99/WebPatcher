import { motion as Motion } from "framer-motion";
import { ShieldAlert, Target, CheckCircle2, XCircle } from "lucide-react";
import CountUp from "../../react-bits/CountUp";

export default function TargetsSummaryStats({ scans }) {
  if (!scans || scans.length === 0) return null;

  const stats = scans.reduce(
    (acc, scan) => {
      acc.total++;
      if (scan.status === "completed") acc.completed++;
      if (scan.status === "failed") acc.failed++;
      acc.vulns += scan.findingsCount || 0;
      return acc;
    },
    { total: 0, completed: 0, failed: 0, vulns: 0 }
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {[
        { label: "Total Scans", value: stats.total, icon: Target, color: "text-blue-400", bg: "bg-blue-500/10" },
        { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
        { label: "Failed", value: stats.failed, icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
        { label: "Vulnerabilities", value: stats.vulns, icon: ShieldAlert, color: "text-amber-400", bg: "bg-amber-500/10" },
      ].map((stat, i) => {
        const Icon = stat.icon;
        return (
          <Motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm"
          >
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <Icon size={20} />
            </div>
            <div>
              <div className="text-xl font-bold text-white tabular-nums">
                <CountUp from={0} to={stat.value} />
              </div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider font-medium">
                {stat.label}
              </div>
            </div>
          </Motion.div>
        );
      })}
    </div>
  );
}
