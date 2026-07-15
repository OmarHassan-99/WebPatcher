import { motion as Motion } from "framer-motion";
import { useMemo } from "react";

const BAR_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#22c55e", "#3b82f6",
  "#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6", "#6366f1",
];

export default function BarChart({ findings }) {
  const categories = useMemo(() => {
    const map = {};
    findings.forEach((f) => {
      map[f.alertName] = (map[f.alertName] || 0) + (f.instances?.length || 1);
    });

    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count], i) => ({
        name,
        count,
        color: BAR_COLORS[i % BAR_COLORS.length],
      }));
  }, [findings]);

  const maxCount = Math.max(...categories.map((c) => c.count), 1);

  if (categories.length === 0) {
    return (
      <div className="text-center text-white/30 text-sm py-8">
        No vulnerability categories to display
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {categories.map((cat, i) => (
        <Motion.div
          key={cat.name}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
          className="group"
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-xs text-white/70 font-medium truncate max-w-[260px] group-hover:text-white/90 transition-colors"
              title={cat.name}
            >
              {cat.name}
            </span>
            <span className="text-xs font-bold text-white/50 tabular-nums ml-2">
              {cat.count}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <Motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: cat.color }}
              initial={{ width: 0 }}
              animate={{ width: `${(cat.count / maxCount) * 100}%` }}
              transition={{
                delay: i * 0.08 + 0.2,
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          </div>
        </Motion.div>
      ))}
    </div>
  );
}
