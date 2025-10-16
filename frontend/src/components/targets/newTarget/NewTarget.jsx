import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Stepper, { Step } from "../../../react-bits/Stepper";
import { validateTargetURL } from "../../../utils/http";
import TargetUrl from "./steps/TargetUrl";

import useCsrf from "../../../hooks/useCsrf";
import AiContext from "./steps/AiContext";

export default function NewTarget() {
  const [formData, setFormData] = useState({
    targetUrl: "",
    context: { lang: [], fw: [] },
    isChecked: false,
  });
  const [error, setError] = useState("");

  const csrfToken = useCsrf();

  const { mutate, isPending } = useMutation({
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

  function handleUrlValidation(targetURL) {
    return new Promise((resolve) => {
      mutate(
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

  function handleOnFinalStepCompleted() {
    console.log("onFinalStepCompleted");
  }

  return (
    <div className="text-white">
      <Stepper onFinalStepCompleted={() => handleOnFinalStepCompleted()}>
        <Step
          stepLabel="Target URL"
          onNext={() => handleUrlValidation(formData.targetUrl)}
          isNextDisabled={!formData.targetUrl.trim() || !formData.isChecked}
          isPending={isPending}
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
    </div>
  );
}
