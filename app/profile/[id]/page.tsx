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
  FaClock,
  FaGamepad,
  FaExternalLinkAlt,
  FaChartLine,
  FaHistory,
} from "react-icons/fa";
import Tooltip from "@/components/ui/tooltip";

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
  lastLoginAt?: Date;
}

interface Correction {
  id: string;
  gameId: string;
  gameSlug: string;
  gameTitle: string;
  field: string;
  status: "pending" | "approved" | "rejected" | "modified";
  submittedAt: Date;
  reviewedAt?: Date;
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
  const [recentSubmissions, setRecentSubmissions] = useState<Correction[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);

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

    const fetchSubmissions = async () => {
      try {
        const response = await fetch(
          `/api/corrections?userId=${resolvedParams.id}`
        );
        if (response.ok) {
          const data = await response.json();
          const corrections = data.corrections || [];
          // Get recent 5 submissions
          setRecentSubmissions(corrections.slice(0, 5));
          // Count pending
          setPendingCount(
            corrections.filter((c: Correction) => c.status === "pending").length
          );
        }
      } catch (error) {
        console.error("Error fetching submissions:", error);
      } finally {
        setSubmissionsLoading(false);
      }
    };

    if (resolvedParams.id) {
      fetchUser();
      fetchSubmissions();
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
    const roleName =
      profileUser.role.charAt(0).toUpperCase() + profileUser.role.slice(1);

    switch (profileUser.role) {
      case "admin":
        return (
          <Tooltip text={roleName}>
            <FaUserShield className="text-red-500" size={20} />
          </Tooltip>
        );
      case "reviewer":
        return (
          <Tooltip text={roleName}>
            <FaUserCheck className="text-blue-500" size={20} />
          </Tooltip>
        );
      default:
        return (
          <Tooltip text={roleName}>
            <FaUser className="text-gray-500" size={20} />
          </Tooltip>
        );
    }
  };

  // Calculate approval rate excluding pending submissions
  // Only count approved + rejected in denominator
  const reviewedCount = profileUser.approvedCount + profileUser.rejectedCount;
  const approvalRate =
    reviewedCount > 0
      ? ((profileUser.approvedCount / reviewedCount) * 100).toFixed(1)
      : "0.0";

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "rejected":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "modified":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getFieldDisplayName = (field: string) => {
    // Map of field names to their display names
    const fieldDisplayMap: Record<string, string> = {
      imageUrl: "Image URL",
      additionalDRM: "Additional DRM",
      discordLink: "Discord Link",
      redditLink: "Reddit Link",
      wikiLink: "Wiki Link",
      steamDBLink: "SteamDB Link",
      purchaseLink: "Purchase Link",
      gogDreamlistLink: "GOG Dreamlist Link",
      releaseDate: "Release Date",
      activationType: "Activation Type",
      playabilityStatus: "Playability Status",
      communityTips: "Community Tips",
      knownIssues: "Known Issues",
      communityAlternativeName: "Community Alternative Name",
      remasteredName: "Remastered Name",
      remasteredPlatform: "Remastered Platform",
      virusTotalUrl: "VirusTotal URL",
    };

    // Check if we have a direct mapping
    if (fieldDisplayMap[field]) {
      return fieldDisplayMap[field];
    }

    // Otherwise, format it generically
    // First, protect acronyms by replacing them with placeholders
    let formatted = field;
    const acronyms = ["URL", "DRM", "API", "ID", "FAQ", "DB", "GOG"];
    const placeholderMap: Record<string, string> = {};

    acronyms.forEach((acronym, index) => {
      const placeholder = `__ACRONYM_${index}__`;
      placeholderMap[placeholder] = acronym;
      // Match the acronym case-insensitively
      const regex = new RegExp(acronym, "gi");
      formatted = formatted.replace(regex, placeholder);
    });

    // Now split on capital letters
    formatted = formatted.replace(/([A-Z])/g, " $1");

    // Capitalize first letter
    formatted = formatted.replace(/^./, (str) => str.toUpperCase()).trim();

    // Restore acronyms
    Object.entries(placeholderMap).forEach(([placeholder, acronym]) => {
      formatted = formatted.replace(new RegExp(placeholder, "g"), acronym);
    });

    // Clean up any double spaces
    formatted = formatted.replace(/\s+/g, " ");

    return formatted;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
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
                : "View user profile and contributions"}
            </p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-[#2d2d2d] rounded-lg p-6 md:p-8 border border-gray-700 mb-6 shadow-lg">
          {/* Avatar and Basic Info */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8 pb-8 border-b border-gray-700">
            {profileUser.avatar ? (
              <Image
                src={profileUser.avatar}
                alt={profileUser.name || "User"}
                width={120}
                height={120}
                className="w-28 h-28 rounded-full border-4 border-[#107c10] object-cover shadow-lg"
                unoptimized
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-green-400 to-green-600 border-4 border-[#107c10] flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                {getInitials()}
              </div>
            )}

            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 flex items-center gap-3 justify-center md:justify-start">
                {profileUser.name}
                {getRoleIcon()}
              </h2>

              <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
                {profileUser.status === "active" ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
                    <FaCheckCircle className="text-green-400" size={12} />
                    <span className="text-green-400 text-sm font-medium">
                      Active
                    </span>
                  </div>
                ) : profileUser.status === "suspended" ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
                    <FaTimesCircle className="text-yellow-400" size={12} />
                    <span className="text-yellow-400 text-sm font-medium">
                      Suspended
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full">
                    <FaTimesCircle className="text-red-400" size={12} />
                    <span className="text-red-400 text-sm font-medium capitalize">
                      {profileUser.status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Account Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Member Since */}
            <div className="space-y-2">
              <label className="text-sm text-gray-500 flex items-center gap-2">
                <FaCalendar size={14} />
                Member Since
              </label>
              <p className="text-white font-medium">
                {formatDate(profileUser.createdAt)}
              </p>
            </div>

            {/* Last Login */}
            {profileUser.lastLoginAt && (
              <div className="space-y-2">
                <label className="text-sm text-gray-500 flex items-center gap-2">
                  <FaHistory size={14} />
                  Last Login
                </label>
                <p className="text-white font-medium">
                  {formatDate(profileUser.lastLoginAt)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Card */}
        <div className="bg-[#2d2d2d] rounded-lg p-6 md:p-8 border border-gray-700 mb-6 shadow-lg">
          <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
            <FaChartLine className="text-[#107c10]" />
            Contribution Statistics
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] p-4 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-xs mb-1">Total</p>
              <p className="text-2xl font-bold text-white">
                {profileUser.submissionsCount}
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 p-4 rounded-lg border border-green-500/20">
              <div className="flex items-center gap-2 mb-1">
                <FaCheckCircle className="text-green-500" size={14} />
                <p className="text-gray-400 text-xs">Approved</p>
              </div>
              <p className="text-2xl font-bold text-green-500">
                {profileUser.approvedCount}
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 p-4 rounded-lg border border-red-500/20">
              <div className="flex items-center gap-2 mb-1">
                <FaTimesCircle className="text-red-500" size={14} />
                <p className="text-gray-400 text-xs">Rejected</p>
              </div>
              <p className="text-2xl font-bold text-red-500">
                {profileUser.rejectedCount}
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 p-4 rounded-lg border border-yellow-500/20">
              <div className="flex items-center gap-2 mb-1">
                <FaClock className="text-yellow-500" size={14} />
                <p className="text-gray-400 text-xs">Pending</p>
              </div>
              <p className="text-2xl font-bold text-yellow-500">
                {pendingCount}
              </p>
            </div>
          </div>

          {/* Approval Rate */}
          {reviewedCount > 0 && (
            <div className="pt-6 border-t border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Approval Rate</p>
                <span className="text-white font-bold text-lg">
                  {approvalRate}%
                </span>
              </div>
              <div className="flex-1 bg-[#1a1a1a] rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    parseFloat(approvalRate) >= 75
                      ? "bg-green-500"
                      : parseFloat(approvalRate) >= 50
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{
                    width: `${approvalRate}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Recent Submissions */}
        {profileUser.submissionsCount > 0 && (
          <div className="bg-[#2d2d2d] rounded-lg p-6 md:p-8 border border-gray-700 shadow-lg">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <FaHistory className="text-[#107c10]" />
              Recent Activity
            </h3>

            {submissionsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#107c10] mx-auto"></div>
                <p className="text-gray-400 mt-4 text-sm">
                  Loading submissions...
                </p>
              </div>
            ) : recentSubmissions.length === 0 ? (
              <div className="text-center py-8">
                <FaEdit className="mx-auto text-gray-600 mb-4" size={32} />
                <p className="text-gray-400">No submissions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSubmissions.map((submission) => (
                  <Link
                    key={submission.id}
                    href={`/games/${submission.gameSlug}`}
                    className="block bg-[#1a1a1a] hover:bg-[#252525] rounded-lg p-4 border border-gray-700 hover:border-[#107c10]/50 transition-all group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <FaGamepad
                            className="text-[#107c10] flex-shrink-0"
                            size={14}
                          />
                          <h4 className="text-white font-semibold truncate group-hover:text-[#107c10] transition-colors">
                            {submission.gameTitle}
                          </h4>
                        </div>
                        <p className="text-gray-400 text-sm">
                          {getFieldDisplayName(submission.field)}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          {formatDateTime(submission.submittedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(
                            submission.status
                          )}`}
                        >
                          {submission.status.charAt(0).toUpperCase() +
                            submission.status.slice(1)}
                        </span>
                        <FaExternalLinkAlt
                          className="text-gray-500 group-hover:text-[#107c10] transition-colors"
                          size={12}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State for No Submissions */}
        {profileUser.submissionsCount === 0 && (
          <div className="bg-[#2d2d2d] rounded-lg p-12 border border-gray-700 text-center shadow-lg">
            <FaEdit className="mx-auto text-gray-600 mb-4" size={48} />
            <h3 className="text-xl font-bold text-white mb-2">
              No Contributions Yet
            </h3>
            <p className="text-gray-400 mb-6">
              {isOwnProfile
                ? "Start contributing by submitting corrections to games!"
                : "This user hasn't made any contributions yet."}
            </p>
            {isOwnProfile && (
              <Link
                href="/supported-games"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#107c10] hover:bg-[#0d6b0d] text-white rounded-lg transition-colors font-medium"
              >
                <FaGamepad />
                Browse Games
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
