import axios from "axios";
import http from "http";
import https from "https";

export async function isHostReachable(rawUrl, timeout = 6000) {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.toLowerCase();

    const isLocalHost =
      ["localhost", "127.0.0.1", "::1"].includes(hostname) ||
      /^10\.|^192\.168\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

    const httpsAgent = new https.Agent({
      rejectUnauthorized: !isLocalHost,
    });

    const httpAgent = new http.Agent();

    const instance = axios.create({
      timeout,
      maxRedirects: 5,
      httpAgent,
      httpsAgent,
      validateStatus: null,
    });

    try {
      //hytcheck el head elawl
      const headResp = await instance.head(rawUrl);
      const status = headResp.status;
      const ok = status >= 200 && status < 400;
      return { ok, status, method: "HEAD" };
    } catch {
      try {
        //hytcheck el get fallback
        const getResp = await instance.get(rawUrl);
        const status = getResp.status;
        const ok = status >= 200 && status < 400;
        return { ok, status, method: "GET" };
      } catch (getErr) {
        return {
          ok: false,
          reason: "Target is not reachable (timeout or connection refused)",
        };
      }
    }
  } catch (err) {
    return { ok: false, reason: "Target is not reachable or network error" };
  }
}
