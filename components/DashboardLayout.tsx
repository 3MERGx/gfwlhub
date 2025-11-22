"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaHome,
  FaUsers,
  FaHistory,
  FaClock,
  FaGamepad,
  FaPlus,
  FaUserShield,
  FaTrophy,
  FaFlask,
} from "react-icons/fa";

interface DashboardLayoutProps {
  children: ReactNode;
  requireRole?: "user" | "reviewer" | "admin";
}

export default function DashboardLayout({
  children,
  requireRole,
}: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [pendingGameSubmissionsCount, setPendingGameSubmissionsCount] =
    useState<number>(0);

  useEffect(() => {
    // Redirect to signin if not authenticated
    if (status === "unauthenticated") {
      // Pass the current pathname as callbackUrl so user returns here after sign-in
      const callbackUrl = encodeURIComponent(pathname);
      router.push(`/auth/signin?callbackUrl=${callbackUrl}`);
      return;
    }

    // If authenticated, check if user has access to dashboard
    // Only reviewers and admins can access the dashboard area
    if (status === "authenticated" && session) {
      const userRole = session.user.role;
      // Regular users cannot access any dashboard pages
      if (userRole === "user") {
        router.push("/");
        return;
      }
    }
  }, [status, router, session, pathname]);

  // Fetch pending corrections count for reviewers and admins
  useEffect(() => {
    const fetchPendingCount = async () => {
      if (status === "authenticated" && session) {
        const userRole = session.user.role;
        // Only fetch for reviewers and admins
        if (userRole === "reviewer" || userRole === "admin") {
          try {
            const response = await fetch("/api/corrections?status=pending");
            if (response.ok) {
              const data = await response.json();
              setPendingCount(data.corrections?.length || 0);
            }
          } catch (error) {
            console.error("Error fetching pending corrections count:", error);
          }
        }
      }
    };

    fetchPendingCount();
    // Refresh count every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);
    
    // Listen for custom event to refresh immediately after review
    const handleCorrectionsUpdated = () => {
      fetchPendingCount();
    };
    window.addEventListener("correctionsUpdated", handleCorrectionsUpdated);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("correctionsUpdated", handleCorrectionsUpdated);
    };
  }, [status, session]);

  // Fetch pending game submissions count for reviewers and admins
  useEffect(() => {
    const fetchPendingGameSubmissionsCount = async () => {
      if (status === "authenticated" && session) {
        const userRole = session.user.role;
        // Only fetch for reviewers and admins
        if (userRole === "reviewer" || userRole === "admin") {
          try {
            const response = await fetch(
              "/api/game-submissions?status=pending"
            );
            if (response.ok) {
              const data = await response.json();
              // API returns array directly
              setPendingGameSubmissionsCount(
                Array.isArray(data) ? data.length : 0
              );
            }
          } catch (error) {
            console.error(
              "Error fetching pending game submissions count:",
              error
            );
          }
        }
      }
    };

    fetchPendingGameSubmissionsCount();
    // Refresh count every 30 seconds
    const interval = setInterval(fetchPendingGameSubmissionsCount, 30000);
    
    // Listen for custom event to refresh immediately after review
    const handleGameSubmissionsUpdated = () => {
      fetchPendingGameSubmissionsCount();
    };
    window.addEventListener("gameSubmissionsUpdated", handleGameSubmissionsUpdated);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("gameSubmissionsUpdated", handleGameSubmissionsUpdated);
    };
  }, [status, session]);

  // Show loading state while checking auth
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!session) {
    return null;
  }

  // Check role requirements
  if (requireRole) {
    const userRole = session.user.role;
    const hasPermission =
      userRole === "admin" ||
      (requireRole === "reviewer" && userRole === "reviewer") ||
      requireRole === "user";

    if (!hasPermission) {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">
              Access Denied
            </h1>
            <p className="text-gray-300 mb-4">
              You don&apos;t have permission to access this page.
            </p>
            <Link href="/dashboard" className="text-[#107c10] hover:underline">
              Return to Dashboard
            </Link>
          </div>
        </div>
      );
    }
  }

  const navItems = [
    {
      href: "/dashboard",
      icon: FaHome,
      label: "Dashboard",
      roles: ["reviewer", "admin"],
      section: "main",
    },
    {
      href: "/dashboard/submissions",
      icon: FaClock,
      label: "Corrections",
      roles: ["reviewer", "admin"],
      section: "main",
    },
    {
      href: "/dashboard/game-submissions",
      icon: FaPlus,
      label: "Game Submissions",
      roles: ["reviewer", "admin"],
      section: "main",
    },
    {
      href: "/dashboard/users",
      icon: FaUsers,
      label: "Users",
      roles: ["admin"],
      section: "main",
    },
    {
      href: "/dashboard/games",
      icon: FaGamepad,
      label: "Manage Games",
      roles: ["admin"],
      section: "main",
    },
    {
      href: "/dashboard/audit",
      icon: FaHistory,
      label: "Audit Log",
      roles: ["admin"],
      section: "main",
    },
    {
      href: "/dashboard/moderation",
      icon: FaUserShield,
      label: "Moderation Log",
      roles: ["admin"],
      section: "main",
    },
    {
      href: "/leaderboard",
      icon: FaTrophy,
      label: "Leaderboard",
      roles: ["admin"],
      section: "experimental",
    },
  ];

  const userRole = session.user.role;
  const visibleNavItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  );
  
  // Separate navigation items by section
  const mainNavItems = visibleNavItems.filter((item) => item.section === "main");
  const experimentalNavItems = visibleNavItems.filter((item) => item.section === "experimental");

  return (
    <div className="min-h-screen flex bg-[#121212]">
      {/* Sidebar - Only visible on xl screens and up */}
      <aside className="hidden xl:block w-72 bg-[#1a1a1a] border-r border-gray-700">
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">Dashboard</h2>
            <p className="text-xs text-gray-400 mt-1">
              {session.user.name || session.user.email}
            </p>
            <p className="text-xs text-[#107c10] capitalize">
              {session.user.role}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {/* Main Navigation */}
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const showCorrectionsBadge =
                item.href === "/dashboard/submissions" && pendingCount > 0;
              const showGameSubmissionsBadge =
                item.href === "/dashboard/game-submissions" &&
                pendingGameSubmissionsCount > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                    isActive
                      ? "bg-[#107c10] text-white"
                      : "text-gray-300 hover:bg-[#2d2d2d] hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-medium">{item.label}</span>
                  {showCorrectionsBadge && (
                    <span className="ml-auto bg-orange-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                      {pendingCount > 99 ? "99+" : pendingCount}
                    </span>
                  )}
                  {showGameSubmissionsBadge && (
                    <span className="ml-auto bg-orange-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                      {pendingGameSubmissionsCount > 99
                        ? "99+"
                        : pendingGameSubmissionsCount}
                    </span>
                  )}
                </Link>
              );
            })}
            
            {/* Experimental/Testing Section */}
            {experimentalNavItems.length > 0 && (
              <>
                <div className="pt-4 pb-2 px-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <FaFlask size={12} />
                    <span>Experimental</span>
                  </div>
                </div>
                {experimentalNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                        isActive
                          ? "bg-[#107c10] text-white"
                          : "text-gray-300 hover:bg-[#2d2d2d] hover:text-white"
                      }`}
                    >
                      <Icon size={18} />
                      <span className="font-medium">{item.label}</span>
                      <span className="ml-auto bg-yellow-500/20 text-yellow-400 text-[10px] font-bold rounded px-1.5 py-0.5 uppercase">
                        Beta
                      </span>
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-700">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
            >
              ← Back to Site
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Page Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
