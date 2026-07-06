import { useEffect, useState } from "react";

const KEY = "numbers-theme";

function apply(warm: boolean) {
  const el = document.documentElement;
  if (warm) el.setAttribute("data-theme", "warm");
  else el.removeAttribute("data-theme");
}

export default function ThemeToggle() {
  const [warm, setWarm] = useState(false);

  useEffect(() => {
    const w = localStorage.getItem(KEY) === "warm";
    setWarm(w);
    apply(w);
  }, []);

  function toggle() {
    const next = !warm;
    setWarm(next);
    localStorage.setItem(KEY, next ? "warm" : "print");
    apply(next);
  }

  return (
    <button
      onClick={toggle}
      aria-pressed={warm}
      aria-label={warm ? "Switch to print mode" : "Switch to warm mode"}
      className={`ml-auto size-6 grid place-items-center border transition-colors ${
        warm ? "bg-ink text-paper border-ink" : "border-ink text-ink hover:bg-ink hover:text-paper"
      }`}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <circle cx="8" cy="8" r="3.1" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
          const r = (a * Math.PI) / 180;
          return (
            <line
              key={a}
              x1={8 + Math.cos(r) * 5}
              y1={8 + Math.sin(r) * 5}
              x2={8 + Math.cos(r) * 6.6}
              y2={8 + Math.sin(r) * 6.6}
            />
          );
        })}
      </svg>
    </button>
  );
}
