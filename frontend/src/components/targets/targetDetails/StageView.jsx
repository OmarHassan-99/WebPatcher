import Lottie from "lottie-react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { motion as Motion } from "motion/react";
import { FADE_VARIANTS } from "../../../data/constants";

export default function StageView({
  animation,
  text,
  subtext,
  failed,
  loop = true,
  noPulse,
  extraMargin,
  noMargin,
}) {
  return (
    <Motion.div
      variants={FADE_VARIANTS}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`flex flex-col items-center ${extraMargin && "mt-8"}`}
    >
      <Lottie animationData={animation} className="h-56" loop={loop} autoplay />
      <p
        className={`text-xl ${noMargin ? "" : "mt-4"} font-semibold ${noPulse ? "" : "animate-pulse"} text-primary-100 text-center`}
      >
        {text}
      </p>
      {subtext && <p className="text-gray-400 mt-2 text-sm">{subtext}</p>}
      {failed && (
        <Link
          to="/targets"
          className="mt-4 px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-full transition flex items-center gap-2 font-medium"
        >
          <ArrowLeft size={18} />
          Back to Targets
        </Link>
      )}
    </Motion.div>
  );
}
