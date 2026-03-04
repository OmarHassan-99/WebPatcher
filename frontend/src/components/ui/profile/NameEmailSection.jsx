import { forwardRef } from "react";
import { motion as Motion } from "framer-motion";
import CustomProfileInput from "./CustomProfileInput";

const NameEmailSection = forwardRef(
  ({ formData, handleChange, isSubmittingUpdate, saveDisabled }, ref) => {
    return (
      <Motion.div
        ref={ref}
        key="name-email"
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4 }}
        className="space-y-4"
      >
        <CustomProfileInput
          label="Name"
          name="name"
          type="text"
          placeholder="John Doe"
          value={formData.name}
          onChange={handleChange}
        />

        <CustomProfileInput
          label="Email"
          name="email"
          type="email"
          placeholder="email@example.com"
          value={formData.email}
          onChange={handleChange}
        />

        <button
          disabled={saveDisabled}
          className="mt-6 w-full py-3 rounded-xl bg-primary-400 hover:bg-primary-300 text-white font-semibold shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-primary-400"
        >
          {isSubmittingUpdate ? "Saving..." : "Save Changes"}
        </button>
      </Motion.div>
    );
  },
);

export default NameEmailSection;
