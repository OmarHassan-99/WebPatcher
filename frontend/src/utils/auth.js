import toast from "react-hot-toast";
import { checkSession } from "./http";
import { redirect } from "react-router-dom";

export function checkSessionLoader() {
  return checkSession();
}

export function checkAuthLoader() {
  const sessionData = checkSession();
  const isAuthenticated = sessionData?.success;

  if (!isAuthenticated) {
    toast.error("You are not authenticated! Please log in.");
    return redirect("/auth?mode=login");
  }

  return null;
}
