import { motion as Motion } from "framer-motion";
import { useMemo, useState } from "react";

const SEVERITY_COLORS = {
  High: { fill: "#ef4444", glow: "rgba(239,68,68,0.3)" },
  Medium: { fill: "#f59e0b", glow: "rgba(245,158,11,0.3)" },
  Low: { fill: "#eab308", glow: "rgba(234,179,8,0.3)" },
  Informational: { fill: "#3b82f6", glow: "rgba(59,130,246,0.3)" },
};

const SEVERITY_ORDER = ["High", "Medium", "Low", "Informational"];

export default function DonutChart({ findings }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const data = useMemo(() => {
    const counts = {};
    findings.forEach((f) => {
      counts[f.severity] = (counts[f.severity] || 0) + 1;
    });

    return SEVERITY_ORDER.filter((s) => counts[s])
      .map((s) => ({
        label: s,
        value: counts[s],
        color: SEVERITY_COLORS[s].fill,
        glow: SEVERITY_COLORS[s].glow,
      }));
  }, [findings]);

  const total = findings.length;
  const size = 200;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate segments
  let accumulated = 0;
  const segments = data.map((d) => {
    const pct = d.value / total;
    const offset = circumference * (1 - accumulated) + circumference * 0.25;
    accumulated += pct;
    return {
      ...d,
      pct,
      dashArray: `${circumference * pct} ${circumference * (1 - pct)}`,
      dashOffset: offset,
    };
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-white/5"
          />
          {/* Segments */}
          {segments.map((seg, i) => (
            <Motion.circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={hoveredIdx === i ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={seg.dashArray}
              strokeDashoffset={seg.dashOffset}
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                cursor: "pointer",
                filter: hoveredIdx === i ? `drop-shadow(0 0 8px ${seg.glow})` : "none",
                transition: "stroke-width 0.2s, filter 0.2s",
              }}
            />
          ))}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{total}</span>
          <span className="text-[10px] uppercase tracking-widest text-white/40">
            findings
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        {segments.map((seg, i) => (
          <Motion.div
            key={seg.label}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-default transition-all duration-200 ${
              hoveredIdx === i
                ? "bg-white/10 border-white/20 scale-105"
                : "bg-white/5 border-white/5"
            }`}
          >
            <div
              className="size-2.5 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-white/70">{seg.label}</span>
            <span className="text-white font-bold">{seg.value}</span>
          </Motion.div>
        ))}
      </div>
    </div>
  );
}
