// export default function CustomProfileButton({ handleClick, label, isActive }) {
//   return (
//     <button
//       type="button"
//       onClick={handleClick}
//       className={`hover:text-primary-100 font-medium cursor-pointer ${
//         isActive
//           ? "border-b-2 border-primary-100 text-primary-100"
//           : "text-primary-200"
//       }`}
//     >
//       {label}
//     </button>
//   );
// }

import { motion as Motion } from "framer-motion";

export default function CustomProfileButton({ handleClick, label, isActive }) {
  return (
    <button
      type="button"
      onClick={handleClick}
      className="relative px-4 py-2 text-primary-200 hover:text-primary-100 font-medium cursor-pointer"
    >
      {label}

      {isActive && (
        <Motion.div
          layoutId="profile-tab-indicator"
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary-400 rounded-full"
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </button>
  );
}
