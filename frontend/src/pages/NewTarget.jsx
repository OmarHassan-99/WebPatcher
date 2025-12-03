import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion as Motion } from "framer-motion";
import Lottie from "lottie-react";
import Stepper, { Step } from "../react-bits/Stepper";
import loadingLottieAnimation from "../lottie/Loading - Animation.json";
import SuccessLottieAnimation from "../lottie/Success.json";
import AiProcessorLottieAnimation from "../lottie/Ai Processor.json";
import { startZapScan, validateTargetURL } from "../utils/http/zap";
import useCsrf from "../hooks/useCsrf";

import TargetAndRepoURLs from "../components/targets/newTarget/steps/Target&RepoURLs";
import AiContext from "../components/targets/newTarget/steps/AiContext";

import VulnerabilityDashboard from "../components/targets/VulnerabilityDashboard";
import { queryClient } from "../utils/http/userAuth";

export default function NewTargetPage() {
  const [formData, setFormData] = useState({
    targetUrl: "",
    githubRepoUrl: "",
    targetName: "",
    context: { db: [], lang: [], fw: [], os: [], scm: [], ws: [] },
    isChecked: false,
  });
  const [error, setError] = useState("");
  const [scanStage, setScanStage] = useState(null);
  const [scanResult, setScanResult] = useState(null);

  const csrfToken = useCsrf();

  const { mutate: validateMutate, isPending: isPendingValidation } =
    useMutation({ mutationFn: validateTargetURL });

  function handleUrlValidation(targetURL) {
    return new Promise((resolve) => {
      validateMutate(
        { csrfToken, targetURL },
        {
          onSuccess: (res) => {
            if (res.valid) {
              setError("");
              resolve(true);
            } else {
              setError(
                res.message ||
                  "Invalid URL. Must be a valid public absolute URL (e.g. https://example.com or http://localhost)"
              );
              resolve(false);
            }
          },
          onError: (err) => {
            console.error(err);
            setError(
              err.message ||
                "Invalid URL. Must be a valid public absolute URL (e.g. https://example.com or http://localhost)"
            );
            resolve(false);
          },
        }
      );
    });
  }

  const { mutate: startScanMutate } = useMutation({ mutationFn: startZapScan });

  function handleStartScan() {
    setScanStage("scan");
    queryClient.resetQueries({ queryKey: ["scans"] });
    startScanMutate(
      { csrfToken, url: formData.targetUrl, targetName: formData.targetName },
      {
        onSuccess: (data) => {
          setScanStage("analyze");
          setTimeout(() => {
            setScanResult(data);
            queryClient.resetQueries({ queryKey: ["scans"] });
            setScanStage("done");
          }, 3500);
        },
        onError: (err) => {
          console.error("Scan failed:", err);
          setError("Failed to start scan");
          setScanStage(null);
        },
      }
    );
  }

  function updateField(name, value) {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function updateAiContext(name, value) {
    setFormData((prev) =>
      prev.context[name].includes(value)
        ? {
            ...prev,
            context: {
              ...prev.context,
              [name]: prev.context[name].filter((item) => item !== value),
            },
          }
        : {
            ...prev,
            context: {
              ...prev.context,
              [name]: [...prev.context[name], value],
            },
          }
    );
  }

  const fadeVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
  };

  return (
    <div className="text-white">
      <Stepper
        stepContainerClassName={`${scanStage !== null ? "hidden" : ""}`}
        onFinalStepCompleted={handleStartScan}
      >
        <Step
          stepLabel="Target & Repo URLs"
          onNext={() => handleUrlValidation(formData.targetUrl)}
          isNextDisabled={!formData.targetUrl.trim() || !formData.isChecked}
          isPending={isPendingValidation}
        >
          <TargetAndRepoURLs
            formData={formData}
            updateField={updateField}
            error={error}
            setError={setError}
          />
        </Step>

        <Step stepLabel="AI Context">
          <AiContext formData={formData} updateAiContext={updateAiContext} />
        </Step>
      </Stepper>

      <div className="flex justify-center items-center">
        <AnimatePresence mode="wait">
          {scanStage === "scan" && (
            <Motion.div
              key="scan"
              variants={fadeVariant}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col"
            >
              <Lottie
                animationData={loadingLottieAnimation}
                className="h-56"
                loop
                autoplay
              />
              <p className="text-lg mt-2 font-medium animate-pulse">
                Scanning target for vulnerabilities…
              </p>
            </Motion.div>
          )}

          {scanStage === "analyze" && (
            <Motion.div
              key="analyze"
              variants={fadeVariant}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col items-center"
            >
              <Lottie
                animationData={AiProcessorLottieAnimation}
                className="h-56"
                loop
                autoplay
              />
              <p className="text-lg mt-2 font-medium animate-pulse">
                Analyzing and classifying results…
              </p>
            </Motion.div>
          )}

          {scanStage === "done" && (
            <Motion.div
              key="done"
              variants={fadeVariant}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col w-full"
            >
              <Lottie
                animationData={SuccessLottieAnimation}
                className="h-48"
                loop={false}
              />
              <p className="text-xl text-center font-semibold mb-6">
                Vulnerability Scan Complete{" "}
                <span className="font-bold">({scanResult?.length}) </span>
                vulnerabilities found
              </p>

              {scanResult && <VulnerabilityDashboard findings={scanResult} />}
            </Motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
