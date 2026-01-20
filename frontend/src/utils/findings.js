import { SEVERITY_ORDER } from "../data/constants";

export default function computeGroupedFindings(findings, sortOption) {
  const groups = {};

  findings.forEach((f) => {
    if (!groups[f.pluginId]) {
      groups[f.pluginId] = { ...f, count: 0, instances: [] };
    }

    groups[f.pluginId].count++;
    groups[f.pluginId].instances.push(...f.instances);
  });

  let result = Object.values(groups);

  if (sortOption === "asc") {
    result.sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    );
  } else if (sortOption === "desc") {
    result.sort(
      (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity],
    );
  }

  return result;
}
