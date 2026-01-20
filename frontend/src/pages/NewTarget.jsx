import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Stepper, { Step } from "../react-bits/Stepper";
import { startZapScan, validateTargetURL } from "../utils/http/zap";
import { queryClient } from "../utils/http/userAuth";
import useCsrf from "../hooks/useCsrf";

import TargetAndRepoURLs from "../components/targets/newTarget/steps/Target&RepoURLs";
import AiContext from "../components/targets/newTarget/steps/AiContext";
import TargetDetailsPage from "./TargetDetails";

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
                  "Invalid URL. Must be a valid public absolute URL (e.g. https://example.com or http://localhost)",
              );
              resolve(false);
            }
          },
          onError: (err) => {
            console.error(err);
            setError(
              err.message ||
                "Invalid URL. Must be a valid public absolute URL (e.g. https://example.com or http://localhost)",
            );
            resolve(false);
          },
        },
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
      },
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
          },
    );
  }

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

      {scanStage !== null && (
        <TargetDetailsPage scanStage={scanStage} scanResult={scanResult} />
      )}
    </div>
  );
}
