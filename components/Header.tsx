"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import UserMenu from "./UserMenu";
import ThemeToggle from "./ThemeToggle";
import GameSearch from "./GameSearch";
import { safeLog } from "@/lib/security";

const DISCORD_INVITE = "https://discord.gg/PR75T8xMWS";

const NAV_LINKS = [
  {
    href: "/supported-games",
    label: "Supported Games",
    title: "View list of supported GFWL games",
  },
  {
    href: "/faq",
    label: "FAQ",
    title: "Frequently asked questions",
  },
  {
    href: "/contact",
    label: "Game Communities",
    title: "Find game Discord and Reddit communities",
  },
  {
    href: "/download",
    label: "5x5 Activation Bypass",
    title: "Download GFWL Legacy 5x5 activation bypass tool",
  },
] as const;

function NavLinkClass(active: boolean) {
  return active
    ? "text-white font-semibold underline underline-offset-4 decoration-2"
    : "hover:text-gray-200 transition-colors";
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingGameSubmissionsCount, setPendingGameSubmissionsCount] =
    useState(0);
  const [pendingFaqSubmissionsCount, setPendingFaqSubmissionsCount] =
    useState(0);

  const isStaff =
    session?.user?.role === "reviewer" || session?.user?.role === "admin";
  const totalPending =
    pendingCount + pendingGameSubmissionsCount + pendingFaqSubmissionsCount;

  const toggleMenu = () => setIsMenuOpen((open) => !open);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Fetch pending corrections count for reviewers and admins
  useEffect(() => {
    if (!session?.user?.id) return;
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
  }, [session]);

  // Fetch pending game submissions count for reviewers and admins
  useEffect(() => {
    if (!session?.user?.id) return;
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
  }, [session]);

  // Fetch pending FAQ submissions count for reviewers and admins
  useEffect(() => {
    if (!session?.user?.id) return;
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
  }, [session]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const pendingBadge =
    totalPending > 0 ? (
      <span className="bg-orange-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
        {totalPending > 99 ? "99+" : totalPending}
      </span>
    ) : null;

  return (
    <header className="sticky top-0 z-50 bg-[#107c10] text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16 gap-3">
          <button
            type="button"
            className="xl:hidden text-white rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#107c10] order-1"
            onClick={toggleMenu}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>

          <Link
            href="/"
            className="flex items-center order-2 xl:order-1 shrink-0"
          >
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

          <nav className="hidden xl:flex items-center justify-center flex-1 order-2 gap-6">
            <ul className="flex items-center space-x-6">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={NavLinkClass(isActive(link.href))}
                    prefetch={true}
                    title={link.title}
                    aria-current={isActive(link.href) ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {isStaff && (
                <li>
                  <Link
                    href="/dashboard"
                    className={`inline-flex items-center gap-2 ${NavLinkClass(
                      isActive("/dashboard")
                    )}`}
                    prefetch={true}
                    title="Reviewer and admin dashboard"
                    aria-current={
                      isActive("/dashboard") ? "page" : undefined
                    }
                  >
                    <span>Dashboard</span>
                    {pendingBadge}
                  </Link>
                </li>
              )}
            </ul>
          </nav>

          <div className="hidden xl:flex items-center gap-3 order-3">
            <GameSearch
              variant="header"
              id="header-game-search"
              className="w-44 2xl:w-56"
            />
            <ThemeToggle />
            <UserMenu />
          </div>

          <div className="xl:hidden flex items-center gap-2 order-3">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="xl:hidden bg-[#0e6b0e] py-4">
          <nav className="container mx-auto px-4">
            <div className="mb-4">
              <GameSearch
                variant="header"
                id="mobile-game-search"
                className="w-full"
                onNavigate={() => setIsMenuOpen(false)}
              />
            </div>
            <ul className="space-y-4">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`block ${NavLinkClass(isActive(link.href))}`}
                    onClick={() => setIsMenuOpen(false)}
                    title={link.title}
                    aria-current={isActive(link.href) ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={DISCORD_INVITE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:text-gray-200 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                  title="Join the GFWL Hub Discord"
                >
                  Join Discord
                </Link>
              </li>
              {isStaff && (
                <>
                  <li className="pt-2 border-t border-white/20" />
                  <li>
                    <Link
                      href="/dashboard"
                      className={`flex items-center gap-2 ${NavLinkClass(
                        isActive("/dashboard")
                      )}`}
                      onClick={() => setIsMenuOpen(false)}
                      title="Reviewer and admin dashboard"
                      aria-current={
                        isActive("/dashboard") ? "page" : undefined
                      }
                    >
                      <span>Dashboard</span>
                      {pendingBadge}
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
