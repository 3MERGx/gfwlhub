"use client";

import { useSession } from "next-auth/react";
import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { safeLog } from "@/lib/security";
import { getAvatarUrl } from "@/lib/image-utils";
import { getFieldDisplayName } from "@/lib/field-display";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  FaEye,
  FaCog,
  FaFilter,
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
  settings?: {
    publicProfile?: boolean;
    showStatistics?: boolean;
  };
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

interface GameSubmission {
  id: string;
  gameSlug: string;
  gameTitle: string;
  status: "pending" | "approved" | "rejected" | "superseded";
  submittedAt: Date;
  reviewedAt?: Date;
}

// Union type for display
type Submission = (Correction & { type: "correction" }) | (GameSubmission & { type: "gameSubmission" });

type SubmissionStatus = "pending" | "approved" | "rejected" | "modified" | "superseded";
const STATUS_DISPLAY_ORDER: SubmissionStatus[] = ["pending", "approved", "rejected", "modified", "superseded"];
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  modified: "Modified",
  superseded: "Superseded",
};

export default function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { data: session, status } = useSession();
  const resolvedParams = use(params);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [typeFilter, setTypeFilter] = useState<"all" | "correction" | "gameSubmission">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounts

    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/users/${resolvedParams.id}`);
        if (response.status === 429) {
          // Rate limited - retry after a delay
          safeLog.warn("Rate limited, retrying user fetch after delay...");
          setTimeout(() => {
            if (isMounted) fetchUser();
          }, 2000);
          return;
        }
        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            setProfileUser(data);
          }
        }
      } catch (error) {
        safeLog.error("Error fetching user:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const fetchSubmissions = async () => {
      try {
        // Fetch both corrections and game submissions in parallel
        const [correctionsResponse, gameSubmissionsResponse] = await Promise.all([
          fetch(`/api/corrections?userId=${resolvedParams.id}`),
          fetch(`/api/game-submissions?userId=${resolvedParams.id}`),
        ]);

        // Handle rate limiting with retry
        if (correctionsResponse.status === 429 || gameSubmissionsResponse.status === 429) {
          safeLog.warn("Rate limited, retrying submissions fetch after delay...");
          setTimeout(() => {
            if (isMounted) fetchSubmissions();
          }, 2000);
          return;
        }

        let allSubs: Submission[] = [];

        // Process corrections
        if (correctionsResponse.ok) {
          const correctionsData = await correctionsResponse.json();
          const corrections = (correctionsData.corrections || []).map((c: Correction) => ({
            ...c,
            type: "correction" as const,
          }));
          allSubs = [...allSubs, ...corrections];
        }

        // Process game submissions (API returns array directly, not { submissions })
        if (gameSubmissionsResponse.ok) {
          const gameSubmissionsData = await gameSubmissionsResponse.json();
          const rawList = Array.isArray(gameSubmissionsData)
            ? gameSubmissionsData
            : gameSubmissionsData?.submissions ?? [];
          const gameSubmissions = rawList.map((gs: GameSubmission) => ({
            ...gs,
            type: "gameSubmission" as const,
          }));
          allSubs = [...allSubs, ...gameSubmissions];
        }

        if (isMounted) {
          // Sort by submittedAt (most recent first)
          allSubs.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
          
          // Store all submissions
          setAllSubmissions(allSubs);
          
          // Count pending across both types
          setPendingCount(
            allSubs.filter((s) => s.status === "pending").length
          );
        }
      } catch (error) {
        safeLog.error("Error fetching submissions:", error);
      } finally {
        if (isMounted) {
          setSubmissionsLoading(false);
        }
      }
    };

    if (resolvedParams.id) {
      fetchUser();
      fetchSubmissions();
      if (session?.user.id === resolvedParams.id) {
        setIsOwnProfile(true);
      }
    }

    return () => {
      isMounted = false; // Cleanup on unmount
    };
  }, [session, resolvedParams.id]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, statusFilter]);

  // Submissions filtered by type only (used to derive available statuses)
  const submissionsByType = useMemo(
    () =>
      allSubmissions.filter((s) =>
        typeFilter === "all" ? true : s.type === typeFilter
      ),
    [allSubmissions, typeFilter]
  );

  // Unique statuses present in current data (respecting type filter), in display order
  const availableStatuses = useMemo(() => {
    const set = new Set(submissionsByType.map((s) => s.status));
    return STATUS_DISPLAY_ORDER.filter((status) => set.has(status));
  }, [submissionsByType]);

  // Reset status filter when selected value is no longer in the available list
  useEffect(() => {
    if (statusFilter !== "all" && !(availableStatuses as readonly string[]).includes(statusFilter)) {
      setStatusFilter("all");
    }
  }, [statusFilter, availableStatuses]);

  if (status === "loading" || loading) {
    return (
      <div
        className="container mx-auto px-4 py-8"
        aria-live="polite"
        aria-busy="true"
        aria-label="Loading profile"
      >
        <div className="max-w-4xl mx-auto">
          <div className="bg-[rgb(var(--bg-card))] rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#107c10] mx-auto" aria-hidden="true" />
            <p className="text-[rgb(var(--text-secondary))] mt-4">
              Loading profile...
            </p>
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
          <div className="bg-[rgb(var(--bg-card))] rounded-lg p-12 text-center border-2 border-red-900/30">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-900/20 mb-6">
              <FaUser size={36} className="text-red-400" />
            </div>
            <h1 className="text-3xl font-bold text-[rgb(var(--text-primary))] mb-3">
              Account Deleted
            </h1>
            <p className="text-[rgb(var(--text-secondary))] text-lg mb-2">
              This user has deleted their account.
            </p>
            {profileUser.deletedAt && (
              <p className="text-[rgb(var(--text-muted))] text-sm">
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
          <div className="bg-[rgb(var(--bg-card))] rounded-lg p-8 text-center">
            <p className="text-[rgb(var(--text-secondary))]">
              Please sign in to view profiles.
            </p>
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
          <div className="bg-[rgb(var(--bg-card))] rounded-lg p-8 text-center">
            <p className="text-[rgb(var(--text-secondary))]">User not found.</p>
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
            <FaUser className="text-[rgb(var(--text-muted))]" size={20} />
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
      case "superseded":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default:
        return "bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] border-[rgb(var(--border-color))]";
    }
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

  // Filter submissions by type and status
  const filteredSubmissions = allSubmissions.filter((s) => {
    if (typeFilter !== "all" && s.type !== typeFilter) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  });

  // Pagination uses filtered list; reset to page 1 when filters change is handled in filter onChange
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSubmissions = filteredSubmissions.slice(startIndex, endIndex);

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
            <h1 className="text-2xl md:text-3xl font-bold text-[rgb(var(--text-primary))] mb-2">
              {isOwnProfile ? "My Profile" : "User Profile"}
            </h1>
            <p className="text-[rgb(var(--text-secondary))] text-sm md:text-base">
              {isOwnProfile
                ? "View and manage your account information"
                : "View user profile and contributions"}
            </p>
          </div>
          {isOwnProfile && session?.user?.id && (
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[rgb(var(--bg-card))] hover:bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:border-[#107c10]/50 transition-colors font-medium"
            >
              <FaCog size={16} />
              Settings
            </Link>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-[rgb(var(--bg-card))] rounded-lg p-6 md:p-8 border border-[rgb(var(--border-color))] mb-6 shadow-lg">
          {/* Avatar and Basic Info */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8 pb-8 border-b border-[rgb(var(--border-color))]">
            {profileUser.avatar ? (
              <div className="relative">
              <Image
                  src={getAvatarUrl(profileUser.avatar) || profileUser.avatar}
                alt={profileUser.name || "User"}
                width={120}
                height={120}
                className="w-28 h-28 rounded-full border-4 border-[#107c10] object-cover shadow-lg"
                unoptimized
                  onError={(e) => {
                    // Fallback to initials if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    if (target.parentElement) {
                      const fallback = target.parentElement.querySelector(".avatar-fallback") as HTMLElement;
                      if (fallback) {
                        fallback.style.display = "flex";
                      }
                    }
                  }}
                />
                <div
                  className="avatar-fallback w-28 h-28 rounded-full bg-gradient-to-br from-green-400 to-green-600 border-4 border-[#107c10] flex items-center justify-center text-white font-bold text-3xl shadow-lg"
                  style={{ display: "none", position: "absolute", top: 0, left: 0 }}
                >
                  {getInitials()}
                </div>
              </div>
            ) : (
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-green-400 to-green-600 border-4 border-[#107c10] flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                {getInitials()}
              </div>
            )}

            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold text-[rgb(var(--text-primary))] mb-3 flex items-center gap-3 justify-center md:justify-start">
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
              <label className="text-sm text-[rgb(var(--text-muted))] flex items-center gap-2">
                <FaCalendar size={14} />
                Member Since
              </label>
              <p className="text-[rgb(var(--text-primary))] font-medium">
                {formatDate(profileUser.createdAt)}
              </p>
            </div>

            {/* Last Login */}
            <div className="space-y-2">
              <label className="text-sm text-[rgb(var(--text-muted))] flex items-center gap-2">
                <FaHistory size={14} />
                Last Login
              </label>
              <p className="text-[rgb(var(--text-primary))] font-medium">
                {profileUser.lastLoginAt
                  ? formatDate(profileUser.lastLoginAt)
                  : "Not recorded"}
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Card */}
        <div className="bg-[rgb(var(--bg-card))] rounded-lg p-6 md:p-8 border border-[rgb(var(--border-color))] mb-6 shadow-lg">
          <h3 className="text-xl font-bold text-[rgb(var(--text-primary))] flex items-center gap-2 mb-6">
            <FaChartLine className="text-[#107c10]" />
            Contribution Statistics
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[rgb(var(--bg-card-alt))] p-4 rounded-lg border border-[rgb(var(--border-color))]">
              <p className="text-[rgb(var(--text-secondary))] text-xs mb-1">
                Submissions
              </p>
              <p className="text-2xl font-bold text-[rgb(var(--text-primary))]">
                {profileUser.submissionsCount}
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-500/10 p-4 rounded-lg border border-green-200 dark:border-green-500/20">
              <div className="flex items-center gap-2 mb-1">
                <FaCheckCircle
                  className="text-green-600 dark:text-green-500"
                  size={14}
                />
                <p className="text-green-700 dark:text-[rgb(var(--text-secondary))] text-xs">
                  Approved
                </p>
              </div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-500">
                {profileUser.approvedCount}
              </p>
            </div>

            <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-lg border border-red-200 dark:border-red-500/20">
              <div className="flex items-center gap-2 mb-1">
                <FaTimesCircle
                  className="text-red-600 dark:text-red-500"
                  size={14}
                />
                <p className="text-red-700 dark:text-[rgb(var(--text-secondary))] text-xs">
                  Rejected
                </p>
              </div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-500">
                {profileUser.rejectedCount}
              </p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-500/10 p-4 rounded-lg border border-yellow-200 dark:border-yellow-500/20">
              <div className="flex items-center gap-2 mb-1">
                <FaClock
                  className="text-yellow-600 dark:text-yellow-500"
                  size={14}
                />
                <p className="text-yellow-700 dark:text-[rgb(var(--text-secondary))] text-xs">
                  Pending
                </p>
              </div>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">
                {pendingCount}
              </p>
            </div>
          </div>

          {/* Approval Rate */}
          {reviewedCount > 0 && (
            <div className="pt-6 border-t border-[rgb(var(--border-color))]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[rgb(var(--text-secondary))] text-sm">
                  Approval Rate
                </p>
                <span className="text-[rgb(var(--text-primary))] font-bold text-lg">
                  {approvalRate}%
                </span>
              </div>
              <div className="flex-1 bg-[rgb(var(--bg-card-alt))] rounded-full h-4 overflow-hidden">
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
        {profileUser.submissionsCount > 0 &&
          (() => {
            // Determine if we should show recent activity
            // Always show to: user themselves, admins
            // Hide to: others if showStatistics is false
            const showStatistics = profileUser.settings?.showStatistics ?? true;
            const isAdmin = session?.user?.role === "admin";
            const shouldShowActivity =
              isOwnProfile || isAdmin || showStatistics;

            return (
              <div className="bg-[rgb(var(--bg-card))] rounded-lg p-6 md:p-8 border border-[rgb(var(--border-color))] shadow-lg">
                <h3 className="text-xl font-bold text-[rgb(var(--text-primary))] flex items-center gap-2 mb-6">
                  <FaHistory className="text-[#107c10]" />
                  Recent Activity
                </h3>

                {!shouldShowActivity ? (
                  <div className="text-center py-8">
                    <FaEye
                      className="mx-auto text-[rgb(var(--text-muted))] mb-4"
                      size={32}
                    />
                    <p className="text-[rgb(var(--text-secondary))] mb-2">
                      Recent activity is hidden by this user
                    </p>
                    <p className="text-[rgb(var(--text-muted))] text-sm">
                      This user has chosen to keep their activity private.
                      {!isOwnProfile && " They can make this visible in their settings."}
                    </p>
                  </div>
                ) : (
                  <>
                    {!showStatistics && isOwnProfile && (
                      <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                        <div className="flex items-start gap-2">
                          <FaEye className="text-yellow-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-yellow-400 text-sm font-medium mb-1">
                              Activity Hidden to Others
                            </p>
                            <p className="text-gray-300 text-xs">
                              Your recent activity is hidden from other users
                              and reviewers. Admins can still see your activity.
                              You can change this in your{" "}
                              <Link
                                href="/settings"
                                className="text-[#107c10] hover:underline"
                              >
                                settings
                              </Link>
                              .
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {submissionsLoading ? (
                      <div className="text-center py-8" aria-live="polite" aria-busy="true">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#107c10] mx-auto" aria-hidden="true" />
                        <p className="text-gray-400 mt-4 text-sm">
                          Loading submissions...
                        </p>
                      </div>
                    ) : allSubmissions.length === 0 ? (
                      <div className="text-center py-8">
                        <FaEdit
                          className="mx-auto text-gray-600 mb-4"
                          size={32}
                        />
                        {!isOwnProfile &&
                        session?.user?.role !== "admin" &&
                        profileUser.submissionsCount > 0 ? (
                          <p className="text-[rgb(var(--text-secondary))]">
                            Recent activity is only visible to this user and
                            admins.
                          </p>
                        ) : (
                          <p className="text-gray-400">No submissions yet</p>
                        )}
                      </div>
                    ) : (
                      <>
                      {/* Type and status filters */}
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className="text-[rgb(var(--text-muted))] text-sm flex items-center gap-2">
                          <FaFilter size={14} />
                          Filter:
                        </span>
                        <Select
                          value={typeFilter}
                          onValueChange={(value) => setTypeFilter(value as "all" | "correction" | "gameSubmission")}
                        >
                          <SelectTrigger
                            className="w-[180px]"
                            aria-label="Filter by type"
                          >
                            <SelectValue placeholder="All types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All types</SelectItem>
                            <SelectItem value="correction">Corrections</SelectItem>
                            <SelectItem value="gameSubmission">Game submissions</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={statusFilter}
                          onValueChange={setStatusFilter}
                        >
                          <SelectTrigger
                            className="w-[180px]"
                            aria-label="Filter by status"
                          >
                            <SelectValue placeholder="All statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All statuses</SelectItem>
                            {availableStatuses.map((status) => (
                              <SelectItem key={status} value={status}>
                                {STATUS_LABELS[status] ?? status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {(typeFilter !== "all" || statusFilter !== "all") && (
                          <button
                            type="button"
                            onClick={() => {
                              setTypeFilter("all");
                              setStatusFilter("all");
                            }}
                            className="text-[#107c10] hover:underline text-sm"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                      {filteredSubmissions.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-[rgb(var(--text-secondary))]">No submissions match the current filters.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setTypeFilter("all");
                              setStatusFilter("all");
                            }}
                            className="mt-2 text-[#107c10] hover:underline text-sm"
                          >
                            Clear filters
                          </button>
                        </div>
                      ) : (
                      <>
                      <div className="space-y-3">
                          {paginatedSubmissions.map((submission) => (
                          <Link
                            key={`${submission.type}-${submission.id}`}
                            href={`/games/${submission.gameSlug}`}
                            className="block bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] rounded-lg p-4 border border-[rgb(var(--border-color))] hover:border-[#107c10]/50 transition-all group"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <FaGamepad
                                    className="text-[#107c10] flex-shrink-0"
                                    size={14}
                                  />
                                  <h4 className="text-[rgb(var(--text-primary))] font-semibold truncate group-hover:text-[#107c10] transition-colors">
                                    {submission.gameTitle}
                                  </h4>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[rgb(var(--text-muted))] text-xs px-2 py-0.5 bg-[rgb(var(--bg-card))] rounded">
                                    {submission.type === "correction" ? "Correction" : "Game Submission"}
                                  </span>
                                  {submission.type === "correction" && (
                                    <span className="text-[rgb(var(--text-secondary))] text-xs">
                                      {getFieldDisplayName((submission as Correction & { type: "correction" }).field)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[rgb(var(--text-muted))] text-xs mt-1">
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
                                  className="text-[rgb(var(--text-muted))] group-hover:text-[#107c10] transition-colors"
                                  size={12}
                                />
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                        {/* Pagination */}
                        {totalPages > 1 && (
                          <nav
                            className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6"
                            aria-label="Submissions pagination"
                          >
                            <div className="text-sm text-[rgb(var(--text-secondary))]">
                              Showing {startIndex + 1}-{Math.min(endIndex, filteredSubmissions.length)} of {filteredSubmissions.length} submissions
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:border-[#107c10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Previous page"
                              >
                                Previous
                              </button>
                              <div className="flex items-center gap-1" role="group" aria-label="Page numbers">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                  let pageNum: number;
                                  if (totalPages <= 5) {
                                    pageNum = i + 1;
                                  } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                  } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                  } else {
                                    pageNum = currentPage - 2 + i;
                                  }
                                  return (
                                    <button
                                      key={pageNum}
                                      onClick={() => setCurrentPage(pageNum)}
                                      className={`px-3 py-2 rounded-lg border transition-colors ${
                                        currentPage === pageNum
                                          ? "bg-[#107c10] text-white border-[#107c10]"
                                          : "bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] border-[rgb(var(--border-color))] hover:border-[#107c10]"
                                      }`}
                                      aria-label={`Page ${pageNum}`}
                                      aria-current={currentPage === pageNum ? "page" : undefined}
                                    >
                                      {pageNum}
                                    </button>
                                  );
                                })}
                              </div>
                              <button
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:border-[#107c10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Next page"
                              >
                                Next
                              </button>
                            </div>
                          </nav>
                        )}
                      </>
                    )}
                  </>
                )}
                </>
                )}
              </div>
            );
          })()}

        {/* Empty State for No Submissions */}
        {profileUser.submissionsCount === 0 && (
          <div className="bg-[rgb(var(--bg-card))] rounded-lg p-12 border border-[rgb(var(--border-color))] text-center shadow-lg">
            <FaEdit
              className="mx-auto text-[rgb(var(--text-muted))] mb-4"
              size={48}
            />
            <h3 className="text-xl font-bold text-[rgb(var(--text-primary))] mb-2">
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
