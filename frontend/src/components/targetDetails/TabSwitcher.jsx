import { motion as Motion } from "framer-motion";
import { TABS } from "../../data/constants";

export default function TabSwitcher({
  activeTab,
  setActiveTab,
  vulnsCount,
  recsCount,
}) {
  return TABS.map(({ id, label, icon }) => {
    const TabIcon = icon;
    const isActive = activeTab === id;
    const count = id === "recommendations" ? recsCount : vulnsCount;
    return (
      <Motion.button
        layout
        key={id}
        onClick={() => setActiveTab(id)}
        className="relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors duration-200 z-0 group"
      >
        {/* Animated pill indicator */}
        {isActive && (
          <Motion.span
            layoutId="tab-indicator"
            className="absolute inset-0 rounded-xl bg-white/10 border border-white/12"
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 30,
            }}
          />
        )}

        <TabIcon
          size={16}
          className={`transition-colors ${
            isActive
              ? "text-primary-100"
              : "text-gray-500 group-hover:text-white transition-colors duration-300"
          }`}
        />
        <span
          className={`transition-colors ${
            isActive
              ? "text-white"
              : "text-gray-400 group-hover:text-white transition-colors duration-300"
          }`}
        >
          {label}
        </span>

        {/* Live count badge */}
        {count !== null && (
          <Motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              delay: count === vulnsCount ? 0.6 : 0,
            }}
            className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${
              isActive
                ? "bg-primary-100 text-primary-500 border border-primary-500/40"
                : "bg-gray-700 text-gray-400 group-hover:text-white transition-colors duration-300"
            }`}
          >
            {count}
          </Motion.span>
        )}
      </Motion.button>
    );
  });
}
