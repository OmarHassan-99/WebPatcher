import { useState, useCallback } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import Lottie from "lottie-react";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useCsrf from "../hooks/useCsrf";
import { getFindings } from "../utils/http/zap";
import { FADE_VARIANTS } from "../data/constants";
import loadingLottieAnimation from "../lottie/Loading - Animation.json";
import SuccessLottieAnimation from "../lottie/Success.json";
import ErrorLottieAnimation from "../lottie/Error Occurred!.json";
import StageView from "../components/targetDetails/StageView";
import VulnerabilitiesPanel from "../components/targetDetails/vulnerabilities/VulnerabilitiesPanel";
import RecommendationsPanel from "../components/targetDetails/recommendations/RecommendationsPanel";
import TabSwitcher from "../components/targetDetails/TabSwitcher";
import ScanProgressPanel from "../components/targets/newTarget/scanProgressPanel/ScanProgressPanel";

export default function TargetDetailsPage({
  fromNewTargetPage,
  scanResult,
  scanId,
}) {
  const { targetId: targetIdParam } = useParams();
  const csrfToken = useCsrf();
  const [activeTab, setActiveTab] = useState("vulnerabilities");
  const [recsCount, setRecsCount] = useState(null);

  const targetId = targetIdParam ?? scanId;

  const handleCountReady = useCallback((n) => setRecsCount(n), []);

  const { data, isPending, error } = useQuery({
    queryKey: ["scans", targetId],
    queryFn: () => getFindings({ csrfToken, scanId: targetId }),
    enabled: !!targetId,
    retry: false,
  });

  const status = data?.status;
  const findings = data?.findings || scanResult || [];

  return (
    <div className="text-white flex justify-center items-center">
      <AnimatePresence mode="wait">
        {/* 1. LOADING (Initial Fetch) */}
        {isPending && !fromNewTargetPage && (
          <StageView
            key="loading"
            animation={loadingLottieAnimation}
            text="Retrieving historical data..."
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
              <AlertTriangle className="size-16 text-red-500" />
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

        {(status === "running" ||
          status === "analyzing" ||
          status === "patching" ||
          status === "queued") && (
          <Motion.div
            key="running"
            variants={FADE_VARIANTS}
            initial="hidden"
            animate="visible"
            className="flex justify-center py-12"
          >
            {status === "queued" ? (
              <StageView
                animation={loadingLottieAnimation}
                text="Scan is in queue…"
                extraMargin
              />
            ) : (
              <ScanProgressPanel scanJobId={targetId} initialStatus={status} />
            )}
          </Motion.div>
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

        {/* 5. COMPLETED STATE */}
        {((status === "completed" && !isPending) || fromNewTargetPage) && (
          <Motion.div
            key="completed"
            variants={FADE_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`flex flex-col w-full ${!fromNewTargetPage && "mt-8"}`}
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

            <div className="grid grid-cols-3 items-center w-full mt-6 mb-4 px-4">
              <div className="flex justify-start">
                <Link
                  to="/targets"
                  className="group inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 transition-all"
                >
                  <ArrowLeft
                    size={15}
                    className="transition-transform group-hover:-translate-x-1"
                  />
                  <span className="hidden sm:inline">Back to Targets</span>
                </Link>
              </div>

              {/* Tabs */}
              <div className="flex justify-center">
                <div className="inline-flex gap-1 p-1 rounded-2xl bg-black/20 backdrop-blur-md border border-white/10 shadow-xl">
                  <TabSwitcher
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    recsCount={recsCount}
                  />
                </div>
              </div>

              <div className="flex justify-end"></div>
            </div>

            {/* Tab panels */}
            <AnimatePresence mode="wait">
              {activeTab === "vulnerabilities" ? (
                <Motion.div
                  key="vulnerabilities"
                  variants={FADE_VARIANTS}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <VulnerabilitiesPanel findings={findings} />
                </Motion.div>
              ) : (
                <Motion.div
                  key="recommendations"
                  variants={FADE_VARIANTS}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="py-6 px-4"
                >
                  <RecommendationsPanel
                    scanId={targetId}
                    csrfToken={csrfToken}
                    onCountReady={handleCountReady}
                  />
                </Motion.div>
              )}
            </AnimatePresence>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
