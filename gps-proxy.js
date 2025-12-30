import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// =====================
// ENV VARIABLES (Render)
// =====================
const GPS51_TOKEN = process.env.GPS51_TOKEN;
const PORT = process.env.PORT || 3000;

if (!GPS51_TOKEN) {
  console.error("❌ GPS51_TOKEN missing");
}

// =====================
// LAST POSITION API
// =====================
app.post("/api/lastposition", async (req, res) => {
  try {
    const { deviceids } = req.body;

    if (!deviceids || !Array.isArray(deviceids)) {
      return res.status(400).json({ error: "deviceids array required" });
    }

    const gpsRes = await fetch(
      "https://api.gps51.com/webapi?action=lastposition",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: GPS51_TOKEN,
          deviceids,
          extend: "self"
        })
      }
    );

    const text = await gpsRes.text();

    // GPS51 sometimes returns HTML on error
    if (text.startsWith("<")) {
      return res.status(500).json({
        error: "GPS51 returned non-JSON",
        preview: text.slice(0, 200)
      });
    }

    const data = JSON.parse(text);
    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================
// HEALTH CHECK
// =====================
app.get("/", (req, res) => {
  res.send("GPS51 Proxy Running ✅");
});

// =====================
// START SERVER
// =====================
app.listen(PORT, () => {
  console.log(`🚀 GPS proxy running on port ${PORT}`);
});
