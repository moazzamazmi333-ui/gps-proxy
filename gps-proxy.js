import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ================== CONFIG ==================
const PORT = process.env.PORT || 3000;
const GPS51_TOKEN = process.env.GPS51_TOKEN;

// GPS51 API base (DO NOT CHANGE)
const GPS51_API = "https://api.gps51.com/webapi";

// ================== CHECK ==================
app.get("/", (req, res) => {
  res.send("GPS51 Proxy Running ✅");
});

if (!GPS51_TOKEN) {
  console.error("❌ GPS51_TOKEN missing");
}

// ================== LAST POSITION ==================
app.post("/api/lastposition", async (req, res) => {
  try {
    const { deviceids } = req.body;

    if (!deviceids || !Array.isArray(deviceids)) {
      return res.status(400).json({ error: "deviceids array required" });
    }

    const url = `${GPS51_API}?action=lastposition&token=${GPS51_TOKEN}`;

    const gpsRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceids,
        serverid: 0,
        extend: "self"
      })
    });

    const text = await gpsRes.text();

    // GPS51 sometimes returns HTML on error
    if (!text.trim().startsWith("{")) {
      return res.status(500).json({
        error: "GPS51 returned non-JSON",
        preview: text.slice(0, 300)
      });
    }

    const data = JSON.parse(text);
    res.json(data);

  } catch (err) {
    console.error("❌ API ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== START ==================
app.listen(PORT, () => {
  console.log(`🚀 GPS proxy running on port ${PORT}`);
});
