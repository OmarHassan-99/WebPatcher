import { Link, useNavigate, useRouteLoaderData } from "react-router-dom";
import { AnimatePresence, motion as Motion } from "motion/react";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import CustomLink from "../ui/CustomLink";
import { useMutation } from "@tanstack/react-query";
import { logout } from "../../utils/http/userAuth";
import toast from "react-hot-toast";
import useCsrf from "../../hooks/useCsrf";

export default function MainNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const sessionData = useRouteLoaderData("root");
  const isAuthenticated = sessionData?.success;
  const navigate = useNavigate();

  const csrfToken = useCsrf();

  const { mutate: handleLogout } = useMutation({
    mutationFn: () => logout(csrfToken),
    onSuccess: (data) => {
      toast.success(data.message || "Logged out successfully!");
      window.history.replaceState({}, "", window.location.pathname);
      navigate("/");
    },
    onError: (error) => {
      console.error(error);
      if (error.response) {
        toast.error(error.response.data?.message || "Logout failed");
      }
      toast.error("Logout failed: " + error.message);
    },
  });

  return (
    <Motion.nav
      initial={{ opacity: 0, y: -200 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring" }}
      className="sticky top-4 z-50 text-primary-100 flex items-center justify-between bg-transparent border border-gray-700 backdrop-blur-sm rounded-full px-6 py-3 mx-4 sm:mx-12 lg:mx-32 shadow-lg"
    >
      {/* Logo / App Name */}
      <Link to="/" className="flex gap-2 font-bold text-lg">
        <Motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring" }}
          className="flex items-center gap-2"
        >
          <img src="/logo.svg" alt="WebPatcher Logo" className="w-8 h-8" />
          <p className="text-white">WebPatcher</p>
        </Motion.div>
      </Link>

      {/* Desktop links */}
      <div className="hidden sm:flex gap-6 font-semibold">
        {!isAuthenticated ? (
          <>
            <CustomLink to="/auth?mode=login" mode="login" title="Login" />
            <CustomLink
              to="/auth?mode=register"
              mode="register"
              title="Register"
            />
          </>
        ) : (
          <CustomLink title="Logout" onClick={() => handleLogout()} />
        )}
      </div>

      {/* Mobile menu button */}
      <Motion.button
        whileTap={{ scale: 0.9 }}
        className="sm:hidden text-primary-100 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <Motion.div
              key="close"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
            >
              <X size={24} />
            </Motion.div>
          ) : (
            <Motion.div
              key="menu"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
            >
              <Menu size={24} />
            </Motion.div>
          )}
        </AnimatePresence>
      </Motion.button>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {isOpen && (
          <Motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="absolute top-13 left-0 right-0 mx-4 rounded-xl border border-gray-700 bg-gray-900 p-6 sm:hidden"
          >
            <div className="flex flex-col gap-4 font-semibold">
              {!isAuthenticated ? (
                <>
                  <CustomLink
                    to="/auth?mode=login"
                    title="Login"
                    mode="login"
                    onClick={() => setIsOpen(false)}
                  />
                  <CustomLink
                    to="/auth?mode=register"
                    title="Register"
                    mode="register"
                    onClick={() => setIsOpen(false)}
                  />
                </>
              ) : (
                <CustomLink
                  title="Logout"
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                />
              )}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.nav>
  );
}
