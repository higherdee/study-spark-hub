import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme | "system") => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, applyTheme] = useState<Theme>("light");
  const [preference, setPreference] = useState<Theme | "system">(() => {
    try {
      const saved =
        typeof window !== "undefined" ? localStorage.getItem("syllaboss-appearance") : null;
      return saved === "dark" || saved === "light" ? saved : "system";
    } catch {
      return "system";
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("syllaboss-appearance");
      if (saved === "dark" || saved === "light") setPreference(saved);
    } catch {
      /* Storage may be unavailable. */
    }
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      const current = preference === "system" ? (media.matches ? "dark" : "light") : preference;
      applyTheme(current);
      document.documentElement.classList.toggle("dark", current === "dark");
      document.documentElement.classList.toggle("light", current === "light");
      document.documentElement.style.colorScheme = current;
      document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach(meta=>{meta.content=current==="dark"?"#101d17":"#f6f5ef"});
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [preference]);
  const setTheme = (next: Theme | "system") => {
    setPreference(next);
    try {
      localStorage.setItem("syllaboss-appearance", next);
    } catch {
      /* Keep the in-session preference. */
    }
  };
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
