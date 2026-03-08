import { motion as Motion } from "framer-motion";

export default function CustomProfileButton({ handleClick, label, isActive }) {
  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative px-4 py-2 text-surface-400 hover:text-white font-medium cursor-pointer"
    >
      {label}

      {isActive && (
        <Motion.div
          layoutId="profile-tab-indicator"
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 rounded-full"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  );
}
