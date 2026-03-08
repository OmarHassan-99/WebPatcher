import api from "../../api/axios";

export async function validateTargetAndRepoURLs({
  csrfToken,
  targetURL,
  githubRepoUrl,
}) {
  try {
    const response = await api.post(
      "api/scans/validateTarget&RepoURLs",
      { targetURL, githubRepoUrl },
      { headers: { "x-csrf-token": csrfToken } },
    );
    return response.data;
  } catch (error) {
    if (error.response && error.response.data?.errors) {
      throw { isValidationError: true, errors: error.response.data.errors };
    }
    throw new Error(error.response?.data?.message || error.message);
  }
}

export async function startZapScan({
  csrfToken,
  url,
  targetName,
  githubRepoUrl,
  context,
  previousScanId,
}) {
  try {
    const response = await api.post(
      "/api/scans/startScan",
      { url, targetName, githubRepoUrl, context, previousScanId },
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

export async function getScans({ csrfToken, page, size, status }) {
  const params = { page, size };

  if (status && status !== "all") {
    params.status = status;
  }

  try {
    const response = await api.get("/api/scans/getScans", {
      headers: { "x-csrf-token": csrfToken },
      params,
    });

    return response.data;
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

export async function deleteBulkScans({ csrfToken, ids }) {
  try {
    const response = await api.delete("/api/scans/bulk-delete", {
      data: { ids },
      headers: { "x-csrf-token": csrfToken },
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to delete scans");
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
