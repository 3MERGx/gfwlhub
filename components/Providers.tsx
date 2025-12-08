"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { ThemeProvider } from "./ThemeProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={5 * 60} // Refetch session every 5 minutes to detect expiration
      refetchOnWindowFocus={true} // Refetch when user returns to the tab
    >
      <ThemeProvider>{children}</ThemeProvider>
    </SessionProvider>
  );
}

