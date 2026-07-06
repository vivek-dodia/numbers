import { ATHLETE_ID, proxy } from "./_intervals.js";

export default function handler(req, res) {
  return proxy(res, `/athlete/${ATHLETE_ID}/activities`, {
    oldest: req.query.oldest,
    newest: req.query.newest,
  });
}
