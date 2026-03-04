import { useState, useCallback, useRef } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import Lottie from "lottie-react";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Link, useParams, useLocation } from "react-router-dom";
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
import CountUp from "../react-bits/CountUp";

export default function TargetDetailsPage() {
  const { targetId } = useParams();
  const { state } = useLocation();
  const fromNewTarget = state?.fromNewTarget ?? false;
  const csrfToken = useCsrf();

  const [activeTab, setActiveTab] = useState("vulnerabilities");
  const [recsCount, setRecsCount] = useState(null);

  const [transitionComplete, setTransitionComplete] = useState(false);

  // Tracks if the scan was actively running while the user was on this page
  const wasRunningRef = useRef(false);

  const handleCountReady = useCallback((n) => setRecsCount(n), []);

  const { data, isPending, error } = useQuery({
    queryKey: ["scans", targetId],
    queryFn: () => getFindings({ csrfToken, scanId: targetId }),
    enabled: !!targetId,
    retry: false,
  });

  const status = data?.status;
  const findings = data?.findings || [];

  // If the status is not completed or failed, record that we saw it running
  if (status && !["completed", "failed"].includes(status)) {
    wasRunningRef.current = true;
  }

  // We consider it "loaded as completed" ONLY if we clicked it from the history list
  // and it was already finished, meaning it never ran in front of us.
  const loadedAsCompleted =
    status &&
    ["completed", "failed"].includes(status) &&
    !wasRunningRef.current &&
    !fromNewTarget;

  // Show the dashboard if it was an old scan, OR if the live scan finished its 5s transition
  const showDashboard = loadedAsCompleted || transitionComplete;

  const isHistoryLoading = isPending && !fromNewTarget;
  const showProgressPanel = !showDashboard && !error && !isHistoryLoading;

  return (
    <div className="text-white flex justify-center items-center w-full">
      <AnimatePresence mode="wait">
        {/* 1. INITIAL LOADING (Only for history views) */}
        {isHistoryLoading && (
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
            </p>
            <Link
              to="/targets"
              className="mt-4 px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-full transition flex items-center gap-2 font-medium"
            >
              <ArrowLeft size={18} /> Back to Targets
            </Link>
          </Motion.div>
        )}

        {/* 3. LIVE SCAN PROGRESS PANEL */}
        {showProgressPanel && (
          <Motion.div
            key="live-scan"
            variants={FADE_VARIANTS}
            initial="hidden"
            animate="visible"
            className="flex justify-center py-12 w-full"
          >
            <ScanProgressPanel
              scanJobId={targetId}
              initialStatus={status || "queued"}
              onCompleteRedirect={() => setTransitionComplete(true)}
            />
          </Motion.div>
        )}

        {/* 4. FINAL DASHBOARD */}
        {showDashboard && (
          <Motion.div
            key="dashboard"
            variants={FADE_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`flex flex-col w-full ${!fromNewTarget && "mt-8"}`}
          >
            {status === "failed" ? (
              <StageView
                animation={ErrorLottieAnimation}
                text="Target Scan Failed"
                subtext="Something went wrong during the scanning process."
                failed
                loop={false}
                noPulse
              />
            ) : (
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
                    <CountUp
                      from={0}
                      to={findings.length}
                      className="font-bold text-red-400"
                    />
                  </span>{" "}
                  potential vulnerabilities
                </p>
              </div>
            )}

            <div className="relative flex items-center justify-center mt-6 mb-2 px-4">
              <Link
                to="/targets"
                className="group absolute left-[23.5%] inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/20 backdrop-blur-sm shadow-inner transition-all duration-300 hover:shadow-[0_0_16px_-4px_rgba(255,255,255,0.15)]"
              >
                <ArrowLeft
                  size={15}
                  className="transition-transform duration-300 group-hover:-translate-x-1"
                />
                Back to Targets
              </Link>

              {/* Tabs */}
              <div className="inline-flex gap-1 p-1 rounded-2xl bg-transparent backdrop-blur-md border border-white/8 shadow-xl">
                <TabSwitcher
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  vulnsCount={findings.length}
                  recsCount={recsCount}
                />
              </div>
            </div>

            {/* Tab panels */}
            <AnimatePresence mode={recsCount > 0 ? "popLayout" : "wait"}>
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
