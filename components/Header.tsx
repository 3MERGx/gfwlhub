"use client";

import Link from "next/link";
import { useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="bg-[#107c10] text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold">
            GFWL Hub
          </Link>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-white focus:outline-none"
            onClick={toggleMenu}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>

          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center justify-center flex-1">
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
            </ul>
          </nav>

          {/* Empty div to balance the layout */}
          <div className="hidden md:block w-[100px]"></div>
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
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
