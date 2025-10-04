import { useState } from "react";
import { useNavigate, useRouteLoaderData } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import useCsrf from "../hooks/useCsrf";
import { useMutation } from "@tanstack/react-query";
import { changePassword, updateUserInfo } from "../utils/http";
import toast from "react-hot-toast";
import CustomProfileButton from "../components/ui/CustomProfileButton";
import CustomProfileInput from "../components/ui/CustomProfileInput";

export default function Profile() {
  const session = useRouteLoaderData("root");
  const { user } = session;

  const csrfToken = useCsrf();

  const [formData, setFormData] = useState({
    name: user.name || "",
    email: user.email || "",
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showField, setShowField] = useState("name&email");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const { mutate } = useMutation({
    mutationFn: showField === "password" ? changePassword : updateUserInfo,
  });

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    setIsSubmitting(true);
    e.preventDefault();

    const sendFormData =
      showField === "password"
        ? {
            oldPassword: formData.oldPassword,
            newPassword: formData.newPassword,
            confirmPassword: formData.confirmPassword,
          }
        : {
            name: formData.name,
            email: formData.email,
          };

    mutate(
      {
        csrfToken,
        formData: { ...sendFormData },
      },
      {
        onSuccess: (data) => {
          if (showField === "password") navigate("/auth?mode=login");
          session.user = data.user;
          toast.success(data.message || "Profile updated successfully!");
        },
        onError: (error) => {
          toast.error(error.message || "Failed to update profile");
        },
        onSettled: () => setIsSubmitting(false),
      }
    );
  }

  function handleTabSwitch(tab) {
    setShowField(tab);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  }

  const nothingChanged =
    user.name === formData.name && user.email === formData.email;

  const passwordIncomplete =
    formData.oldPassword.trim() === "" ||
    formData.newPassword.trim() === "" ||
    formData.confirmPassword.trim() === "";

  return (
    <Motion.div
      layout
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 120 }}
      className="flex items-center justify-center p-6"
    >
      <div className="w-full max-w-4xl bg-primary-800/70 backdrop-blur-lg shadow-xl rounded-3xl p-8 flex flex-col md:flex-row gap-10">
        {/* Left Side - Nav & Avatar */}
        <div className="flex flex-col justify-between md:w-1/3 text-center">
          {/* Tab Switch */}
          <div className="flex gap-6 justify-center relative border-b border-primary-600 pb-2">
            <CustomProfileButton
              handleClick={() => handleTabSwitch("name&email")}
              isActive={showField === "name&email"}
              label="Edit Name & Email"
            />
            <CustomProfileButton
              handleClick={() => handleTabSwitch("password")}
              isActive={showField === "password"}
              label="Change Password"
            />
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center mt-6">
            <div className="w-32 h-32 rounded-full bg-primary-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg">
              {formData.name.charAt(0).toUpperCase()}
            </div>
            <h3 className="mt-4 text-xl font-semibold text-primary-100">
              {formData.name}
            </h3>
            <p className="text-primary-300">{formData.email}</p>
          </div>
        </div>

        {/* Right Side - Editable Fields */}
        <form onSubmit={handleSubmit} className="md:w-2/3 space-y-6">
          <h2 className="text-2xl font-bold text-primary-100 mb-4">
            Edit Profile
          </h2>

          {/* Animate between sections */}
          <AnimatePresence mode="popLayout">
            {showField === "name&email" && (
              <Motion.div
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
              </Motion.div>
            )}

            {showField === "password" && (
              <Motion.div
                key="password"
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-4"
              >
                <CustomProfileInput
                  name="oldPassword"
                  type="password"
                  placeholder="Old Password"
                  value={formData.oldPassword}
                  onChange={handleChange}
                />

                <CustomProfileInput
                  name="newPassword"
                  type="password"
                  placeholder="New Password"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required={formData.oldPassword.trim() !== ""}
                />

                <CustomProfileInput
                  name="confirmPassword"
                  type="password"
                  placeholder="Confirm New Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required={formData.newPassword.trim() !== ""}
                />
              </Motion.div>
            )}
          </AnimatePresence>

          {/* Save Button */}
          <button
            className="mt-6 w-full py-3 rounded-xl bg-primary-400 hover:bg-primary-300 text-white font-semibold shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={(nothingChanged && passwordIncomplete) || isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </Motion.div>
  );
}
