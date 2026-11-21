"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { safeLog } from "@/lib/security";
import {
  FaHome,
  FaUsers,
  FaHistory,
  FaClock,
  FaGamepad,
  FaPlus,
  FaUserShield,
  FaTrophy,
  FaUserCheck,
  FaQuestionCircle,
  FaBars,
  FaTimes,
} from "react-icons/fa";

interface DashboardLayoutProps {
  children: ReactNode;
  requireRole?: "user" | "reviewer" | "admin";
}

type NavSection = "overview" | "review" | "admin" | "community";

interface NavItem {
  href: string;
  icon: typeof FaHome;
  label: string;
  roles: string[];
  section: NavSection;
}

const SECTION_LABELS: Record<NavSection, string> = {
  overview: "Overview",
  review: "Review",
  admin: "Admin",
  community: "Community",
};

export default function DashboardLayout({
  children,
  requireRole,
}: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingGameSubmissionsCount, setPendingGameSubmissionsCount] =
    useState(0);
  const [pendingFaqSubmissionsCount, setPendingFaqSubmissionsCount] =
    useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      const callbackUrl = encodeURIComponent(pathname);
      router.push(`/auth/signin?callbackUrl=${callbackUrl}`);
      return;
    }

    if (status === "authenticated" && session) {
      const userRole = session.user.role;
      if (userRole === "user") {
        router.push("/");
        return;
      }
    }
  }, [status, router, session, pathname]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    const userRole = session.user.role;
    if (userRole !== "reviewer" && userRole !== "admin") return;

    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;
    let debounceTimeout: NodeJS.Timeout | null = null;

    const fetchPendingCount = async () => {
      if (!isMounted) return;
      try {
        const response = await fetch("/api/corrections?status=pending");
        if (response.ok && isMounted) {
          const data = await response.json();
          setPendingCount(data.corrections?.length || 0);
        }
      } catch (error) {
        if (isMounted) {
          safeLog.error("Error fetching pending corrections count:", error);
        }
      }
    };

    fetchPendingCount();
    intervalId = setInterval(fetchPendingCount, 60000);

    const handleCorrectionsUpdated = () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        if (isMounted) fetchPendingCount();
      }, 500);
    };
    window.addEventListener("correctionsUpdated", handleCorrectionsUpdated);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
      if (debounceTimeout) clearTimeout(debounceTimeout);
      window.removeEventListener("correctionsUpdated", handleCorrectionsUpdated);
    };
  }, [status, session]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    const userRole = session.user.role;
    if (userRole !== "reviewer" && userRole !== "admin") return;

    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;
    let debounceTimeout: NodeJS.Timeout | null = null;

    const fetchPendingGameSubmissionsCount = async () => {
      if (!isMounted) return;
      try {
        const response = await fetch("/api/game-submissions?status=pending");
        if (response.ok && isMounted) {
          const data = await response.json();
          setPendingGameSubmissionsCount(Array.isArray(data) ? data.length : 0);
        }
      } catch (error) {
        if (isMounted) {
          safeLog.error(
            "Error fetching pending game submissions count:",
            error
          );
        }
      }
    };

    fetchPendingGameSubmissionsCount();
    intervalId = setInterval(fetchPendingGameSubmissionsCount, 90000);

    const handleGameSubmissionsUpdated = () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        if (isMounted) fetchPendingGameSubmissionsCount();
      }, 500);
    };
    window.addEventListener(
      "gameSubmissionsUpdated",
      handleGameSubmissionsUpdated
    );

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
      if (debounceTimeout) clearTimeout(debounceTimeout);
      window.removeEventListener(
        "gameSubmissionsUpdated",
        handleGameSubmissionsUpdated
      );
    };
  }, [status, session]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    const userRole = session.user.role;
    if (userRole !== "reviewer" && userRole !== "admin") return;

    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;
    let debounceTimeout: NodeJS.Timeout | null = null;

    const fetchPendingFaqSubmissionsCount = async () => {
      if (!isMounted) return;
      try {
        const response = await fetch("/api/faq-submissions?status=pending");
        if (response.ok && isMounted) {
          const data = await response.json();
          setPendingFaqSubmissionsCount(Array.isArray(data) ? data.length : 0);
        }
      } catch (error) {
        if (isMounted) {
          safeLog.error(
            "Error fetching pending FAQ submissions count:",
            error
          );
        }
      }
    };

    fetchPendingFaqSubmissionsCount();
    intervalId = setInterval(fetchPendingFaqSubmissionsCount, 60000);

    const handleFaqSubmissionsUpdated = () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        if (isMounted) fetchPendingFaqSubmissionsCount();
      }, 500);
    };
    window.addEventListener(
      "faqSubmissionsUpdated",
      handleFaqSubmissionsUpdated
    );

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
      if (debounceTimeout) clearTimeout(debounceTimeout);
      window.removeEventListener(
        "faqSubmissionsUpdated",
        handleFaqSubmissionsUpdated
      );
    };
  }, [status, session]);

  if (status !== "loading" && !session) {
    return null;
  }

  if (requireRole && status === "authenticated" && session) {
    const userRole = session.user.role;
    const hasPermission =
      userRole === "admin" ||
      (requireRole === "reviewer" && userRole === "reviewer") ||
      requireRole === "user";

    if (!hasPermission) {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))] mb-2">
              Access Denied
            </h1>
            <p className="text-[rgb(var(--text-secondary))] mb-4">
              You don&apos;t have permission to access this page.
            </p>
            <Link
              href="/dashboard"
              className="text-[#107c10] hover:underline"
              prefetch={true}
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      );
    }
  }

  const navItems: NavItem[] = [
    {
      href: "/dashboard",
      icon: FaHome,
      label: "Dashboard",
      roles: ["reviewer", "admin"],
      section: "overview",
    },
    {
      href: "/dashboard/submissions",
      icon: FaClock,
      label: "Corrections",
      roles: ["reviewer", "admin"],
      section: "review",
    },
    {
      href: "/dashboard/game-submissions",
      icon: FaPlus,
      label: "Game Submissions",
      roles: ["reviewer", "admin"],
      section: "review",
    },
    {
      href: "/dashboard/faq-submissions",
      icon: FaQuestionCircle,
      label: "FAQ Submissions",
      roles: ["reviewer", "admin"],
      section: "review",
    },
    {
      href: "/dashboard/users",
      icon: FaUsers,
      label: "Users",
      roles: ["admin"],
      section: "admin",
    },
    {
      href: "/dashboard/games",
      icon: FaGamepad,
      label: "Manage Games",
      roles: ["admin"],
      section: "admin",
    },
    {
      href: "/dashboard/audit",
      icon: FaHistory,
      label: "Audit Log",
      roles: ["admin"],
      section: "admin",
    },
    {
      href: "/dashboard/moderation",
      icon: FaUserShield,
      label: "Moderation Log",
      roles: ["admin"],
      section: "admin",
    },
    {
      href: "/leaderboard",
      icon: FaTrophy,
      label: "Leaderboard",
      roles: ["reviewer", "admin"],
      section: "community",
    },
    {
      href: "/dashboard/reviewer-applications",
      icon: FaUserCheck,
      label: "Reviewer Applications",
      roles: ["admin"],
      section: "community",
    },
  ];

  const userRole = session?.user.role;
  const visibleNavItems = userRole
    ? navItems.filter((item) => item.roles.includes(userRole))
    : [];

  const sections: NavSection[] = ["overview", "review", "admin", "community"];

  const renderNavLink = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;
    const showCorrectionsBadge =
      item.href === "/dashboard/submissions" && pendingCount > 0;
    const showGameSubmissionsBadge =
      item.href === "/dashboard/game-submissions" &&
      pendingGameSubmissionsCount > 0;
    const showFaqSubmissionsBadge =
      item.href === "/dashboard/faq-submissions" &&
      pendingFaqSubmissionsCount > 0;
    const badgeCount = showCorrectionsBadge
      ? pendingCount
      : showGameSubmissionsBadge
        ? pendingGameSubmissionsCount
        : showFaqSubmissionsBadge
          ? pendingFaqSubmissionsCount
          : 0;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileNavOpen(false)}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
          isActive
            ? "bg-[#107c10] text-white"
            : "text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-card))] hover:text-[rgb(var(--text-primary))]"
        }`}
      >
        <Icon size={18} />
        <span className="font-medium">{item.label}</span>
        {item.section === "community" && item.href === "/leaderboard" && (
          <span className="ml-auto bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-[10px] font-bold rounded px-1.5 py-0.5 uppercase">
            Beta
          </span>
        )}
        {badgeCount > 0 && (
          <span className="ml-auto bg-orange-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[rgb(var(--border-color))] flex-shrink-0">
        <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">
          Dashboard
        </h2>
        {session ? (
          <>
            <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">
              {session.user.name || session.user.email}
            </p>
            <p className="text-xs text-[#107c10] capitalize">{session.user.role}</p>
          </>
        ) : (
          <div className="mt-2 space-y-2" aria-hidden>
            <div className="h-3 w-32 bg-[rgb(var(--bg-card))] rounded animate-pulse" />
            <div className="h-3 w-16 bg-[rgb(var(--bg-card))] rounded animate-pulse" />
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {status === "loading" ? (
          <div className="space-y-2" aria-hidden>
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-11 rounded-lg bg-[rgb(var(--bg-card))] animate-pulse"
              />
            ))}
          </div>
        ) : (
          sections.map((section) => {
            const items = visibleNavItems.filter(
              (item) => item.section === section
            );
            if (items.length === 0) return null;
            return (
              <div key={section} className="pb-3">
                {section !== "overview" && (
                  <div className="pt-2 pb-2 px-2">
                    <div className="text-xs font-semibold text-[rgb(var(--text-muted))] uppercase tracking-wider">
                      {SECTION_LABELS[section]}
                    </div>
                  </div>
                )}
                <div className="space-y-1">{items.map(renderNavLink)}</div>
              </div>
            );
          })
        )}
      </nav>

      <div className="p-4 border-t border-[rgb(var(--border-color))] flex-shrink-0 min-h-[3.5rem] relative z-10 bg-[rgb(var(--bg-sidebar))]">
        <Link
          href="/"
          className="flex items-center gap-2 text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] text-sm transition-colors whitespace-nowrap"
        >
          ← Back to Site
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[rgb(var(--bg-dashboard))]">
      {/* Desktop / large tablet sidebar */}
      <aside className="hidden lg:block w-72 bg-[rgb(var(--bg-sidebar))] border-r border-[rgb(var(--border-color))] fixed top-16 left-0 h-[calc(100vh-4rem)] flex-shrink-0 z-10">
        {sidebarContent}
      </aside>

      {/* Mobile dashboard nav */}
      <div className="lg:hidden fixed top-16 left-0 right-0 z-30 border-b border-[rgb(var(--border-color))] bg-[rgb(var(--bg-sidebar))]">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => setMobileNavOpen((open) => !open)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-card))] focus:outline-none focus:ring-2 focus:ring-[#107c10]/40 touch-manipulation"
            aria-expanded={mobileNavOpen}
            aria-label={
              mobileNavOpen ? "Close dashboard menu" : "Open dashboard menu"
            }
          >
            {mobileNavOpen ? <FaTimes size={16} /> : <FaBars size={16} />}
            Dashboard menu
          </button>
          {(pendingCount +
            pendingGameSubmissionsCount +
            pendingFaqSubmissionsCount) >
            0 && (
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="flex max-w-[55%] flex-col items-end gap-0.5 rounded-md px-2 py-1 text-right touch-manipulation"
              aria-label="Open dashboard menu to view pending queues"
            >
              <span className="bg-orange-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 inline-flex items-center justify-center px-1.5">
                {pendingCount +
                  pendingGameSubmissionsCount +
                  pendingFaqSubmissionsCount >
                99
                  ? "99+"
                  : pendingCount +
                    pendingGameSubmissionsCount +
                    pendingFaqSubmissionsCount}
              </span>
              <span className="text-[10px] leading-tight text-[rgb(var(--text-muted))]">
                {[
                  pendingCount > 0
                    ? `${pendingCount} correction${pendingCount === 1 ? "" : "s"}`
                    : null,
                  pendingGameSubmissionsCount > 0
                    ? `${pendingGameSubmissionsCount} game${pendingGameSubmissionsCount === 1 ? "" : "s"}`
                    : null,
                  pendingFaqSubmissionsCount > 0
                    ? `${pendingFaqSubmissionsCount} FAQ`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </button>
          )}
        </div>
      </div>

      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close dashboard menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute top-16 left-0 bottom-0 w-[min(20rem,88vw)] bg-[rgb(var(--bg-sidebar))] border-r border-[rgb(var(--border-color))] shadow-xl overflow-hidden">
            {sidebarContent}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 lg:ml-72">
        <div className="lg:hidden h-12 flex-shrink-0" aria-hidden />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
