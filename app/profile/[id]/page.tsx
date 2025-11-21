"use client";

import { useSession } from "next-auth/react";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FaUser,
  FaCalendar,
  FaUserShield,
  FaCheckCircle,
  FaTimesCircle,
  FaEdit,
  FaUserCheck,
} from "react-icons/fa";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "user" | "reviewer" | "admin";
  status: "active" | "suspended" | "restricted" | "blocked" | "deleted";
  provider: "github" | "discord" | "google";
  submissionsCount: number;
  approvedCount: number;
  rejectedCount: number;
  createdAt: Date;
  deletedAt?: Date;
}

export default function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status } = useSession();
  const resolvedParams = use(params);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/users/${resolvedParams.id}`);
        if (response.ok) {
          const data = await response.json();
          setProfileUser(data);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };

    if (resolvedParams.id) {
      fetchUser();
      if (session?.user.id === resolvedParams.id) {
        setIsOwnProfile(true);
      }
    }
  }, [session, resolvedParams.id]);

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#2d2d2d] rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#107c10] mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if profile is deleted
  if (profileUser?.status === "deleted") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#2d2d2d] rounded-lg p-12 text-center border-2 border-red-900/30">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-900/20 mb-6">
              <FaUser size={36} className="text-red-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">
              Account Deleted
            </h1>
            <p className="text-gray-400 text-lg mb-2">
              This user has deleted their account.
            </p>
            {profileUser.deletedAt && (
              <p className="text-gray-500 text-sm">
                Deleted on{" "}
                {new Date(profileUser.deletedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
            <Link
              href="/"
              className="inline-block mt-8 px-6 py-3 bg-[#107c10] hover:bg-[#0d6b0d] text-white rounded-lg transition-colors font-medium"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#2d2d2d] rounded-lg p-8 text-center">
            <p className="text-gray-400">Please sign in to view profiles.</p>
            <Link
              href="/auth/signin"
              className="mt-4 inline-block px-4 py-2 bg-[#107c10] text-white rounded-lg hover:bg-[#0d6b0d] transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#2d2d2d] rounded-lg p-8 text-center">
            <p className="text-gray-400">User not found.</p>
            <Link
              href="/"
              className="mt-4 inline-block px-4 py-2 bg-[#107c10] text-white rounded-lg hover:bg-[#0d6b0d] transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Get user initials for avatar fallback
  const getInitials = () => {
    const name = profileUser.name || profileUser.email || "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleIcon = () => {
    switch (profileUser.role) {
      case "admin":
        return <FaUserShield className="text-red-500" size={20} />;
      case "reviewer":
        return <FaUserCheck className="text-blue-500" size={20} />;
      default:
        return <FaUser className="text-gray-500" size={20} />;
    }
  };

  // Calculate approval rate excluding pending submissions
  // Only count approved + rejected in denominator
  const reviewedCount = profileUser.approvedCount + profileUser.rejectedCount;
  const approvalRate =
    reviewedCount > 0
      ? ((profileUser.approvedCount / reviewedCount) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-[#107c10] hover:underline text-sm mb-2 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {isOwnProfile ? "My Profile" : "User Profile"}
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            {isOwnProfile
              ? "View and manage your account information"
              : "View user profile"}
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-[#2d2d2d] rounded-lg p-6 md:p-8 border border-gray-700 mb-6">
          {/* Avatar and Basic Info */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8 pb-8 border-b border-gray-700">
            {profileUser.avatar ? (
              <Image
                src={profileUser.avatar}
                alt={profileUser.name || "User"}
                width={96}
                height={96}
                className="w-24 h-24 rounded-full border-4 border-[#107c10] object-cover"
                unoptimized
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-green-600 border-4 border-[#107c10] flex items-center justify-center text-white font-bold text-3xl">
                {getInitials()}
              </div>
            )}

            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3 justify-center md:justify-start">
                {profileUser.name}
                {getRoleIcon()}
              </h2>

              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#107c10]/20 border border-[#107c10] rounded-full">
                <span className="text-[#107c10] text-sm font-medium capitalize">
                  {profileUser.role}
                </span>
              </div>
            </div>

            {/* {isOwnProfile && (
              <button className="px-4 py-2 bg-[#107c10] hover:bg-[#0d6b0d] text-white rounded-lg transition-colors flex items-center gap-2">
                <FaEdit size={14} />
                Edit Profile
              </button>
            )} */}
          </div>

          {/* Account Details Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Account Status */}
            <div className="space-y-2">
              <label className="text-sm text-gray-500 flex items-center gap-2">
                <FaUser size={14} />
                Account Status
              </label>
              <div className="flex items-center gap-2">
                {profileUser.status === "active" ? (
                  <FaCheckCircle className="text-green-500" />
                ) : profileUser.status === "suspended" ? (
                  <FaTimesCircle className="text-yellow-500" />
                ) : (
                  <FaTimesCircle className="text-red-500" />
                )}
                <span className="text-white font-medium capitalize">
                  {profileUser.status}
                </span>
              </div>
            </div>

            {/* Member Since */}
            <div className="space-y-2">
              <label className="text-sm text-gray-500 flex items-center gap-2">
                <FaCalendar size={14} />
                Member Since
              </label>
              <p className="text-white font-medium">
                {new Date(profileUser.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Contributions */}
            <div className="space-y-2">
              <label className="text-sm text-gray-500 flex items-center gap-2">
                <FaEdit size={14} />
                Total Submissions
              </label>
              <p className="text-white font-medium">
                {profileUser.submissionsCount}
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Card */}
        <div className="bg-[#2d2d2d] rounded-lg p-6 md:p-8 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-6">
            Contribution Statistics
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-[#1a1a1a] p-4 rounded-lg">
              <p className="text-gray-400 text-sm mb-1">Total Submissions</p>
              <p className="text-2xl font-bold text-white">
                {profileUser.submissionsCount}
              </p>
            </div>

            <div className="bg-[#1a1a1a] p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <FaCheckCircle className="text-green-500" size={14} />
                <p className="text-gray-400 text-sm">Approved</p>
              </div>
              <p className="text-2xl font-bold text-green-500">
                {profileUser.approvedCount}
              </p>
            </div>

            <div className="bg-[#1a1a1a] p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <FaTimesCircle className="text-red-500" size={14} />
                <p className="text-gray-400 text-sm">Rejected</p>
              </div>
              <p className="text-2xl font-bold text-red-500">
                {profileUser.rejectedCount}
              </p>
            </div>
          </div>

          {/* Approval Rate */}
          {profileUser.submissionsCount > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-gray-400 text-sm mb-2">Approval Rate</p>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-[#1a1a1a] rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-green-500 h-full transition-all"
                    style={{
                      width: `${approvalRate}%`,
                    }}
                  />
                </div>
                <span className="text-white font-bold">{approvalRate}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
