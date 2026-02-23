import api from "../../api/axios";

export async function getScanRecommendations({ csrfToken, scanId }) {
  try {
    const response = await api.get(`/api/recommendations/scan/${scanId}`, {
      headers: { "x-csrf-token": csrfToken },
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(
        error.response.data?.message || "Failed to get scan recommendations",
      );
    }
    throw new Error(error.message);
  }
}
