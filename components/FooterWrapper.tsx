"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";

/**
 * Wraps Footer and adds left margin on lg screens when on dashboard
 * routes (they use DashboardLayout with a fixed sidebar) so the footer
 * is not hidden behind the sidebar and aligns with main content.
 */
export default function FooterWrapper() {
  const pathname = usePathname();
  const hasSidebar = pathname?.startsWith("/dashboard");

  return (
    <div className={hasSidebar ? "lg:ml-72" : undefined}>
      <Footer />
    </div>
  );
}
