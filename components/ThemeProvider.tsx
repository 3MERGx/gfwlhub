"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize theme from localStorage or check if dark class is already applied
  // This syncs with the blocking script in layout.tsx
  const getInitialTheme = (): Theme => {
    if (typeof window === "undefined") return "dark";
    
    // Check if dark class is already applied (by the blocking script)
    const hasDarkClass = document.documentElement.classList.contains("dark");
    
    // Get theme from localStorage
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    
    if (savedTheme && (savedTheme === "dark" || savedTheme === "light")) {
      return savedTheme;
    }
    
    // If dark class is applied but no localStorage, use dark
    if (hasDarkClass) {
      return "dark";
    }
    
    // Default to dark
    return "dark";
  };

  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Sync with localStorage (script already applied the class, just sync state)
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme && (savedTheme === "dark" || savedTheme === "light")) {
      setThemeState(savedTheme);
      // Ensure class is applied (should already be from script, but ensure it)
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      // Default to dark - ensure class is applied
      setThemeState("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

