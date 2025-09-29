import { QueryClient } from "@tanstack/react-query";
import api from "../api/axios";

export const queryClient = new QueryClient();

export async function authenticate({ mode, formData, csrfToken }) {
  try {
    if (mode !== "register" && mode !== "login") {
      throw new Error("Invalid mode");
    }

    const response = await api.post(`/auth/${mode}`, formData, {
      headers: { "x-csrf-token": csrfToken },
    });

    const data = response.data;

    if (!data.success) {
      throw new Error(data.message || "Authentication failed");
    }

    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.message || "Authentication failed");
    }
    throw new Error("Authentication failed: " + error.message);
  }
}

export async function logout(csrfToken) {
  try {
    const response = await api.post("/auth/logout", null, {
      headers: { "x-csrf-token": csrfToken },
    });
    const data = response.data;
    if (!data.success) {
      throw new Error(data.message || "Logout failed");
    }
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.message || "Logout failed");
    }
    throw new Error("Logout failed: " + error.message);
  }
}

export async function checkSession() {
  const response = await api.get("/auth/checkSession");
  return response.data;
}
