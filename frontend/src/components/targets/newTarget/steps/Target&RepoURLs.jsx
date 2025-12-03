import CheckField from "./CheckField";
import LockButton from "../../../../react-bits/LockButton";
import CustomTargetInput from "./CustomTargetInput";

export default function TargetAndRepoURLs({
  formData,
  updateField,
  error,
  setError,
}) {
  return (
    <>
      <div className="flex flex-col gap-4">
        <CustomTargetInput
          label="Target URL"
          name="targetUrl"
          value={formData.targetUrl}
          onChange={(e) => {
            updateField("targetUrl", e.target.value);
            setError("");
          }}
          placeholder="https://example.com"
          error={error}
        />

        <CustomTargetInput
          label="Github Repo URL"
          name="githubRepoUrl"
          value={formData.githubRepoUrl}
          onChange={(e) => {
            updateField("githubRepoUrl", e.target.value);
            setError("");
          }}
          placeholder="https://github.com/username/repo-name"
        />

        <CustomTargetInput
          label="Target Name"
          span="(Helps you identify the target easily)"
          name="targetName"
          value={formData.targetName}
          onChange={(e) => updateField("targetName", e.target.value)}
          placeholder="Target Name (optional)"
        />
      </div>

      <div className="mt-4 flex flex-col justify-center space-y-3 text-white">
        <CheckField spanText="Unauthorized scanning of third-party targets is strictly prohibited" />
        <CheckField spanText="Users must own or have explicit permission to scan a target" />
        <CheckField spanText="Terms and Conditions apply" />
        <div className="flex items-center gap-2 mt-4">
          <LockButton
            isChecked={formData.isChecked}
            onChange={(e) => updateField("isChecked", e.target.checked)}
          />
          <span className="ml-2 text-sm">
            I confirm that I have the legal authorization to scan this target
          </span>
        </div>
      </div>
    </>
  );
}
