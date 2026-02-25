import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import Stepper, { Step } from "../react-bits/Stepper";
import {
  startZapScan,
  validateTargetAndRepoURLs,
  getFindings,
} from "../utils/http/zap";
import useCsrf from "../hooks/useCsrf";
import { useScanProgress } from "../hooks/useScanProgress";
import TargetAndRepoURLs from "../components/targets/newTarget/Target&RepoURLs";
import AiContext from "../components/targets/newTarget/AiContext";
import ScanProgressPanel from "../components/targets/newTarget/scanProgressPanel/ScanProgressPanel";
import TargetDetailsPage from "./TargetDetails";

const GITHUB_INSTALL_URL =
  "https://github.com/apps/webpatcher-ai-powered-assistant/installations/new";

export default function NewTargetPage() {
  const [formData, setFormData] = useState({
    targetUrl: "",
    githubRepoUrl: "",
    targetName: "",
    context: { db: [], lang: [], fw: [], os: [], scm: [], ws: [] },
    isChecked: false,
  });
  const [error, setError] = useState({ targetUrl: "", githubRepoUrl: "" });
  const [isAnimatePulse, setIsAnimatePulse] = useState(true);
  const [activeScanJobId, setActiveScanJobId] = useState(null);

  const csrfToken = useCsrf();

  const { mutateAsync: validateMutate, isPending: isPendingValidation } =
    useMutation({ mutationFn: validateTargetAndRepoURLs });

  async function handleUrlsValidation() {
    setError({ targetUrl: "", githubRepoUrl: "" });
    setIsAnimatePulse(true);

    try {
      await validateMutate({
        csrfToken,
        targetURL: formData.targetUrl,
        githubRepoUrl: formData.githubRepoUrl,
      });
      return true;
    } catch (err) {
      if (err.isValidationError) {
        const newErrors = { ...err.errors };

        if (newErrors.githubRepoUrl?.includes("not found")) {
          setIsAnimatePulse(false);
          newErrors.githubRepoUrl = (
            <span className="flex flex-col items-start gap-2">
              <span>{newErrors.githubRepoUrl}</span>
              <a
                href={GITHUB_INSTALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white underline hover:text-primary-300 duration-500 font-bold flex items-center gap-1"
              >
                Click here to grant WebPatcher access
                <ExternalLink className="size-4" />
              </a>
            </span>
          );
        }

        setError(newErrors);
      } else {
        setError({ targetUrl: err.message, githubRepoUrl: err.message });
      }
      return false;
    }
  }

  const { mutate: startScanMutate } = useMutation({ mutationFn: startZapScan });

  const progress = useScanProgress(activeScanJobId);

  const [minLoadingTimeElapsed, setMinLoadingTimeElapsed] = useState(false);

  useEffect(() => {
    if (progress.isDone) {
      const timer = setTimeout(() => {
        setMinLoadingTimeElapsed(true);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setMinLoadingTimeElapsed(false); // Reset if a new scan starts
    }
  }, [progress.isDone]);

  // Fetch findings once the WS signals the scan is fully done
  const { data: findings } = useQuery({
    queryKey: ["scans", activeScanJobId],
    queryFn: () => getFindings({ csrfToken, scanId: activeScanJobId }),
    enabled: !!activeScanJobId && progress.isDone,
    retry: false,
  });

  const isShowingResults =
    progress.isDone && findings !== undefined && minLoadingTimeElapsed;

  const isLoadingResults = progress.isDone && !isShowingResults;

  function handleStartScan() {
    startScanMutate(
      {
        csrfToken,
        url: formData.targetUrl,
        targetName: formData.targetName,
        githubRepoUrl: formData.githubRepoUrl,
        context: formData.context,
      },
      {
        onSuccess: (data) => {
          setActiveScanJobId(data.scanJobId);
        },
        onError: (err) => {
          console.error("Scan failed:", err);
          setError({ targetUrl: "Failed to start scan", githubRepoUrl: "" });
          setActiveScanJobId(null);
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
    <div className="text-white overflow-hidden">
      <Stepper
        stepContainerClassName={activeScanJobId !== null ? "hidden" : ""}
        onFinalStepCompleted={() => {
          setActiveScanJobId("pending");
          handleStartScan();
        }}
      >
        <Step
          stepLabel="Target & Repo URLs"
          onNext={handleUrlsValidation}
          isNextDisabled={!formData.targetUrl.trim() || !formData.isChecked}
          isPending={isPendingValidation}
        >
          <TargetAndRepoURLs
            formData={formData}
            updateField={updateField}
            error={error}
            setError={setError}
            isAnimatePulse={isAnimatePulse}
          />
        </Step>

        <Step stepLabel="AI Context">
          <AiContext formData={formData} updateAiContext={updateAiContext} />
        </Step>
      </Stepper>

      {activeScanJobId !== null && !isShowingResults && (
        <div className="flex justify-center py-6">
          <ScanProgressPanel
            scanJobId={activeScanJobId}
            isLoadingResults={isLoadingResults}
          />
        </div>
      )}

      {isShowingResults && (
        <TargetDetailsPage
          fromNewTargetPage={true}
          scanResult={findings?.findings ?? []}
          scanId={activeScanJobId}
        />
      )}
    </div>
  );
}
