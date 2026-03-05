import { forwardRef } from "react";
import { motion as Motion } from "framer-motion";
import CustomProfileInput from "./CustomProfileInput";

const SetPasswordSection = forwardRef(
  ({ formData, handleChange, isSubmittingUpdate, saveDisabled }, ref) => {
    return (
      <Motion.div
        ref={ref}
        key="set-password"
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
        className="space-y-4"
      >
        <CustomProfileInput
          label="Password"
          name="newPassword"
          type="password"
          placeholder="Enter your password"
          value={formData.newPassword}
          onChange={handleChange}
        />

        <CustomProfileInput
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={handleChange}
        />

        <Motion.button
          whileTap={{ scale: 0.95 }}
          disabled={saveDisabled}
          className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-green-600"
        >
          {isSubmittingUpdate ? "Saving..." : "Set Password"}
        </Motion.button>
      </Motion.div>
    );
  },
);

export default SetPasswordSection;
