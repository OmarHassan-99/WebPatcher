import { lazy, Suspense, useState } from "react";
import { useNavigate, useRouteLoaderData } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import Stepper, { Step } from "../react-bits/Stepper";
import { startZapScan, validateTargetAndRepoURLs } from "../utils/http/zap";
import useCsrf from "../hooks/useCsrf";
const TargetAndRepoURLs = lazy(
  () =>
    import("../components/targets/newTarget/TargetAndRepoURLs/Target&RepoURLs"),
);
import AuthContext from "../components/targets/newTarget/Authentication/AuthContext";
import AiContext from "../components/targets/newTarget/AIContext/AiContext";
import { generateTargetSlug } from "../utils/slugify";

const GITHUB_INSTALL_URL =
  "https://github.com/apps/webpatcher-ai-powered-assistant/installations/new";

const DEFAULT_AUTH_CONFIG = {
  enabled: false,
  loginUrl: "",
  usernameField: "username",
  passwordField: "password",
  username: "",
  password: "",
  loggedInIndicator: "",
  loggedOutIndicator: "",
  extraPostData: "",
};

export default function NewTargetPage() {
  const [formData, setFormData] = useState({
    targetUrl: "",
    githubRepoUrl: "",
    targetName: "",
    context: { db: [], lang: [], fw: [], os: [], scm: [], ws: [] },
    authConfig: { ...DEFAULT_AUTH_CONFIG },
    isChecked: false,
  });
  const [error, setError] = useState({ targetUrl: "", githubRepoUrl: "" });
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
    // Only include authConfig if actually enabled
    const authPayload = formData.authConfig.enabled
      ? formData.authConfig
      : undefined;

    startScanMutate(
      {
        csrfToken,
        url: formData.targetUrl,
        targetName: formData.targetName,
        githubRepoUrl: formData.githubRepoUrl,
        context: formData.context,
        authConfig: authPayload,
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

  function updateAuthConfig(field, value) {
    setFormData((prev) => ({
      ...prev,
      authConfig: { ...prev.authConfig, [field]: value },
    }));
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
          <Suspense fallback={null}>
            <TargetAndRepoURLs
              formData={formData}
              updateField={updateField}
              error={error}
              setError={setError}
              isAnimatePulse={isAnimatePulse}
              user={user}
            />
          </Suspense>
        </Step>

        <Step stepLabel="Authentication">
          <AuthContext
            formData={formData}
            updateAuthConfig={updateAuthConfig}
            targetUrl={formData.targetUrl}
          />
        </Step>

        <Step stepLabel="AI Context">
          <AiContext formData={formData} updateAiContext={updateAiContext} />
        </Step>
      </Stepper>
    </div>
  );
}
