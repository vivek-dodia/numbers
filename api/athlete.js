import { ATHLETE_ID, proxy } from "./_intervals.js";

export default function handler(_req, res) {
  return proxy(res, `/athlete/${ATHLETE_ID}`);
}
