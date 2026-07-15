import { motion as Motion } from "framer-motion";
import CountUp from "../../../../react-bits/CountUp";

export default function StatCard({ icon: Icon, label, value, suffix = "", color = "text-primary-200", delay = 0 }) {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300"
    >
      <div className={`p-2.5 rounded-xl bg-white/5 ${color}`}>
        <Icon size={20} />
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-white tabular-nums">
          {typeof value === "number" ? (
            <>
              <CountUp from={0} to={value} />
              {suffix && <span className="text-sm text-white/40 ml-0.5">{suffix}</span>}
            </>
          ) : (
            <span>{value}{suffix}</span>
          )}
        </div>
        <p className="text-[10px] text-white/35 uppercase tracking-widest mt-1 font-medium">
          {label}
        </p>
      </div>
    </Motion.div>
  );
}
