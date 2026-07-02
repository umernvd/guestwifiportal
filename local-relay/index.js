const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json());

const {
  MOCK_OMADA,
  OMADA_API_BASE,
  OMADA_USERNAME,
  OMADA_PASSWORD,
  RELAY_API_KEY,
  PORT = 3001,
} = process.env;

function missingVars() {
  if (MOCK_OMADA === "true") {
    return ["RELAY_API_KEY"].filter((key) => !process.env[key]);
  }
  return ["OMADA_API_BASE", "OMADA_USERNAME", "OMADA_PASSWORD", "RELAY_API_KEY"].filter(
    (key) => !process.env[key]
  );
}

const missing = missingVars();
if (missing.length > 0) {
  console.error("[relay] Missing required env vars:", missing.join(", "));
  process.exit(1);
}

app.post("/relay/omada-auth", async (req, res) => {
  try {
    const apiKey = req.headers["x-api-key"];
    if (!apiKey || apiKey !== RELAY_API_KEY) {
      console.warn("[relay] Unauthorized request — invalid or missing x-api-key");
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    if (MOCK_OMADA === "true") {
      console.log("[relay] Mock mode active — returning success");
      return res.json({ success: true, mock: true });
    }

    const { clientMac, apMac, ssid, site } = req.body;

    if (!clientMac || !apMac || !ssid || site === undefined) {
      console.warn("[relay] Missing required body fields");
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields: clientMac, apMac, ssid, site" });
    }

    console.log("[relay] Omada auth request", { clientMac, apMac, ssid, site });

    const loginUrl = `${OMADA_API_BASE}/login`;
    console.log("[relay] Step A: Logging into Omada", { loginUrl });

    let loginRes;
    try {
      loginRes = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: OMADA_USERNAME, password: OMADA_PASSWORD }),
      });
    } catch (fetchErr) {
      console.error("[relay] Step A: Network error during login:", fetchErr.message);
      return res
        .status(502)
        .json({ success: false, error: `Omada login network error: ${fetchErr.message}` });
    }

    if (!loginRes.ok) {
      const loginBody = await loginRes.text();
      console.error("[relay] Step A: Login failed", {
        status: loginRes.status,
        body: loginBody,
      });
      return res.status(502).json({
        success: false,
        error: `Omada login failed (${loginRes.status})`,
      });
    }

    const csrfToken = loginRes.headers.get("csrf-token");
    if (!csrfToken) {
      console.error("[relay] Step A: No Csrf-Token in login response headers");
      return res
        .status(502)
        .json({ success: false, error: "Omada login did not return Csrf-Token" });
    }

    console.log("[relay] Step A: Login successful, Csrf-Token extracted", {
      csrfToken: csrfToken.slice(0, 8) + "...",
    });

    const authUrl = `${OMADA_API_BASE}/extPortal/auth`;
    console.log("[relay] Step B: Authorizing client", { authUrl, cid: clientMac, ap: apMac });

    let authRes;
    try {
      authRes = await fetch(authUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Csrf-Token": csrfToken,
        },
        body: JSON.stringify({
          cid: clientMac,
          ap: apMac,
          ssid,
          site,
          time: 86400,
        }),
      });
    } catch (fetchErr) {
      console.error("[relay] Step B: Network error during authorize:", fetchErr.message);
      return res
        .status(502)
        .json({ success: false, error: `Omada authorize network error: ${fetchErr.message}` });
    }

    const authBody = await authRes.json();
    console.log("[relay] Step B: Authorize response", {
      status: authRes.status,
      body: authBody,
    });

    if (!authRes.ok) {
      return res.status(502).json({
        success: false,
        error: `Omada authorize failed (${authRes.status})`,
        data: authBody,
      });
    }

    console.log("[relay] Omada auth complete — client authorized");

    return res.json({
      success: true,
      data: authBody,
    });
  } catch (error) {
    console.error("[relay] Unexpected error:", error);
    return res.status(500).json({ success: false, error: "Internal relay error" });
  }
});

app.listen(PORT, () => {
  console.log(`[relay] Omada relay listening on port ${PORT}`);
  console.log(`[relay] Mock mode: ${MOCK_OMADA === "true" ? "ENABLED" : "DISABLED"}`);
});
