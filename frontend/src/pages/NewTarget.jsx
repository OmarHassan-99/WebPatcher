import { useState } from "react";
import { useNavigate, useRouteLoaderData } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import Stepper, { Step } from "../react-bits/Stepper";
import { startZapScan, validateTargetAndRepoURLs } from "../utils/http/zap";
import useCsrf from "../hooks/useCsrf";
import TargetAndRepoURLs from "../components/targets/newTarget/TargetAndRepoURLs/Target&RepoURLs";
import AiContext from "../components/targets/newTarget/AIContext/AiContext";
import { generateTargetSlug } from "../utils/slugify";

const GITHUB_INSTALL_URL =
  "https://github.com/apps/webpatcher-ai-powered-assistant/installations/new";

export default function NewTargetPage() {
  const [formData, setFormData] = useState({
    targetUrl: "",
    githubRepoUrl: "",
    targetName: "",
    githubToken: "",
    context: { db: [], lang: [], fw: [], os: [], scm: [], ws: [] },
    isChecked: false,
  });
  const [error, setError] = useState({
    targetUrl: "",
    githubRepoUrl: "",
    githubToken: "",
  });
  const [isAnimatePulse, setIsAnimatePulse] = useState(true);
  const [activeScanJobId, setActiveScanJobId] = useState(null);

  const navigate = useNavigate();
  const session = useRouteLoaderData("root");
  const user = session?.user;

  const csrfToken = useCsrf();

  const { mutateAsync: validateMutate, isPending: isPendingValidation } =
    useMutation({ mutationFn: validateTargetAndRepoURLs });
  const { mutate: startScanMutate } = useMutation({ mutationFn: startZapScan });

  async function handleUrlsValidation() {
    setError({ targetUrl: "", githubRepoUrl: "", githubToken: "" });
    setIsAnimatePulse(true);

    try {
      await validateMutate({
        csrfToken,
        targetURL: formData.targetUrl,
        githubRepoUrl: formData.githubRepoUrl,
        githubToken: formData.githubToken,
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

        if (newErrors.githubToken && err.errorType === "NO_PUSH_ACCESS") {
          setIsAnimatePulse(false);
          newErrors.githubToken = (
            <div className="flex flex-col gap-2 mt-1 text-sm text-red-400">
              <p>
                <strong>Push Access Denied.</strong> To fix this:
              </p>
              <ul className="list-disc list-inside ml-2 text-gray-300">
                <li>
                  <strong>If you own this repo:</strong> Ensure your GitHub
                  token has the{" "}
                  <code className="bg-black px-1 rounded text-green-400">
                    repo
                  </code>{" "}
                  scope checked.
                </li>
                <li>
                  <strong>If this is an external repo:</strong> You must{" "}
                  <a
                    href={`https://github.com/${err.owner}/${err.repo}/fork`}
                    target="_blank"
                    className="text-blue-400 underline"
                  >
                    Fork it on GitHub
                  </a>{" "}
                  first, then scan your forked version instead.
                </li>
              </ul>
            </div>
          );
        } else if (
          newErrors.githubToken &&
          newErrors.githubToken?.includes("'repo' scope")
        ) {
          setIsAnimatePulse(false);
          newErrors.githubToken = (
            <span className="flex flex-col items-start gap-1">
              <span>Repository not found or access denied.</span>
              <span className="text-gray-300">
                Ensure your token has the{" "}
                <code className="bg-black px-1 rounded text-green-400">
                  repo
                </code>{" "}
                scope checked.
              </span>
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline hover:text-blue-300 flex items-center gap-1 mt-1"
              >
                Check your token settings here
                <ExternalLink className="size-4" />
              </a>
            </span>
          );
        }

        setError(newErrors);
      } else {
        setError({
          targetUrl: err.message,
          githubRepoUrl: err.message,
          githubToken: err.message,
        });
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
        githubToken: formData.githubToken,
        context: formData.context,
      },
      {
        onSuccess: (data) => {
          setActiveScanJobId(data.scanJobId);
          const newSlug = generateTargetSlug(
            data.scanJobId,
            formData.targetName,
          );
          navigate(`/targets/${newSlug}`, {
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
            user={user}
          />
        </Step>

        <Step stepLabel="AI Context">
          <AiContext formData={formData} updateAiContext={updateAiContext} />
        </Step>
      </Stepper>
    </div>
  );
}
