import { useCallback, useEffect, useState } from "react";
import type { HostInfo } from "../services/host";

type Theme = "light" | "dark";

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0a0b14" : "#4f46e5");
}

function initial(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** Thème clair/sombre : préférence utilisateur, ou thème de Teams/Outlook lorsque l'app y est intégrée. */
export function useTheme(host?: HostInfo) {
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    if (!host || host.kind === "browser" || !host.theme) return;
    const fromHost = (t: string) => setTheme(t === "default" ? "light" : "dark");
    fromHost(host.theme);
    host.onThemeChange?.(fromHost);
  }, [host]);

  useEffect(() => apply(theme), [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("reza.theme", next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
