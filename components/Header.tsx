"use client";

import Link from "next/link";
import { useState } from "react";
import { FaBars, FaTimes, FaDownload } from "react-icons/fa";
import { useSession } from "next-auth/react";
import UserMenu from "./UserMenu";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session } = useSession();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-[#107c10] text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Mobile menu button - Left side on mobile */}
          <button
            className="md:hidden text-white focus:outline-none order-1"
            onClick={toggleMenu}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>

          {/* Logo - Centered on mobile, left on desktop */}
          <Link href="/" className="text-xl font-bold order-2 md:order-1">
            GFWL Hub
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center justify-center flex-1 order-2">
            <ul className="flex space-x-8">
              <li>
                <Link
                  href="/supported-games"
                  className="hover:text-gray-200 transition-colors"
                >
                  Supported Games
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="hover:text-gray-200 transition-colors"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-gray-200 transition-colors"
                >
                  Contact
                </Link>
              </li>
              {/* Show dashboard links for reviewers and admins */}
              {session &&
                (session.user.role === "reviewer" ||
                  session.user.role === "admin") && (
                  <>
                    <li>
                      <Link
                        href="/dashboard/submissions"
                        className="hover:text-gray-200 transition-colors"
                      >
                        Submissions
                      </Link>
                    </li>
                    {session.user.role === "admin" && (
                      <>
                        <li>
                          <Link
                            href="/dashboard/users"
                            className="hover:text-gray-200 transition-colors"
                          >
                            Users
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/dashboard/audit"
                            className="hover:text-gray-200 transition-colors"
                          >
                            Audit
                          </Link>
                        </li>
                      </>
                    )}
                  </>
                )}
            </ul>
          </nav>

          {/* Right side items */}
          <div className="hidden md:flex items-center gap-4 order-3">
            {/* <Link
              href="/download"
              className="bg-white text-[#107c10] hover:bg-gray-100 px-4 py-2 rounded-md font-medium flex items-center transition-colors"
            >
              <FaDownload className="mr-2" />
              Download GFWL Fix
            </Link> */}
            <UserMenu />
          </div>

          {/* Mobile user menu - Right side on mobile */}
          <div className="md:hidden flex items-center gap-2 order-3">
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#0e6b0e] py-4">
          <nav className="container mx-auto px-4">
            <ul className="space-y-4">
              <li>
                <Link
                  href="/supported-games"
                  className="block hover:text-gray-200 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Supported Games
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="block hover:text-gray-200 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="block hover:text-gray-200 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Contact
                </Link>
              </li>
              {/* Show dashboard links for authenticated users */}
              {session &&
                (session.user.role === "reviewer" ||
                  session.user.role === "admin") && (
                  <>
                    <li className="pt-2 border-t border-gray-600">
                      <p className="text-xs text-gray-400 uppercase mb-2">
                        Dashboard
                      </p>
                    </li>
                    <li>
                      <Link
                        href="/dashboard/submissions"
                        className="block hover:text-gray-200 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Submissions
                      </Link>
                    </li>
                    {session.user.role === "admin" && (
                      <>
                        <li>
                          <Link
                            href="/dashboard/audit"
                            className="block hover:text-gray-200 transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            Audit
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/dashboard/users"
                            className="block hover:text-gray-200 transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            Users
                          </Link>
                        </li>
                      </>
                    )}
                  </>
                )}
              <li className="pt-4 border-t border-gray-600">
                <Link
                  href="/download"
                  className="flex items-center gap-2 bg-white text-[#107c10] hover:bg-gray-100 px-4 py-2 rounded-md font-medium transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FaDownload />
                  Download GFWL Fix
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
