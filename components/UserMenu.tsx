"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import {
  FaUser,
  FaSignOutAlt,
  FaTachometerAlt,
  FaCog,
  FaChevronDown,
  FaSignInAlt,
  FaUserShield,
  FaUserCheck,
} from "react-icons/fa";

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
      </div>
    );
  }

  // Not signed in
  if (!session) {
    return (
      <Link
        href="/auth/signin"
        className="flex items-center gap-2 bg-white text-[#107c10] hover:bg-gray-100 px-4 py-2 rounded-md font-medium transition-colors"
      >
        <FaSignInAlt />
        <span className="hidden sm:inline">Sign In</span>
      </Link>
    );
  }

  // Get role icon
  const getRoleIcon = () => {
    if (session.user.role === "admin") {
      return <FaUserShield className="text-red-400" size={12} />;
    }
    if (session.user.role === "reviewer") {
      return <FaUserCheck className="text-blue-400" size={12} />;
    }
    return null;
  };

  // Get user initials for avatar fallback
  const getInitials = () => {
    const name = session.user.name || session.user.email || "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 focus:outline-none group"
      >
        {/* Avatar */}
        <div className="relative">
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name || "User"}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full border-2 border-white/20 group-hover:border-white/40 transition-colors object-cover"
              onError={(e) => {
                // Fallback to initials if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                if (target.nextElementSibling) {
                  (target.nextElementSibling as HTMLElement).style.display =
                    "flex";
                }
              }}
            />
          ) : null}
          <div
            className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 border-2 border-white/20 group-hover:border-white/40 transition-colors flex items-center justify-center text-white font-semibold text-sm"
            style={{ display: session.user.image ? "none" : "flex" }}
          >
            {getInitials()}
          </div>
          {/* Role Badge */}
          {getRoleIcon() && (
            <div className="absolute -bottom-1 -right-1 bg-[#107c10] rounded-full p-1 border-2 border-[#107c10]">
              {getRoleIcon()}
            </div>
          )}
        </div>

        {/* Name and chevron (desktop only) */}
        <div className="hidden md:flex items-center gap-1">
          <span className="text-white font-medium max-w-[150px] truncate">
            {session.user.name || "User"}
          </span>
          <FaChevronDown
            className={`text-white transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            size={12}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-[#2d2d2d] rounded-lg shadow-xl border border-gray-700 py-2 z-50 animate-fade-in">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-700">
            <p className="text-white font-medium truncate">
              {session.user.name}
            </p>

            {session.user.role && (
              <div className="mt-2 flex items-center gap-2">
                {getRoleIcon()}
                <span className="text-xs text-gray-400 capitalize">
                  {session.user.role}
                </span>
              </div>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {(session.user.role === "reviewer" ||
              session.user.role === "admin") && (
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-[#3d3d3d] hover:text-white transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <FaTachometerAlt size={16} />
                <span>Dashboard</span>
              </Link>
            )}

            <Link
              href={`/profile/${session.user.id}`}
              className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-[#3d3d3d] hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <FaUser size={16} />
              <span>Profile</span>
            </Link>

            <Link
              href="/settings"
              className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-[#3d3d3d] hover:text-white transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <FaCog size={16} />
              <span>Settings</span>
            </Link>
          </div>

          {/* Sign Out */}
          <div className="border-t border-gray-700 pt-2">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-[#3d3d3d] hover:text-red-300 transition-colors w-full"
            >
              <FaSignOutAlt size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
