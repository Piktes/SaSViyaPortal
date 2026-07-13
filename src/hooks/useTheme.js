import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "bys_theme"; // "dark" | "light"

// Koyu tema varsayilan; tercih localStorage'da tutulur, body class'i ile uygulanir
// (newsagent'taki duzenin aynisi: body.light-theme -> acik palet).
export function useTheme() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem(STORAGE_KEY) !== "light");

  useEffect(() => {
    document.body.classList.toggle("light-theme", !isDark);
    localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = useCallback(() => setIsDark((v) => !v), []);

  return { isDark, toggleTheme, logoSrc: isDark ? "/meb-logo-white.png" : "/meb-logo-red.png" };
}
