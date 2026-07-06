import { COOKIE, GATED, TOKEN, hash } from "./_intervals.js";

// POST { password } — verifies against SITE_PASSWORD and sets the unlock cookie.
export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  if (!GATED) return res.json({ ok: true }); // no gate configured
  const pw = (req.body && req.body.password) || "";
  if (hash(pw) !== TOKEN) return res.status(401).json({ error: "ACCESS DENIED" });
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${TOKEN}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}`,
  );
  res.json({ ok: true });
}
