import api from "../../api/axios";

export async function validateTargetURL({ csrfToken, targetURL }) {
  try {
    const response = await api.post(
      "api/scans/validateTargetURL",
      { targetURL },
      {
        headers: { "x-csrf-token": csrfToken },
      },
    );
    const data = response.data;
    if (!data.success) {
      throw new Error(
        data.message ||
          "Invalid URL. Must be a valid public absolute URL (e.g. https://example.com or http://localhost)",
      );
    }
    return data;
  } catch (error) {
    if (error.response) {
      throw new Error(
        error.response.data?.message || "Failed to validate target URL",
      );
    }
    throw new Error(error.message);
  }
}

export async function startZapScan({ csrfToken, url, targetName }) {
  try {
    const response = await api.post(
      "/api/scans/startScan",
      { url, targetName },
      {
        headers: { "x-csrf-token": csrfToken },
      },
    );

    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.message || "Failed to start scan");
    }
    throw new Error(error.message);
  }
}

export async function getScans({ csrfToken }) {
  try {
    const response = await api.get("/api/scans/getScans", {
      headers: { "x-csrf-token": csrfToken },
    });

    //return the scans itself only for now
    return response.data.scans;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.message || "Failed to get scans");
    }
    throw new Error(error.message);
  }
}

export async function deleteScan({ csrfToken, scanId }) {
  try {
    const response = await api.delete(`/api/scans/${scanId}`, {
      headers: { "x-csrf-token": csrfToken },
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.message || "Failed to delete scan");
    }
    throw new Error(error.message);
  }
}

export async function getFindings({ csrfToken, scanId }) {
  try {
    const response = await api.get(`/api/scans/${scanId}/findings`, {
      headers: { "x-csrf-token": csrfToken },
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.message || "Failed to get findings");
    }
    throw new Error(error.message);
  }
}
