import { useEffect, useState } from "react";
import api from "../api/axios";

export default function useCsrf() {
  const [csrfToken, setCsrfToken] = useState(null);

  useEffect(() => {
    async function fetchToken() {
      try {
        const res = await api.get("/api/csrf-token");
        setCsrfToken(res.data.csrfToken);
      } catch (err) {
        console.error("Failed to fetch CSRF token", err);
      }
    }

    fetchToken();
  }, []);

  return csrfToken;
}
