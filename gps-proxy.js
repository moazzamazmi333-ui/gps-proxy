import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

/* ====== CORS FIX ====== */
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

const PORT = process.env.PORT || 3000;
const GPS51_TOKEN = process.env.GPS51_TOKEN;
const GPS51_API = "https://api.gps51.com/webapi";

/* ====== HEALTH CHECK ====== */
app.get("/", (req, res) => {
  res.send("GPS51 Proxy Running ✅");
});

/* ====== LAST POSITION ====== */
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

    if (!text.trim().startsWith("{")) {
      return res.status(500).json({
        error: "GPS51 returned non-JSON",
        preview: text.slice(0, 300)
      });
    }

    res.json(JSON.parse(text));

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ====== START SERVER ====== */
app.listen(PORT, () => {
  console.log(`🚀 GPS proxy running on port ${PORT}`);
});
