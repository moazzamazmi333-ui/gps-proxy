import express from "express";
import fetch from "node-fetch";

const app = express();

/* ===== Root check ===== */
app.get("/", (req, res) => {
  res.send("GPS51 Proxy Running");
});

/* ===== Location API ===== */
app.get("/api/location", async (req, res) => {
  try {
    const deviceid = req.query.deviceid;
    if (!deviceid) {
      return res.status(400).json({ error: "deviceid required" });
    }

    const GPS51_URL = process.env.GPS51_URL;
    const GPS51_TOKEN = process.env.GPS51_TOKEN;

    if (!GPS51_URL || !GPS51_TOKEN) {
      return res.status(500).json({ error: "GPS51 env missing" });
    }

    const url =
      `${GPS51_URL}/StandardApiAction_poibatch.action?token=${GPS51_TOKEN}`;

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        points: [{ deviceid }]
      })
    });

    const text = await r.text();

    try {
      res.json(JSON.parse(text));
    } catch {
      res.status(500).json({
        error: "GPS51 returned non-JSON",
        preview: text.slice(0, 200)
      });
    }

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ===== Start server ===== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("GPS proxy running on port", PORT);
});
