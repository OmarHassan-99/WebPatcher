export function validateUrl(url) {
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return false;

    const hostname = u.hostname;
    if ((hostname === "127.0.0.1" || hostname === "localhost") && process.env.ALLOW_LOCALHOST === "true") {
      return true;
    }

    const privatePatterns = [
      /^10\./,
      /^192\.168\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^127\./,
      /^169\.254\./
    ];
    for (const p of privatePatterns) {
      if (p.test(hostname)) {
        return false;
      }
    }

    const parts = hostname.split(".");
    if (parts.length < 2) return false;
    const tld = parts[parts.length - 1];
    if (!/^[a-zA-Z]{2,}$/.test(tld)) return false;

    return true;
  } catch (e) {
    return false;
  }
}