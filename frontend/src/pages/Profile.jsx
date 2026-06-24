import { useState } from "react";
import { useNavigate, useRouteLoaderData } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "framer-motion";
import useCsrf from "../hooks/useCsrf";
import { useMutation } from "@tanstack/react-query";
import {
  changePassword,
  deleteAccount,
  setPassword,
  updateUserInfo,
} from "../utils/http/userAuth";
import { unlinkGitHub } from "../utils/http/gitHub";
import toast from "react-hot-toast";
import ProfileSidePanel from "../components/ui/profile/ProfileSidePanel";
import NameEmailSection from "../components/ui/profile/NameEmailSection";
import PasswordSection from "../components/ui/profile/PasswordSection";
import GitHubLinkSection from "../components/ui/profile/GitHubLinkSection";
import SetPasswordSection from "../components/ui/profile/SetPasswordSection";
import DangerZoneSection from "../components/ui/profile/DangerZoneSection";
import DeleteModal from "../components/ui/profile/DeleteModal";

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

  function handleSubmit(e) {
    e.preventDefault();

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
      { csrfToken, formData: { ...sendFormData } },
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
      },
    );
  }

  function handleUnlinkGitHub() {
    unlink(
      { csrfToken },
      {
        onSuccess: (data) => {
          session.user = data.user;
          toast.success(
            data.message || "GitHub account unlinked successfully!",
          );
        },
        onError: (error) => {
          toast.error(error.message || "Failed to unlink GitHub account");
          if (error.message.includes("Set a password")) {
            setShowField("setPassword");
          }
        },
      },
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
      },
    );
  }

  const nothingChanged =
    user.name === formData.name && user.email === formData.email;

  const passwordIncomplete =
    (showField === "password" && formData.oldPassword.trim() === "") ||
    formData.newPassword.trim() === "" ||
    formData.confirmPassword.trim() === "";

  const saveDisabled =
    (nothingChanged && passwordIncomplete) || isSubmittingUpdate;

  const sectionProps = {
    formData,
    handleChange,
    isSubmittingUpdate,
    saveDisabled,
  };

  return (
    <Motion.div
      layout
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 120 }}
      className="flex justify-center mx-5 my-6 md:my-10"
    >
      <div className="glass-card w-full min-h-[400px] max-w-5xl rounded-3xl p-8 flex flex-col md:flex-row gap-10">
        {/* Left Side - Nav & Avatar */}
        <ProfileSidePanel
          user={user}
          showField={showField}
          handleTabSwitch={handleTabSwitch}
          formData={formData}
        />

        {/* Right Side - Editable Fields */}
        <form
          onSubmit={handleSubmit}
          className="md:w-2/3 space-y-6 w-full relative"
        >
          {/* Section heading */}
          <AnimatePresence mode="popLayout">
            <Motion.h2
              key={showField === "dangerZone" ? "danger-zone" : "edit-profile"}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring" }}
              className={`text-2xl font-bold text-surface-50 mb-4 ${
                showField === "dangerZone" && "text-red-400"
              }`}
            >
              {showField === "dangerZone" ? "Danger Zone" : "Edit Profile"}
            </Motion.h2>
          </AnimatePresence>

          {/* Active section */}
          <AnimatePresence mode="popLayout">
            {showField === "name&email" && (
              <NameEmailSection key="name&email" {...sectionProps} />
            )}

            {showField === "password" && (
              <PasswordSection key="password" {...sectionProps} />
            )}

            {showField === "githubLink" && (
              <GitHubLinkSection
                key="githubLink"
                user={user}
                isClicked={isClicked}
                setIsClicked={setIsClicked}
                isSubmittingUnlink={isSubmittingUnlink}
                onUnlinkGitHub={handleUnlinkGitHub}
              />
            )}

            {showField === "setPassword" && (
              <SetPasswordSection key="setPassword" {...sectionProps} />
            )}

            {showField === "dangerZone" && (
              <DangerZoneSection
                key="dangerZone"
                isDeleting={isDeleting}
                onDeleteClick={() => setShowDeleteModal(true)}
              />
            )}
          </AnimatePresence>
        </form>
      </div>

      {/* Delete Modal */}
      <DeleteModal
        showDeleteModal={showDeleteModal}
        setShowDeleteModal={setShowDeleteModal}
        handleDeleteAccount={handleDeleteAccount}
        isDeleting={isDeleting}
      />
    </Motion.div>
  );
}
