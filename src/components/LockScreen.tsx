import { useState } from "react";
import * as api from "../lib/api";

export default function LockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const ok = await api.unlock(pw);
      if (ok) onUnlocked();
      else setError("ACCESS DENIED");
    } catch {
      setError("CONNECTION ERROR");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-6">
      <form onSubmit={submit} className="w-full max-w-[420px] text-center">
        <div className="text-[13px] uppercase tracking-[0.14em]">&gt; ACCESS RESTRICTED</div>
        <div className="rule my-4" />
        <div className="text-[12px] uppercase tracking-[0.06em] text-dim mb-4">
          {"// enter passcode to mount ledger"}
        </div>
        <div className="flex items-stretch justify-center gap-2">
          <input
            type="password"
            value={pw}
            autoFocus
            onChange={(e) => setPw(e.target.value)}
            placeholder="PASSCODE"
            className="w-52 border border-ink bg-paper px-3 py-2 text-[13px] tracking-[0.08em] text-ink placeholder:text-faint outline-none focus:shadow-[3px_3px_0_0_rgba(10,10,10,0.16)]"
          />
          <button
            type="submit"
            disabled={busy || !pw}
            className="border border-ink px-4 py-2 text-[12px] uppercase tracking-[0.08em] transition-colors hover:bg-ink hover:text-paper disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-paper disabled:hover:text-ink"
          >
            {busy ? "…" : "> UNLOCK"}
          </button>
        </div>
        {error && (
          <div className="mt-4 text-[12px] uppercase tracking-[0.04em] border border-ink px-3 py-2 inline-block">
            ERR: {error}
          </div>
        )}
      </form>
    </div>
  );
}
