import type { Activity, SessionState, Wellness } from "../types";

async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json() as Promise<T>;
}

export function getSession(): Promise<SessionState> {
  return getJSON<SessionState>("/api/session");
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
