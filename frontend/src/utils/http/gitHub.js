import api from "../../api/axios";

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

export async function fetchGitHubRepos() {
  const response = await api.get("/auth/github/repos");
  return response.data;
}
