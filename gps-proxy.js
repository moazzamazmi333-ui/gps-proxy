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

    // 🔥 EXACT API USED BY gps51.com (from your Network tab)
    const url =
      `${GPS51_URL}/StandardApiAction_poibatch.action` +
      `?token=${GPS51_TOKEN}`;

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        points: [
          { deviceid: deviceid }
        ]
      })
    });

    const text = await r.text();

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return res.status(500).json({
        error: "Still non-JSON from GPS51",
        preview: text.slice(0, 200)
      });
    }

    res.json(json);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
