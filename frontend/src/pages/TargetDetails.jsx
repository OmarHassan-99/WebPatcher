import { AnimatePresence, motion as Motion } from "framer-motion";
import Lottie from "lottie-react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useCsrf from "../hooks/useCsrf";

import loadingLottieAnimation from "../lottie/Loading - Animation.json";
import SuccessLottieAnimation from "../lottie/Success.json";
import AiProcessorLottieAnimation from "../lottie/Ai Processor.json";
import ErrorLottieAnimation from "../lottie/Error Occurred!.json";

import VulnerabilityDashboard from "../components/targets/VulnerabilityDashboard";
import { getFindings } from "../utils/http/zap";
import { FADE_VARIANTS } from "../data/constants";
import { AlertTriangle, ArrowLeft } from "lucide-react";

function StageView({
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

export default function TargetDetailsPage({ scanStage, scanResult }) {
  const { targetId } = useParams();
  const csrfToken = useCsrf();

  const { data, isPending, error } = useQuery({
    queryKey: ["scans", targetId],
    queryFn: () => getFindings({ csrfToken, scanId: targetId }),
    enabled: !!targetId,
    retry: false,
    refetchInterval: (query) => {
      if (query.state.error) return false;
      const status = query.state.data?.status;
      return status === "running" || status === "queued" ? 3000 : false;
    },
  });

  const status = data?.status; // "queued", "running", "completed", "failed"
  const findings = data?.findings || scanResult || [];

  return (
    <div className="text-white flex justify-center items-center">
      <AnimatePresence mode="wait">
        {/* 1. LOADING (Initial Fetch) */}
        {((isPending && !scanStage) || scanStage === "scan") && (
          <StageView
            key="loading"
            animation={loadingLottieAnimation}
            text={
              scanStage === "scan"
                ? "Scanning target for vulnerabilities…"
                : "Retrieving historical data..."
            }
            subtext={
              scanStage === "scan" &&
              "You can leave this page. The scan will continue in the background."
            }
            extraMargin
          />
        )}

        {/* 2. ERROR STATE */}
        {error && (
          <Motion.div
            key="error"
            variants={FADE_VARIANTS}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4"
          >
            <div className="p-4 bg-red-500/10 rounded-full">
              <AlertTriangle className="w-16 h-16 text-red-500" />
            </div>
            <h2 className="text-3xl font-bold">Target Not Found</h2>
            <p className="text-gray-400 max-w-md">
              The scan you are looking for does not exist or has been deleted.
              Please check the URL or return to the list.
            </p>

            <Link
              to="/targets"
              className="mt-4 px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-full transition flex items-center gap-2 font-medium"
            >
              <ArrowLeft size={18} />
              Back to Targets
            </Link>
          </Motion.div>
        )}

        {/* 3. RUNNING / QUEUED STATE */}
        {(scanStage === "analyze" ||
          status === "running" ||
          status === "queued") && (
          <StageView
            key="running"
            animation={
              status === "queued"
                ? loadingLottieAnimation
                : AiProcessorLottieAnimation
            }
            text={
              status === "queued"
                ? "Scan is in queue..."
                : "Analyzing and classifying results…"
            }
            noMargin={status === "queued" ? false : true}
          />
        )}

        {/* 4. FAILED STATE */}
        {status === "failed" && (
          <StageView
            key="failed"
            animation={ErrorLottieAnimation}
            text="Target Scan Failed"
            subtext="Something went wrong during the scanning process."
            failed
            loop={false}
            noPulse
            extraMargin
          />
        )}

        {/* 5. COMPLETED STATE (Success + Dashboard) */}
        {((status === "completed" && !isPending) || scanStage === "done") && (
          <Motion.div
            key="completed"
            variants={FADE_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-col w-full"
          >
            <div className="flex flex-col items-center">
              <Lottie
                animationData={SuccessLottieAnimation}
                className="h-32"
                loop={false}
              />
              <h2 className="text-2xl font-bold mb-1">Scan Complete</h2>
              <p className="text-gray-300">
                Found{" "}
                <span className="font-bold text-red-400">
                  {findings.length}
                </span>{" "}
                potential vulnerabilities
              </p>
            </div>

            {/* Dashboard */}
            <VulnerabilityDashboard findings={findings} />
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
