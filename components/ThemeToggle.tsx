"use client";

import { FaMoon, FaSun } from "react-icons/fa";
import { useTheme } from "./ThemeProvider";

interface ThemeToggleProps {
  className?: string;
  /** When set, renders as a full labeled control (label + icon). */
  label?: string;
}

export default function ThemeToggle({ className = "", label }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const nextMode = theme === "dark" ? "light" : "dark";
  const ariaLabel =
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={() => setTheme(nextMode)}
      className={
        label
          ? `flex w-full items-center justify-between gap-3 rounded-md py-1 text-left text-sm text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white ${className}`
          : `rounded-md p-2 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white ${className}`
      }
      aria-label={ariaLabel}
    >
      {label ? <span>{label}</span> : null}
      <span className={label ? "rounded-md p-2" : undefined} aria-hidden>
        {theme === "dark" ? <FaSun size={16} /> : <FaMoon size={16} />}
      </span>
    </button>
  );
}
