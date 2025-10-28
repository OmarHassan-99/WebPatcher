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
    throw new Error(error.message);
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
    throw new Error(error.message);
  }
}

export async function checkSession() {
  const response = await api.get("/auth/checkSession");
  return response.data;
}

export async function changePassword({ csrfToken, formData }) {
  try {
    const response = await api.patch("/auth/changePassword", formData, {
      headers: { "x-csrf-token": csrfToken },
    });
    const data = response.data;
    if (!data.success) {
      throw new Error(data.message || "Change password update failed");
    }
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(
        error.response.data?.message || "Change password update failed"
      );
    }
    throw new Error(error.message);
  }
}

export async function updateUserInfo({ csrfToken, formData }) {
  try {
    const response = await api.patch("/auth/updateUserInfo", formData, {
      headers: { "x-csrf-token": csrfToken },
    });
    const data = response.data;
    if (!data.success) {
      throw new Error(data.message || "Update failed");
    }
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.message || "Update failed");
    }
    throw new Error(error.message);
  }
}

export async function validateTargetURL({ csrfToken, targetURL }) {
  try {
    const response = await api.post(
      "api/scans/validateTargetURL",
      { targetURL },
      {
        headers: { "x-csrf-token": csrfToken },
      }
    );
    const data = response.data;
    if (!data.success) {
      throw new Error(
        data.message ||
          "Invalid URL. Must be a valid public absolute URL (e.g. https://example.com or http://localhost)"
      );
    }
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(
        error.response.data?.message || "Failed to validate target URL"
      );
    }
    throw new Error(error.message);
  }
}

export async function startZapScan({ csrfToken, url }) {
  try {
    const response = await api.post(
      "/api/scans/startScan",
      { url },
      {
        headers: { "x-csrf-token": csrfToken },
      }
    );

    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.message || "Failed to start scan");
    }
    throw new Error(error.message);
  }
}

export async function unlinkGitHub({ csrfToken }) {
  try {
    const response = await api.patch(
      "/auth/github/unlink",
      {},
      {
        headers: { "x-csrf-token": csrfToken },
      }
    );

    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(
        error.response.data?.message || "Failed to unlink GitHub"
      );
    }
    throw new Error(error.message);
  }
}

export async function setPassword({ csrfToken, formData }) {
  try {
    const response = await api.post("/auth/set-password", formData, {
      headers: { "x-csrf-token": csrfToken },
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.message || "Failed to set password");
    }
    throw new Error(error.message);
  }
}

export async function deleteAccount(csrfToken) {
  const res = await api.post(
    "/auth/delete-account",
    {},
    { headers: { "CSRF-Token": csrfToken } }
  );
  return res.data;
}
