import { motion as Motion } from "framer-motion";

export default function ProgressBar({ percent }) {
  if (percent === null || percent === undefined) return null;
  return (
    <div className="h-[3px] w-full rounded-full bg-white/6 overflow-hidden">
      <Motion.div
        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400"
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}
