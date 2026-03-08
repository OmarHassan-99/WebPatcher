import { forwardRef } from "react";
import { motion as Motion } from "framer-motion";
import CustomProfileInput from "./CustomProfileInput";

const PasswordSection = forwardRef(
  ({ formData, handleChange, isSubmittingUpdate, saveDisabled }, ref) => {
    return (
      <Motion.div
        ref={ref}
        key="password"
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
        className="space-y-4"
      >
        <CustomProfileInput
          label="Old Password"
          name="oldPassword"
          type="password"
          placeholder="Enter your old password"
          value={formData.oldPassword}
          onChange={handleChange}
        />

        <CustomProfileInput
          label="New Password"
          name="newPassword"
          type="password"
          placeholder="Enter your new password"
          value={formData.newPassword}
          onChange={handleChange}
          required={formData.oldPassword.trim() !== ""}
        />

        <CustomProfileInput
          label="Confirm New Password"
          name="confirmPassword"
          type="password"
          placeholder="Confirm your new password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required={formData.newPassword.trim() !== ""}
        />

        <button
          disabled={saveDisabled}
          className="mt-6 w-full py-3 rounded-xl border border-surface-600 bg-surface-700 hover:bg-surface-600 text-white font-semibold shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-800"
        >
          {isSubmittingUpdate ? "Saving..." : "Save Changes"}
        </button>
      </Motion.div>
    );
  },
);

export default PasswordSection;
