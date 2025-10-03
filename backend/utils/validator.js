export function validateUrl(url) {
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return false;

    const hostname = u.hostname;
    if ((hostname === "127.0.0.1" || hostname === "localhost") ) {
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

    return true;
  } catch (e) {
    return false;
  }
}
