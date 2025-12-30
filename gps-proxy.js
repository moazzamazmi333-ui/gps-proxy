app.get("/api/location", async (req, res) => {
  try {
    const deviceid = req.query.deviceid;
    if (!deviceid) {
      return res.status(400).json({ error: "deviceid required" });
    }

    const GPS51_URL = process.env.GPS51_URL;
    const GPS51_TOKEN = process.env.GPS51_TOKEN;

    if (!GPS51_URL || !GPS51_TOKEN) {
      return res.status(500).json({ error: "GPS51 token missing" });
    }

    /* 🔐 TOKEN BASED REQUEST (GPS51 CLOUD) */
    const url =
      `${GPS51_URL}/StandardApiAction_getDeviceStatus.action` +
      `?deviceId=${deviceid}&jsession=${GPS51_TOKEN}`;

    const r = await fetch(url);
    const text = await r.text();

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return res.status(500).json({
        error: "Non JSON from GPS51",
        preview: text.slice(0, 120)
      });
    }

    res.json(json);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
