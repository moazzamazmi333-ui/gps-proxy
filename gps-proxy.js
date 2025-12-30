// gps-proxy.js
import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

/* ===== CORS ===== */
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

/* ===== GPS LOCATION API ===== */
app.get("/api/location", async (req, res) => {
  try {
    const deviceid = req.query.deviceid;
    if (!deviceid) {
      return res.status(400).json({ error: "deviceid required" });
    }

    const GPS51_URL = process.env.GPS51_URL;
    const GPS51_USER = process.env.GPS51_USER;
    const GPS51_PASS = process.env.GPS51_PASS;

    if (!GPS51_URL || !GPS51_USER || !GPS51_PASS) {
      return res.status(500).json({ error: "GPS51 env missing" });
    }

    /* 1️⃣ LOGIN (HTML response is OK) */
    const loginUrl =
      `${GPS51_URL}/StandardApiAction_login.action` +
      `?account=${GPS51_USER}&password=${GPS51_PASS}`;

    const loginRes = await fetch(loginUrl, { redirect: "manual" });
    const cookie = loginRes.headers.get("set-cookie");

    if (!cookie) {
      return res.status(401).json({ error: "GPS51 login failed" });
    }

    /* 2️⃣ FETCH DEVICE DATA */
    const dataUrl =
      `${GPS51_URL}/StandardApiAction_getDeviceStatus.action?deviceId=${deviceid}`;

    const dataRes = await fetch(dataUrl, {
      headers: { cookie }
    });

    const text = await dataRes.text();

    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({
        error: "GPS51 returned non-JSON",
        preview: text.slice(0, 120)
      });
    }

    res.json(json);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* ===== START SERVER ===== */
app.listen(PORT, () => {
  console.log("GPS proxy running on port", PORT);
});
