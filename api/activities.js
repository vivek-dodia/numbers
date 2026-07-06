import { ATHLETE_ID, proxy, requireUnlock } from "./_intervals.js";

export default function handler(req, res) {
  if (!requireUnlock(req, res)) return;
  return proxy(res, `/athlete/${ATHLETE_ID}/activities`, {
    oldest: req.query.oldest,
    newest: req.query.newest,
  });
}
