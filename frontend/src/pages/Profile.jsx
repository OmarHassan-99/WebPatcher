import { useState } from "react";
import { useNavigate, useRouteLoaderData } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import useCsrf from "../hooks/useCsrf";
import { useMutation } from "@tanstack/react-query";
import {
  changePassword,
  deleteAccount,
  setPassword,
  unlinkGitHub,
  updateUserInfo,
} from "../utils/http";
import toast from "react-hot-toast";
import CustomProfileButton from "../components/ui/profile/CustomProfileButton";
import CustomProfileInput from "../components/ui/profile/CustomProfileInput";
import GitHubButton from "../components/ui/GitHubButton";
import { AlertTriangle } from "lucide-react";

export default function ProfilePage() {
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
  const [isClicked, setIsClicked] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const navigate = useNavigate();

  const { mutate: update, isPending: isSubmittingUpdate } = useMutation({
    mutationFn:
      showField === "password"
        ? changePassword
        : showField === "setPassword"
        ? setPassword
        : updateUserInfo,
  });
  const { mutate: unlink, isPending: isSubmittingUnlink } = useMutation({
    mutationFn: unlinkGitHub,
  });
  const { mutate: deleteAcc, isPending: isDeleting } = useMutation({
    mutationFn: deleteAccount,
  });

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    // if (showField !== "password" && showField !== "setPassword" && showField !== "name&email") {
    //   setFormData({
    //     name: user.name || "",
    //     email: user.email || "",
    //     oldPassword: "",
    //     newPassword: "",
    //     confirmPassword: "",
    //   });
    // }

    const sendFormData =
      showField === "password"
        ? {
            oldPassword: formData.oldPassword,
            newPassword: formData.newPassword,
            confirmPassword: formData.confirmPassword,
          }
        : showField === "setPassword"
        ? {
            password: formData.newPassword,
            confirmPassword: formData.confirmPassword,
          }
        : {
            name: formData.name,
            email: formData.email,
          };

    update(
      {
        csrfToken,
        formData: { ...sendFormData },
      },
      {
        onSuccess: (data) => {
          session.user = data.user;
          toast.success(data.message || "Profile updated successfully!", {
            duration: showField === "setPassword" ? 9000 : 3000,
          });
          if (showField === "password") navigate("/auth?mode=login");
          if (showField === "setPassword") handleTabSwitch("name&email");
        },
        onError: (error) => {
          toast.error(error.message || "Failed to update profile");
        },
      }
    );
  }

  function handleUnlinkGitHub() {
    unlink(
      { csrfToken },
      {
        onSuccess: (data) => {
          session.user = data.user;
          toast.success(
            data.message || "GitHub account unlinked successfully!"
          );
        },
        onError: (error) => {
          toast.error(error.message || "Failed to unlink GitHub account");
          if (error.message.includes("Set a password")) {
            setShowField("setPassword");
          }
        },
      }
    );
  }

  function handleDeleteAccount() {
    deleteAcc(
      { csrfToken },
      {
        onSuccess: (data) => {
          toast.success(data.message || "Account deleted successfully!");
          setShowDeleteModal(false);
          navigate("/auth?mode=login");
        },
        onError: (err) => {
          toast.error(err.message || "Failed to delete account");
        },
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
    (showField === "password" && formData.oldPassword.trim() === "") ||
    formData.newPassword.trim() === "" ||
    formData.confirmPassword.trim() === "";

  const saveDisabled =
    (nothingChanged && passwordIncomplete) || isSubmittingUpdate;

  return (
    <Motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 120 }}
      className="flex items-center justify-center p-6"
    >
      <div className="w-full max-w-5xl bg-primary-800 backdrop-blur-lg shadow-xl rounded-3xl p-8 flex flex-col md:flex-row gap-10">
        {/* Left Side - Nav & Avatar */}
        <div className="flex flex-col justify-between md:w-1/3 text-center">
          {/* Tab Switch */}
          <div className="flex flex-wrap gap-6 justify-center relative border-b border-primary-600 pb-2">
            <CustomProfileButton
              handleClick={() => handleTabSwitch("name&email")}
              isActive={showField === "name&email"}
              label="Name & Email"
            />
            {(!user.githubUsername || user.isSetPassword) && (
              <CustomProfileButton
                handleClick={() => handleTabSwitch("password")}
                isActive={showField === "password"}
                label="Change Password"
              />
            )}
            <CustomProfileButton
              handleClick={() => handleTabSwitch("githubLink")}
              isActive={showField === "githubLink"}
              label="GitHub Link"
            />
            {user.githubUsername && !user.isSetPassword && (
              <CustomProfileButton
                handleClick={() => handleTabSwitch("setPassword")}
                isActive={showField === "setPassword"}
                label="Set Password"
              />
            )}
            <CustomProfileButton
              handleClick={() => handleTabSwitch("dangerZone")}
              isActive={showField === "dangerZone"}
              label="Danger Zone"
            />
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center mt-6">
            <div className="relative w-32 h-32 rounded-full overflow-hidden shadow-lg">
              {user.githubUsername ? (
                <img
                  src={`https://avatars.githubusercontent.com/${user.githubUsername}`}
                  alt="GitHub Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary-600 flex items-center justify-center text-4xl font-bold text-white">
                  {formData.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <h3 className="mt-4 text-xl font-semibold text-primary-100">
              {formData.name}
            </h3>
            <p className="text-primary-300">{formData.email}</p>
          </div>
        </div>

        {/* Right Side - Editable Fields */}
        <form onSubmit={handleSubmit} className="md:w-2/3 space-y-6">
          <AnimatePresence mode="popLayout">
            <Motion.h2
              key={showField === "dangerZone" ? "danger-zone" : "edit-profile"}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring" }}
              className={`text-2xl font-bold text-primary-100 mb-4 ${
                showField === "dangerZone" && "text-red-400"
              }`}
            >
              {showField === "dangerZone" ? "Danger Zone" : "Edit Profile"}
            </Motion.h2>
          </AnimatePresence>

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
              </Motion.div>
            )}

            {showField === "githubLink" && (
              <Motion.div
                key="githubLink"
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                {user.githubUsername ? (
                  <div>
                    <p className="text-primary-100">
                      GitHub Username: {user.githubUsername}
                    </p>
                    <p className="text-primary-100">
                      GitHub Link:{" "}
                      <a
                        href={`https://github.com/${user.githubUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-200 hover:text-primary-300 transition-colors"
                      >
                        {`https://github.com/${user.githubUsername}`}
                      </a>
                    </p>
                  </div>
                ) : (
                  <GitHubButton
                    mode="link"
                    onClick={() => setIsClicked(true)}
                    isClicked={isClicked}
                  />
                )}
              </Motion.div>
            )}

            {showField === "setPassword" && (
              <Motion.div
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
              </Motion.div>
            )}

            {showField === "dangerZone" && (
              <Motion.div
                key="dangerZone"
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <p className="text-sm text-red-300 mb-6">
                  Deleting your account will permanently remove all your data,
                  including scans, reports, and linked GitHub information.{" "}
                  <strong>This action cannot be undone.</strong>
                </p>
              </Motion.div>
            )}
          </AnimatePresence>

          {/* Save Button */}
          <AnimatePresence mode="popLayout">
            {showField === "name&email" || showField === "password" ? (
              <Motion.button
                key={showField}
                layout
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                disabled={saveDisabled}
                className="mt-6 w-full py-3 rounded-xl bg-primary-400 hover:bg-primary-300 text-white font-semibold shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-primary-400"
              >
                {isSubmittingUpdate ? "Saving..." : "Save Changes"}
              </Motion.button>
            ) : showField === "githubLink" && user.githubUsername ? (
              <Motion.button
                type="button"
                key={showField}
                layout
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                onClick={handleUnlinkGitHub}
                disabled={isSubmittingUnlink}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-red-600"
              >
                {isSubmittingUnlink ? "Unlinking..." : "Unlink GitHub Account"}
              </Motion.button>
            ) : showField === "setPassword" ? (
              <Motion.button
                key={showField}
                layout
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                whileTap={{ scale: 0.95 }}
                disabled={saveDisabled}
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-green-600"
              >
                {isSubmittingUpdate ? "Saving..." : "Set Password"}
              </Motion.button>
            ) : showField === "dangerZone" ? (
              <Motion.div
                key={showField}
                layout
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                {user.githubUsername && (
                  <button
                    type="button"
                    onClick={handleUnlinkGitHub}
                    disabled={isSubmittingUnlink}
                    className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-red-600"
                  >
                    {isSubmittingUnlink ? "Unlinking..." : "Unlink GitHub"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-white font-semibold shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-red-700"
                >
                  {isDeleting ? "Deleting..." : "Delete Account Permanently"}
                </button>
              </Motion.div>
            ) : null}
          </AnimatePresence>
        </form>
      </div>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <Motion.div
              initial={{ opacity: 0, scale: 0.9, x: 0 }}
              animate={{
                opacity: 1,
                scale: 1,
                x: [0, -5, 5, -3, 3, 0],
                transition: { duration: 0.6, ease: "easeInOut" },
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gray-900 text-white rounded-2xl p-8 shadow-2xl w-[90%] max-w-md border border-red-600"
            >
              <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-500" /> Confirm
                Account Deletion
              </h3>

              <p className="text-gray-300 mb-6">
                Are you{" "}
                <span className="text-red-400 font-semibold">
                  absolutely sure
                </span>{" "}
                you want to delete your account? This will permanently erase all
                your data and cannot be undone.
              </p>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <Motion.button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? "Deleting..." : "Yes, Delete Permanently"}
                </Motion.button>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.div>
  );
}
