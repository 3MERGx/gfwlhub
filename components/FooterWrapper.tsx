"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";

/**
 * Wraps Footer and adds left margin on xl screens when on dashboard or
 * leaderboard routes (they use DashboardLayout with fixed sidebar) so the
 * footer is not hidden behind the sidebar and aligns with main content.
 */
export default function FooterWrapper() {
  const pathname = usePathname();
  const hasSidebar =
    pathname?.startsWith("/dashboard") || pathname === "/leaderboard";

  return (
    <div className={hasSidebar ? "xl:ml-72" : undefined}>
      <Footer />
    </div>
  );
}
