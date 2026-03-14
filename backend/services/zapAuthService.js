import axios from "axios";

const ZAP_API_BASE = "http://127.0.0.1:8080";
const ZAP_API_KEY = "123";

async function zapApi(path, params = {}) {
  const res = await axios.get(`${ZAP_API_BASE}/JSON/${path}`, {
    headers: { "X-ZAP-API-Key": ZAP_API_KEY },
    params,
  });
  return res.data;
}

export async function configureAuthentication(_zap, targetUrl, authConfig) {
  console.log("[ZapAuth] Configuring authenticated context…");

  // 1. Create a new context
  const ctxRes = await zapApi("context/action/newContext/", {
    contextName: "auth-ctx",
  });
  const contextId = ctxRes.contextId;
  console.log(`[ZapAuth] Created context id=${contextId}`);

  // 2. Include the target URL in the context (regex that covers entire site)
  const urlPattern = `${targetUrl.replace(/\/$/, "")}.*`;
  await zapApi("context/action/includeInContext/", {
    contextName: "auth-ctx",
    regex: urlPattern,
  });
  console.log(`[ZapAuth] Included pattern: ${urlPattern}`);

  // 3. Set form-based authentication method
  const {
    loginUrl,
    usernameField = "username",
    passwordField = "password",
    extraPostData = "",
  } = authConfig;

  // Build the loginRequestData string in ZAP format
  // {%username%} and {%password%} are ZAP placeholders
  let loginRequestData = `${encodeURIComponent(usernameField)}={%username%}&${encodeURIComponent(passwordField)}={%password%}`;
  if (extraPostData) {
    loginRequestData += `&${extraPostData}`;
  }

  const authMethodConfigParams = `loginUrl=${encodeURIComponent(loginUrl)}&loginRequestData=${encodeURIComponent(loginRequestData)}`;

  await zapApi("authentication/action/setAuthenticationMethod/", {
    contextId,
    authMethodName: "formBasedAuthentication",
    authMethodConfigParams,
  });
  console.log("[ZapAuth] Set form-based authentication method");

  // 4. Set logged-in / logged-out indicators (session detection)
  if (authConfig.loggedInIndicator) {
    await zapApi("authentication/action/setLoggedInIndicator/", {
      contextId,
      loggedInIndicatorRegex: authConfig.loggedInIndicator,
    });
    console.log(
      `[ZapAuth] Logged-in indicator: ${authConfig.loggedInIndicator}`,
    );
  }

  if (authConfig.loggedOutIndicator) {
    await zapApi("authentication/action/setLoggedOutIndicator/", {
      contextId,
      loggedOutIndicatorRegex: authConfig.loggedOutIndicator,
    });
    console.log(
      `[ZapAuth] Logged-out indicator: ${authConfig.loggedOutIndicator}`,
    );
  }

  // 5. Create a user in the context
  const userRes = await zapApi("users/action/newUser/", {
    contextId,
    name: "scanner-user",
  });
  const userId = userRes.userId;
  console.log(`[ZapAuth] Created user id=${userId}`);

  // 6. Set user credentials
  const credConfigParams = `username=${encodeURIComponent(authConfig.username)}&password=${encodeURIComponent(authConfig.password)}`;
  await zapApi("users/action/setAuthenticationCredentials/", {
    contextId,
    userId,
    authCredentialsConfigParams: credConfigParams,
  });
  console.log("[ZapAuth] Set user credentials");

  // 7. Enable the user
  await zapApi("users/action/setUserEnabled/", {
    contextId,
    userId,
    enabled: "true",
  });

  // 8. Set forced-user mode so every request is authenticated
  await zapApi("forcedUser/action/setForcedUser/", { contextId, userId });
  await zapApi("forcedUser/action/setForcedUserModeEnabled/", {
    boolean: "true",
  });
  console.log("[ZapAuth] Forced-user mode enabled ✓");

  return { contextId, userId };
}

export async function testAuthentication(zap, targetUrl, authConfig) {
  try {
    try {
      const parsed = new URL(authConfig.loginUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return {
          success: false,
          message: "Login URL must start with http:// or https://",
        };
      }
    } catch (_) {
      return {
        success: false,
        message:
          "Invalid Login URL. Please provide a full URL (e.g. https://target.com/login).",
      };
    }

    // Start a clean session for the test
    await zapApi("core/action/newSession/", {});

    console.log("[ZapAuth] Starting authentication test");
    configureAuthentication(zap, targetUrl, authConfig);
    console.log("[ZapAuth] Authentication configured, triggering login…");

    // Make ZAP access the target — this triggers the forced-user authentication flow
    // ZAP will automatically try to authenticate via the login URL first
    await zapApi("core/action/accessUrl/", {
      url: targetUrl,
      followRedirects: "true",
    });

    // Give ZAP time to authenticate and receive responses
    await new Promise((resolve) => setTimeout(resolve, 4000));

    // Fetch ALL HTTP messages ZAP recorded (not scoped to targetUrl,
    // because the login POST goes to loginUrl which may be a different host)
    const allMessagesRes = await zapApi("core/view/messages/", {
      baseurl: "",
      start: "0",
      count: "20",
    });
    const allMessages = allMessagesRes.messages || [];
    console.log(
      `[ZapAuth] Captured ${allMessages.length} total HTTP message(s)`,
    );

    // ── Look for the login POST response specifically ──
    const loginUrlLower = authConfig.loginUrl.toLowerCase();
    const loginMsg = allMessages.find(
      (m) =>
        m.requestHeader &&
        m.requestHeader.toLowerCase().includes(loginUrlLower),
    );

    if (!loginMsg) {
      // ZAP never sent a request to the login URL → auth definitely failed
      console.log("[ZapAuth] ✗ No request found to login URL — auth failed");
      await cleanupAuth(zap);
      return {
        success: false,
        message:
          "Authentication failed — ZAP could not reach the login URL. Check the Login URL is correct and reachable.",
      };
    }

    // Parse the login response
    const loginResponseCode = parseInt(
      loginMsg.responseHeader?.match(/HTTP\/\d\.?\d?\s+(\d{3})/)?.[1] || "0",
      10,
    );
    const loginResponseBody = loginMsg.responseBody || "";

    console.log(
      `[ZapAuth] Login response: HTTP ${loginResponseCode}, body length: ${loginResponseBody.length}`,
    );

    // If the login request itself failed (4xx/5xx), auth failed
    if (loginResponseCode >= 400) {
      await cleanupAuth(zap);
      return {
        success: false,
        message: `Authentication failed — login returned HTTP ${loginResponseCode}. Check your credentials and login URL.`,
      };
    }

    // ── Now check the TARGET page response for logged-in/out indicators ──
    const targetMessages = allMessages.filter(
      (m) =>
        m.requestHeader &&
        m.requestHeader.toLowerCase().includes(targetUrl.toLowerCase()) &&
        !m.requestHeader.toLowerCase().includes(loginUrlLower),
    );
    const targetMsg = targetMessages[targetMessages.length - 1]; // last target response
    const targetBody = targetMsg?.responseBody || loginResponseBody;

    // Check logged-in indicator
    if (authConfig.loggedInIndicator) {
      const loggedInRegex = new RegExp(authConfig.loggedInIndicator, "i");
      if (loggedInRegex.test(targetBody)) {
        console.log("[ZapAuth] ✓ Logged-in indicator found in response");
        await cleanupAuth(zap);
        return {
          success: true,
          message:
            "Authentication successful — logged-in indicator found in response.",
        };
      } else {
        console.log("[ZapAuth] ✗ Logged-in indicator NOT found in response");
        await cleanupAuth(zap);
        return {
          success: false,
          message: `Authentication uncertain — logged-in indicator "${authConfig.loggedInIndicator}" was not found. Check your credentials or indicator pattern.`,
        };
      }
    }

    // Check logged-out indicator
    if (authConfig.loggedOutIndicator) {
      const loggedOutRegex = new RegExp(authConfig.loggedOutIndicator, "i");
      if (loggedOutRegex.test(targetBody)) {
        console.log("[ZapAuth] ✗ Logged-out indicator found — auth failed");
        await cleanupAuth(zap);
        return {
          success: false,
          message:
            "Authentication failed — logged-out indicator found in response. Check your credentials.",
        };
      }
    }

    // No indicators provided — login request succeeded (2xx/3xx) but we can't confirm session
    await cleanupAuth(zap);
    return {
      success: true,
      message: `Login request succeeded (HTTP ${loginResponseCode}). For more reliable results, provide a Logged-In Indicator to verify the session.`,
    };
  } catch (error) {
    console.error("[ZapAuth] Authentication test failed:", error.message);
    try {
      await cleanupAuth(zap);
    } catch (_) {
      /* ignore cleanup errors */
    }
    return {
      success: false,
      message: `Authentication test error: ${error.message}`,
    };
  }
}

/**
 * Disable forced-user mode after a scan completes.
 */
export async function cleanupAuth(_zap) {
  try {
    await zapApi("forcedUser/action/setForcedUserModeEnabled/", {
      boolean: "false",
    });
    console.log("[ZapAuth] Forced-user mode disabled (cleanup)");
  } catch (err) {
    console.warn("[ZapAuth] Cleanup warning:", err.message);
  }
}
