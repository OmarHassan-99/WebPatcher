import CheckField from "./CheckField";
import LockButton from "../../../../react-bits/LockButton";

export default function TargetUrl({ formData, updateField, error, setError }) {
  return (
    <>
      <h2 className="text-lg font-semibold">Step 1: Target URL</h2>
      <input
        name="targetUrl"
        value={formData.targetUrl}
        onChange={(e) => {
          updateField("targetUrl", e.target.value);
          setError("");
        }}
        placeholder="https://example.com"
        className="p-2 rounded-md mt-2 w-full bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-400 transition-all duration-500"
        type="url"
        required
      />
      {error && <p className="text-red-400 mt-2">{error}</p>}

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
