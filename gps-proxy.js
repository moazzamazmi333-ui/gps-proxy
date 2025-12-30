app.get("/api/location", async (req, res) => {
  try {
    const deviceid = req.query.deviceid;
    if (!deviceid) {
      return res.status(400).json({ error: "deviceid required" });
    }

    const GPS51_URL = process.env.GPS51_URL;
    const GPS51_USER = process.env.GPS51_USER;
    const GPS51_PASS = process.env.GPS51_PASS;

    /* 1️⃣ LOGIN (HTML OK) */
    const loginUrl =
      `${GPS51_URL}/StandardApiAction_login.action` +
      `?account=${GPS51_USER}&password=${GPS51_PASS}`;

    const loginRes = await fetch(loginUrl, { redirect: "manual" });

    const cookie = loginRes.headers.get("set-cookie");
    if (!cookie) {
      return res.status(401).json({ error: "GPS51 login failed (no cookie)" });
    }

    /* 2️⃣ FETCH DEVICE STATUS USING COOKIE */
    const dataUrl =
      `${GPS51_URL}/StandardApiAction_getDeviceStatus.action?deviceId=${deviceid}`;

    const dataRes = await fetch(dataUrl, {
      headers: { cookie }
    });

    const text = await dataRes.text();

    /* 3️⃣ CONVERT TO JSON SAFELY */
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({
        error: "GPS51 returned non-JSON",
        preview: text.slice(0, 120)
      });
    }

    return res.json(json);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
