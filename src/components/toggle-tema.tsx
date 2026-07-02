"use client";

import { useEffect, useState } from "react";

export default function ToggleTema() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") { setDark(true); document.documentElement.classList.add("dark"); }
    else if (stored === "light") { document.documentElement.classList.remove("dark"); }
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) { setDark(true); document.documentElement.classList.add("dark"); }
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label="Alternar tema"
      className="w-9 h-9 flex items-center justify-center rounded-xl
                 text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-hover)]
                 transition-all text-lg"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
