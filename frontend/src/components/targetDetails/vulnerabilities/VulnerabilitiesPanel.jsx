import { useMemo, useState } from "react";
import FindingRow from "./FindingRow";
import { motion as Motion } from "motion/react";
import { ShieldAlert } from "lucide-react";
import { RISK_COLORS } from "../../../data/constants";
import computeGroupedFindings from "../../../utils/findings";
import Filters from "./Filters";

export default function VulnerabilitiesPanel({ findings }) {
  const [filters, setFilters] = useState({
    severityFilter: "All",
    sortOption: "None",
    expandAll: false,
  });

  const groupedFindings = useMemo(() => {
    let data = [...findings];

    if (filters.severityFilter !== "All") {
      data = data.filter((f) => f.severity === filters.severityFilter);
    }

    return computeGroupedFindings(data, filters.sortOption);
  }, [findings, filters]);

  const summary = useMemo(() => {
    return findings.reduce((acc, f) => {
      acc[f.severity] = (acc[f.severity] ?? 0) + 1;
      return acc;
    }, {});
  }, [findings]);

  return (
    <div className="space-y-6 p-4 mb-10">
      <Filters filters={filters} setFilters={setFilters} />

      <div className="flex flex-wrap gap-4 justify-center text-sm">
        <span className="px-3 py-1 rounded-full border border-gray-600 bg-gray-800 text-gray-300 font-medium">
          Total: {findings.length}
        </span>

        {Object.entries(summary).map(([sev, count]) => (
          <span
            key={sev}
            className={`px-3 py-1 rounded-full border font-medium ${RISK_COLORS[sev]}`}
          >
            {sev}: {count}
          </span>
        ))}
      </div>

      <div className="space-y-4">
        {groupedFindings.map((f, index) => (
          <FindingRow
            key={f.pluginId}
            finding={f}
            forceOpen={filters.expandAll}
            index={index}
          />
        ))}

        {groupedFindings.length === 0 && (
          <Motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring" }}
            className="text-center py-20"
          >
            <ShieldAlert className="size-16 mx-auto mb-4 text-gray-500" />
            <h3 className="text-xl font-medium opacity-50">
              No findings match your filters
            </h3>
          </Motion.div>
        )}
      </div>
    </div>
  );
}
