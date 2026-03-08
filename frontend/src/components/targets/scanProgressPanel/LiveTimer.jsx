import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function LiveTimer({ isDone, isError }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (isDone || isError) return;
    const interval = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, [isDone, isError]);

  const mins = Math.floor(elapsed / 60)
    .toString()
    .padStart(2, "0");
  const secs = (elapsed % 60).toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-1.5 text-violet-300 bg-violet-900/20 px-2.5 py-1 rounded-lg border border-violet-500/20 font-mono text-xs shadow-[0_0_10px_-2px_rgba(139,92,246,0.25)] transition-colors duration-300">
      <Clock
        size={12}
        className={
          !isDone && !isError
            ? "animate-pulse text-violet-400"
            : "text-white/30"
        }
      />
      <span className={isDone || isError ? "text-white/30" : "text-violet-300"}>
        {mins}:{secs}
      </span>
    </div>
  );
}
