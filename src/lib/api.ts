import type { Activity, SessionState, Wellness } from "../types";

async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json() as Promise<T>;
}

// Returns the session, or { locked: true } if the site password gate is on and
// this browser hasn't unlocked yet.
export async function getSession(): Promise<SessionState | { locked: true }> {
  const r = await fetch("/api/session", { credentials: "include" });
  if (r.status === 401) return { locked: true };
  if (!r.ok) throw new Error(`/api/session → ${r.status}`);
  return r.json();
}

export async function unlock(password: string): Promise<boolean> {
  const r = await fetch("/api/unlock", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return r.ok;
}

export async function apiKeyLogin(): Promise<{ ok: boolean; athlete: { id: string; name: string } }> {
  const r = await fetch("/auth/apikey-login", { method: "POST", credentials: "include" });
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.error || `Login failed (${r.status})`);
  }
  return r.json();
}

export async function logout(): Promise<void> {
  await fetch("/auth/logout", { method: "POST", credentials: "include" });
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function getActivities(oldest: string, newest = iso(new Date())): Promise<Activity[]> {
  return getJSON<Activity[]>(`/api/activities?oldest=${oldest}&newest=${newest}`);
}

export function getWellness(oldest: string, newest = iso(new Date())): Promise<Wellness[]> {
  return getJSON<Wellness[]>(`/api/wellness?oldest=${oldest}&newest=${newest}`);
}

// Open the OAuth popup and resolve once the callback posts back success.
export function oauthPopupLogin(): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const w = 520;
    const h = 680;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(
      "/auth/login",
      "intervals-oauth",
      `width=${w},height=${h},left=${left},top=${top}`,
    );
    const onMessage = (e: MessageEvent) => {
      if (e.data?.source !== "intervals-oauth") return;
      window.removeEventListener("message", onMessage);
      clearInterval(poll);
      resolve({ ok: !!e.data.ok, error: e.data.error });
    };
    window.addEventListener("message", onMessage);
    // Fallback: if the user closes the popup without finishing.
    const poll = setInterval(() => {
      if (popup && popup.closed) {
        clearInterval(poll);
        window.removeEventListener("message", onMessage);
        resolve({ ok: false, error: "Window closed" });
      }
    }, 500);
  });
}
