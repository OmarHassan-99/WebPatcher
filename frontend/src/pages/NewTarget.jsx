import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import Stepper, { Step } from "../react-bits/Stepper";
import { startZapScan, validateTargetAndRepoURLs } from "../utils/http/zap";
import useCsrf from "../hooks/useCsrf";
import TargetAndRepoURLs from "../components/targets/newTarget/Target&RepoURLs";
import AiContext from "../components/targets/newTarget/AiContext";

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

  const navigate = useNavigate();

  const csrfToken = useCsrf();

  const { mutateAsync: validateMutate, isPending: isPendingValidation } =
    useMutation({ mutationFn: validateTargetAndRepoURLs });
  const { mutate: startScanMutate } = useMutation({ mutationFn: startZapScan });

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
          navigate(`/targets/${data.scanJobId}`, {
            replace: true,
            state: { fromNewTarget: true },
          });
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
    </div>
  );
}
