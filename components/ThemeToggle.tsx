"use client";

import { FaMoon, FaSun } from "react-icons/fa";
import { useTheme } from "./ThemeProvider";

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={`rounded-md p-2 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white ${className}`}
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
    >
      {theme === "dark" ? <FaSun size={16} /> : <FaMoon size={16} />}
    </button>
  );
}
