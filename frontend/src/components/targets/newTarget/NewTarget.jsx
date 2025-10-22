import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion as Motion } from "framer-motion";
import Lottie from "lottie-react";
import Stepper, { Step } from "../../../react-bits/Stepper";
import loadingLottieAnimation from "../../../lottie/Loading - Animation.json";
import SuccessLottieAnimation from "../../../lottie/Success.json";
import AiProcessorLottieAnimation from "../../../lottie/Ai Processor.json";
import { startZapScan, validateTargetURL } from "../../../utils/http";
import useCsrf from "../../../hooks/useCsrf";

import TargetUrl from "./steps/TargetUrl";
import AiContext from "./steps/AiContext";

import VulnerabilityCard from "../VulnerabilityCard";

export default function NewTarget() {
  const [formData, setFormData] = useState({
    targetUrl: "",
    context: { db: [], lang: [], fw: [], os: [], scm: [], ws: [] },
    isChecked: false,
  });
  const [error, setError] = useState("");
  const [scanStage, setScanStage] = useState(null);
  const [scanResult, setScanResult] = useState(null);

  const csrfToken = useCsrf();

  const { mutate: validateMutate, isPending: isPendingValidation } =
    useMutation({
      mutationFn: validateTargetURL,
      onSuccess: (res) => {
        if (res.valid) setError("");
      },
      onError: (err) => {
        console.error(err);
        setError(
          err.message ||
            "Invalid URL. Target URL must be a valid absolute URL with a valid top level domain (TLD) eg. https://example.com"
        );
      },
    });

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
                  "Invalid URL. Target URL must be a valid absolute URL with a valid top level domain (TLD) eg. https://example.com"
              );
              resolve(false);
            }
          },
          onError: (err) => {
            console.error(err);
            setError(
              err.message ||
                "Invalid URL. Target URL must be a valid absolute URL with a valid top level domain (TLD) eg. https://example.com"
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
    startScanMutate(
      { csrfToken, url: formData.targetUrl },
      {
        onSuccess: (data) => {
          setTimeout(() => {
            setScanStage("analyze");
            setTimeout(() => {
              setScanResult(data);
              setScanStage("done");
            }, 2000);
          }, 2500);
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
          stepLabel="Target URL"
          onNext={() => handleUrlValidation(formData.targetUrl)}
          isNextDisabled={!formData.targetUrl.trim() || !formData.isChecked}
          isPending={isPendingValidation}
        >
          <TargetUrl
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

      <div className="flex justify-center">
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
              <p className="text-lg text-primary-200 mt-2 font-medium">
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
              <p className="text-lg text-primary-200 mt-2 font-medium">
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
              <p className="text-xl text-primary-100 text-center font-semibold mb-6">
                Vulnerability Scan Complete{" "}
                <span className="font-bold">
                  ({scanResult?.alerts?.length}){" "}
                </span>
                vulnerabilities found
              </p>

              {scanResult?.alerts?.length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mx-7">
                  {scanResult.alerts.map((alert, i) => (
                    <Motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.2 * i }}
                    >
                      <VulnerabilityCard alert={alert} />
                    </Motion.div>
                  ))}
                  {/* <VulnerabilityCard alert={scanResult.alerts[0]} /> */}
                </div>
              ) : (
                <p className="text-gray-400 text-center">
                  No vulnerabilities found
                </p>
              )}
            </Motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
