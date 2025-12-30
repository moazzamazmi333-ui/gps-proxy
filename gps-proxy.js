// gps-proxy.js
import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== CORS (VERY IMPORTANT) ===== */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

/* ===== HEALTH CHECK ===== */
app.get("/", (req, res) => {
  res.json({ status: "GPS Proxy running" });
});

/* ===== MAIN GPS ENDPOINT ===== */
app.get("/api/location", async (req, res) => {
  try {
    const deviceid = req.query.deviceid;
    if (!deviceid) {
      return res.status(400).json({ error: "deviceid required" });
    }

    /* 🔐 GPS51 ENV VARIABLES (already in Render) */
    const GPS51_URL = process.env.GPS51_URL; // example: http://120.77.xx.xx
    const GPS51_USER = process.env.GPS51_USER;
    const GPS51_PASS = process.env.GPS51_PASS;

    if (!GPS51_URL || !GPS51_USER || !GPS51_PASS) {
      return res.status(500).json({ error: "GPS51 env missing" });
    }

    /* ===== LOGIN ===== */
    const loginUrl =
      `${GPS51_URL}/StandardApiAction_login.action` +
      `?account=${GPS51_USER}&password=${GPS51_PASS}`;

    const loginRes = await fetch(loginUrl);
    const loginJson = await loginRes.json();

    if (loginJson.result !== 0) {
      return res.status(401).json({ error: "GPS51 login failed", loginJson });
    }

    /* ===== FETCH LOCATION ===== */
    const locUrl =
      `${GPS51_URL}/StandardApiAction_getDeviceStatus.action` +
      `?deviceId=${deviceid}`;

    const locRes = await fetch(locUrl);
    const locJson = await locRes.json();

    /* 🔥 IMPORTANT LOG */
    console.log("GPS51 DATA:", JSON.stringify(locJson));

    return res.json(locJson);

  } catch (err) {
    console.error("GPS proxy error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ===== START SERVER ===== */
app.listen(PORT, () => {
  console.log("GPS proxy running on port", PORT);
});
