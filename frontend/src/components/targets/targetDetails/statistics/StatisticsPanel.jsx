import { useMemo } from "react";
import { motion as Motion } from "framer-motion";
import { ShieldAlert, Bug, Globe, Clock, Hash, Layers } from "lucide-react";
import DonutChart from "./DonutChart";
import BarChart from "./BarChart";
import StatCard from "./StatCard";
import { GET_DURATION } from "../../../../data/constants";

export default function StatisticsPanel({ findings, scan }) {
  const stats = useMemo(() => {
    const uniqueCWEs = new Set(
      findings.filter((f) => f.cweId).map((f) => f.cweId)
    );

    const totalInstances = findings.reduce(
      (sum, f) => sum + (f.instances?.length || 0),
      0
    );

    const severityCounts = findings.reduce((acc, f) => {
      acc[f.severity] = (acc[f.severity] || 0) + 1;
      return acc;
    }, {});

    const cweTable = {};
    findings.forEach((f) => {
      if (f.cweId) {
        if (!cweTable[f.cweId]) {
          cweTable[f.cweId] = { id: f.cweId, name: f.alertName, count: 0 };
        }
        cweTable[f.cweId].count++;
      }
    });

    return {
      total: findings.length,
      uniqueCWEs: uniqueCWEs.size,
      totalInstances,
      severityCounts,
      duration: GET_DURATION(scan?.startedAt, scan?.finishedAt),
      cweTable: Object.values(cweTable).sort((a, b) => b.count - a.count),
    };
  }, [findings, scan]);

  return (
    <div className="space-y-8 p-4 mb-10">
      {/* Section title */}
      <Motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h3 className="text-xl font-bold text-white mb-1">Scan Statistics</h3>
        <p className="text-sm text-white/40">
          Comprehensive overview of vulnerability findings
        </p>
      </Motion.div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={ShieldAlert}
          label="Total Findings"
          value={stats.total}
          color="text-red-400"
          delay={0}
        />
        <StatCard
          icon={Globe}
          label="Affected Endpoints"
          value={stats.totalInstances}
          color="text-blue-400"
          delay={0.1}
        />
        <StatCard
          icon={Hash}
          label="Unique CWEs"
          value={stats.uniqueCWEs}
          color="text-amber-400"
          delay={0.2}
        />
        <StatCard
          icon={Clock}
          label="Scan Duration"
          value={stats.duration || "--"}
          color="text-emerald-400"
          delay={0.3}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut chart */}
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm"
        >
          <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-6 text-center">
            Severity Distribution
          </h4>
          {findings.length > 0 ? (
            <DonutChart findings={findings} />
          ) : (
            <div className="text-center text-white/30 py-12">
              No findings to chart
            </div>
          )}
        </Motion.div>

        {/* Bar chart */}
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm"
        >
          <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-6 text-center">
            Top Vulnerability Categories
          </h4>
          <BarChart findings={findings} />
        </Motion.div>
      </div>

      {/* CWE Table */}
      {stats.cweTable.length > 0 && (
        <Motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm"
        >
          <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Bug size={16} />
            CWE Coverage
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-2 px-3 text-white/40 font-medium text-xs uppercase tracking-wider">
                    CWE ID
                  </th>
                  <th className="text-left py-2 px-3 text-white/40 font-medium text-xs uppercase tracking-wider">
                    Vulnerability
                  </th>
                  <th className="text-right py-2 px-3 text-white/40 font-medium text-xs uppercase tracking-wider">
                    Count
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.cweTable.map((cwe, i) => (
                  <Motion.tr
                    key={cwe.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-white/60 font-mono text-xs">
                        CWE-{cwe.id}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-white/70 max-w-xs truncate">
                      {cwe.name}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="text-white font-bold">{cwe.count}</span>
                    </td>
                  </Motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Motion.div>
      )}

      {/* Severity breakdown mini-cards */}
      <Motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: "High", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
          { label: "Medium", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
          { label: "Low", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
          { label: "Informational", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
        ].map((s) => (
          <div
            key={s.label}
            className={`flex items-center justify-between p-3 rounded-xl ${s.bg} border ${s.border}`}
          >
            <div className="flex items-center gap-2">
              <Layers size={14} className={s.color} />
              <span className={`text-xs font-medium ${s.color}`}>{s.label}</span>
            </div>
            <span className="text-white font-bold text-sm">
              {stats.severityCounts[s.label] || 0}
            </span>
          </div>
        ))}
      </Motion.div>
    </div>
  );
}
