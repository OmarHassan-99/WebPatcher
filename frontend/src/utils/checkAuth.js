import toast from "react-hot-toast";
import { checkSession } from "./http/userAuth";
import { redirect } from "react-router-dom";

export async function checkSessionLoader() {
  return await checkSession();
}

export async function checkAuthLoader() {
  const sessionData = await checkSession();
  const isAuthenticated = sessionData?.success;

  if (!isAuthenticated) {
    toast.error("You are not authenticated! Please log in", {
      id: "unauthenticated",
    });
    return redirect("/auth?mode=login");
  }

  return null;
}
