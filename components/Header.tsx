"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { useSession } from "next-auth/react";
import UserMenu from "./UserMenu";
import { safeLog } from "@/lib/security";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session } = useSession();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [pendingGameSubmissionsCount, setPendingGameSubmissionsCount] =
    useState<number>(0);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Fetch pending corrections count for reviewers and admins
  useEffect(() => {
    // Only proceed if session exists and user is reviewer/admin
    if (!session) {
      return;
    }

    const userRole = session.user.role;
    if (userRole !== "reviewer" && userRole !== "admin") {
      return;
    }

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

    // Initial fetch
    fetchPendingCount();
    
    // Refresh count every 60 seconds (reduced frequency)
    intervalId = setInterval(fetchPendingCount, 60000);

    // Listen for custom event to refresh immediately after review (with debounce)
    const handleCorrectionsUpdated = () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      debounceTimeout = setTimeout(() => {
        if (isMounted) {
          fetchPendingCount();
        }
      }, 500); // Debounce to 500ms
    };
    window.addEventListener("correctionsUpdated", handleCorrectionsUpdated);

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      window.removeEventListener("correctionsUpdated", handleCorrectionsUpdated);
    };
  }, [session]);

  // Fetch pending game submissions count for reviewers and admins
  useEffect(() => {
    // Only proceed if session exists and user is reviewer/admin
    if (!session) {
      return;
    }

    const userRole = session.user.role;
    if (userRole !== "reviewer" && userRole !== "admin") {
      return;
    }

    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;
    let debounceTimeout: NodeJS.Timeout | null = null;

    const fetchPendingGameSubmissionsCount = async () => {
      if (!isMounted) return;
      
      try {
        const response = await fetch("/api/game-submissions?status=pending");
        if (response.ok && isMounted) {
          const data = await response.json();
          // API returns array directly
          setPendingGameSubmissionsCount(
            Array.isArray(data) ? data.length : 0
          );
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

    // Initial fetch
    fetchPendingGameSubmissionsCount();
    
    // Refresh count every 90 seconds (increased interval to reduce rate limiting)
    // Note: DashboardLayout also polls this endpoint, so we use a longer interval here
    intervalId = setInterval(fetchPendingGameSubmissionsCount, 90000);

    // Listen for custom event to refresh immediately after review (with debounce)
    const handleGameSubmissionsUpdated = () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      debounceTimeout = setTimeout(() => {
        if (isMounted) {
          fetchPendingGameSubmissionsCount();
        }
      }, 500); // Debounce to 500ms
    };
    window.addEventListener("gameSubmissionsUpdated", handleGameSubmissionsUpdated);

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
      window.removeEventListener("gameSubmissionsUpdated", handleGameSubmissionsUpdated);
    };
  }, [session]);

  return (
    <header className="sticky top-0 z-50 bg-[#107c10] text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Mobile menu button - Left side on mobile/tablet/iPad Pro */}
          <button
            className="xl:hidden text-white focus:outline-none order-1"
            onClick={toggleMenu}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>

          {/* Logo - Centered on mobile/tablet/iPad Pro, left on desktop */}
          <Link href="/" className="flex items-center order-2 xl:order-1">
            <Image
              src="/GFWL _logo.png"
              alt="GFWL Hub"
              width={40}
              height={40}
              className="h-10 w-auto"
              priority
            />
            <span className="ml-2 text-xl font-bold">GFWL Hub</span>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden xl:flex items-center justify-center flex-1 order-2">
            <ul className="flex space-x-8">
              <li>
                <Link
                  href="/supported-games"
                  className="hover:text-gray-200 transition-colors"
                  prefetch={true}
                  title="View list of supported GFWL games"
                >
                  Supported Games
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="hover:text-gray-200 transition-colors"
                  prefetch={true}
                  title="Frequently asked questions"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-gray-200 transition-colors"
                  title="Contact us"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/download"
                  className="hover:text-gray-200 transition-colors"
                  prefetch={true}
                  title="Download GFWL Legacy 5x5 Bypass Tool"
                >
                  Legacy Bypass
                </Link>
              </li>
              {/* Show dashboard link for reviewers and admins */}
              {session &&
                (session.user.role === "reviewer" ||
                  session.user.role === "admin") && (
                  <li>
                    <Link
                      href="/dashboard"
                      className="hover:text-gray-200 transition-colors"
                      prefetch={true}
                      title="Reviewer and admin dashboard"
                    >
                      Dashboard
                    </Link>
                  </li>
                )}
            </ul>
          </nav>

          {/* Right side items */}
          <div className="hidden xl:flex items-center gap-4 order-3">
            <UserMenu />
          </div>

          {/* Mobile user menu - Right side on mobile/tablet/iPad Pro */}
          <div className="xl:hidden flex items-center gap-2 order-3">
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      {isMenuOpen && (
        <div className="xl:hidden bg-[#0e6b0e] py-4">
          <nav className="container mx-auto px-4">
            <ul className="space-y-4">
              <li>
                <Link
                  href="/supported-games"
                  className="block hover:text-gray-200 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                  title="View list of supported GFWL games"
                >
                  Supported Games
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="block hover:text-gray-200 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                  title="Frequently asked questions"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="block hover:text-gray-200 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                  title="Contact us"
                >
                  Contact
                </Link>
              </li>
              {/* Show dashboard links for authenticated users */}
              {session &&
                (session.user.role === "reviewer" ||
                  session.user.role === "admin") && (
                  <>
                    <li className="pt-2 border-t border-gray-600"></li>
                    <li>
                      <Link
                        href="/dashboard"
                        className="block hover:text-gray-200 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                        title="Reviewer and admin dashboard"
                      >
                        Dashboard
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/dashboard/submissions"
                        className="flex items-center gap-2 hover:text-gray-200 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                        title="Review correction submissions"
                      >
                        <span>Submissions</span>
                        {pendingCount > 0 && (
                          <span className="bg-orange-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                            {pendingCount > 99 ? "99+" : pendingCount}
                          </span>
                        )}
                      </Link>
                    </li>
                    {session.user.role === "admin" && (
                      <>
                        <li>
                          <Link
                            href="/dashboard/game-submissions"
                            className="flex items-center gap-2 hover:text-gray-200 transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                            title="Review game submissions"
                          >
                            <span>Game Submissions</span>
                            {pendingGameSubmissionsCount > 0 && (
                              <span className="bg-orange-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                                {pendingGameSubmissionsCount > 99
                                  ? "99+"
                                  : pendingGameSubmissionsCount}
                              </span>
                            )}
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/dashboard/games"
                            className="block hover:text-gray-200 transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                            title="Manage game entries"
                          >
                            Manage Games
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/dashboard/users"
                            className="block hover:text-gray-200 transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                            title="Manage users"
                          >
                            Users
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/dashboard/audit"
                            className="block hover:text-gray-200 transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                            title="View audit log"
                          >
                            Audit Log
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/dashboard/moderation"
                            className="block hover:text-gray-200 transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                            title="View moderation log"
                          >
                            Moderation Log
                          </Link>
                        </li>
                      </>
                    )}
                    {/* Leaderboard - Reviewers and Admins */}
                    <li className="pt-2 border-t border-gray-600">
                      <Link
                        href="/leaderboard"
                        className="flex items-center gap-2 hover:text-gray-200 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                        title="View contributor leaderboard"
                      >
                        <span>Leaderboard</span>
                        <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-bold rounded px-1.5 py-0.5 uppercase">
                          Beta
                        </span>
                      </Link>
                    </li>
                  </>
                )}
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
