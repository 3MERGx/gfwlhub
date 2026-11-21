"use client";

import { useSession } from "next-auth/react";
import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { safeLog } from "@/lib/security";
import UserAvatar from "@/components/UserAvatar";
import StatusPill from "@/components/dashboard/StatusPill";
import {
  getFieldDisplayName,
  getCorrectionStatusLabel,
} from "@/lib/field-display";
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
  FaEye,
  FaCog,
  FaFilter,
} from "react-icons/fa";
import Tooltip from "@/components/ui/tooltip";
import { usePusherChannel } from "@/hooks/usePusherChannel";
import { PUSHER_EVENTS } from "@/lib/pusher-client";

interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role: "user" | "reviewer" | "admin";
  status: "active" | "suspended" | "restricted" | "blocked" | "deleted";
  provider?: "github" | "discord" | "google";
  submissionsCount?: number;
  approvedCount?: number;
  rejectedCount?: number;
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
  status: "pending" | "approved" | "rejected" | "modified" | "superseded";
  submittedAt: Date;
  reviewedAt?: Date;
  reviewNotes?: string;
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
  modified: "Approved with edits",
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
  const [profileForbidden, setProfileForbidden] = useState(false);
  const [submissionsLoading, setSubmissionsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [typeFilter, setTypeFilter] = useState<"all" | "correction" | "gameSubmission">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  usePusherChannel(PUSHER_EVENTS.USERS_UPDATED, () => {
    setRefreshTrigger((t) => t + 1);
  });
  usePusherChannel(PUSHER_EVENTS.SUBMISSIONS_UPDATED, () => {
    setRefreshTrigger((t) => t + 1);
  });
  usePusherChannel(PUSHER_EVENTS.GAME_SUBMISSIONS_UPDATED, () => {
    setRefreshTrigger((t) => t + 1);
  });

  useEffect(() => {
    const onFocus = () => setRefreshTrigger((t) => t + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounts

    const fetchUser = async () => {
      try {
        const response = await fetch(
          `/api/users/${resolvedParams.id}?_t=${Date.now()}`,
          { cache: "no-store" }
        );
        if (response.status === 429) {
          // Rate limited - retry after a delay
          safeLog.warn("Rate limited, retrying user fetch after delay...");
          setTimeout(() => {
            if (isMounted) fetchUser();
          }, 2000);
          return;
        }
        if (response.status === 403) {
          if (isMounted) {
            setProfileForbidden(true);
            setProfileUser(null);
          }
          return;
        }
        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            setProfileForbidden(false);
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
        const t = Date.now();
        const [correctionsResponse, gameSubmissionsResponse] = await Promise.all([
          fetch(`/api/corrections?userId=${resolvedParams.id}&_t=${t}`, {
            cache: "no-store",
          }),
          fetch(`/api/game-submissions?userId=${resolvedParams.id}&_t=${t}`, {
            cache: "no-store",
          }),
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
  }, [session, resolvedParams.id, refreshTrigger]);

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

  if (profileForbidden) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[rgb(var(--bg-card))] rounded-lg p-8 text-center">
            <p className="text-[rgb(var(--text-secondary))]">
              This profile is private.
            </p>
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
  const reviewedCount =
    (profileUser.approvedCount ?? 0) + (profileUser.rejectedCount ?? 0);
  const approvalRate =
    reviewedCount > 0
      ? (((profileUser.approvedCount ?? 0) / reviewedCount) * 100).toFixed(1)
      : "0.0";

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
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <Link
            href="/leaderboard"
            className="text-[#107c10] hover:underline"
          >
            ← Leaderboard
          </Link>
          <span className="text-[rgb(var(--text-muted))]" aria-hidden>
            ·
          </span>
          <Link href="/" className="text-[rgb(var(--text-secondary))] hover:underline">
            Home
          </Link>
        </div>

        <div className="bg-[rgb(var(--bg-card))] rounded-xl p-4 sm:p-6 border border-[rgb(var(--border-color))] mb-5">
          <div className="flex items-center gap-4">
            <UserAvatar
              name={profileUser.name || profileUser.email || "User"}
              src={profileUser.avatar}
              size={72}
              className="ring-2 ring-[rgb(var(--border-color))]"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[rgb(var(--text-primary))] truncate">
                  {profileUser.name}
                </h1>
                {getRoleIcon()}
                <StatusPill status={profileUser.status} />
                {isOwnProfile && session?.user?.id ? (
                  <Link
                    href="/settings"
                    className="ml-auto inline-flex min-h-[40px] items-center gap-2 px-3 py-1.5 text-sm font-medium text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:bg-[rgb(var(--bg-card-alt))] transition-colors"
                  >
                    <FaCog size={14} />
                    Settings
                  </Link>
                ) : null}
              </div>
              <p className="mt-1 text-xs sm:text-sm text-[rgb(var(--text-secondary))] flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <FaCalendar size={12} />
                  Member since {formatDate(profileUser.createdAt)}
                </span>
                {profileUser.lastLoginAt ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <FaClock size={12} />
                      Last login {formatDate(profileUser.lastLoginAt)}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
        </div>

        {typeof profileUser.submissionsCount === "number" && (
        <div className="bg-[rgb(var(--bg-card))] rounded-xl p-4 sm:p-6 border border-[rgb(var(--border-color))] mb-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-4">
            Contributions
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="bg-[rgb(var(--bg-card-alt))] p-3 rounded-lg">
              <p className="text-[rgb(var(--text-secondary))] text-xs mb-1">
                Submissions
              </p>
              <p className="text-xl font-bold text-[rgb(var(--text-primary))]">
                {profileUser.submissionsCount}
              </p>
            </div>
            <div className="bg-[rgb(var(--bg-card-alt))] p-3 rounded-lg">
              <p className="text-[rgb(var(--text-secondary))] text-xs mb-1 inline-flex items-center gap-1.5">
                <FaCheckCircle className="text-[rgb(var(--color-primary))]" size={12} />
                Approved
              </p>
              <p className="text-xl font-bold text-[rgb(var(--color-primary))]">
                {profileUser.approvedCount ?? 0}
              </p>
            </div>
            <div className="bg-[rgb(var(--bg-card-alt))] p-3 rounded-lg">
              <p className="text-[rgb(var(--text-secondary))] text-xs mb-1 inline-flex items-center gap-1.5">
                <FaTimesCircle className="text-[rgb(var(--color-danger))]" size={12} />
                Rejected
              </p>
              <p className="text-xl font-bold text-[rgb(var(--color-danger))]">
                {profileUser.rejectedCount ?? 0}
              </p>
            </div>
            <div className="bg-[rgb(var(--bg-card-alt))] p-3 rounded-lg">
              <p className="text-[rgb(var(--text-secondary))] text-xs mb-1 inline-flex items-center gap-1.5">
                <FaClock size={12} />
                Pending
              </p>
              <p className="text-xl font-bold text-[rgb(var(--text-primary))]">
                {pendingCount}
              </p>
            </div>
          </div>

          {reviewedCount > 0 && (
            <div className="pt-3 border-t border-[rgb(var(--border-color))]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[rgb(var(--text-secondary))] text-sm">
                  Approval rate
                </p>
                <span className="text-[rgb(var(--text-primary))] font-bold">
                  {approvalRate}%
                </span>
              </div>
              <div className="bg-[rgb(var(--bg-card-alt))] rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full ${
                    parseFloat(approvalRate) >= 75
                      ? "bg-[rgb(var(--color-primary))]"
                      : parseFloat(approvalRate) >= 50
                      ? "bg-[rgb(var(--color-warning))]"
                      : "bg-[rgb(var(--color-danger))]"
                  }`}
                  style={{ width: `${approvalRate}%` }}
                />
              </div>
            </div>
          )}
        </div>
        )}

        {/* Recent Submissions */}
        {(profileUser.submissionsCount ?? 0) > 0 &&
          (() => {
            // Determine if we should show recent activity
            // Always show to: user themselves, admins
            // Hide to: others if showStatistics is false
            const showStatistics = profileUser.settings?.showStatistics ?? true;
            const isAdmin = session?.user?.role === "admin";
            const shouldShowActivity =
              isOwnProfile || isAdmin || showStatistics;

            return (
              <div className="bg-[rgb(var(--bg-card))] rounded-xl p-4 sm:p-6 border border-[rgb(var(--border-color))]">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[rgb(var(--text-muted))] mb-4">
                  Recent activity
                </h2>

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
                        (profileUser.submissionsCount ?? 0) > 0 ? (
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
                          {paginatedSubmissions.map((submission) => {
                            const correction =
                              submission.type === "correction"
                                ? (submission as Correction & {
                                    type: "correction";
                                  })
                                : null;
                            const showReviewNotes =
                              correction &&
                              (correction.status === "rejected" ||
                                correction.status === "modified") &&
                              correction.reviewNotes;
                            const showSupersededHint =
                              correction?.status === "superseded";

                            return (
                          <Link
                            key={`${submission.type}-${submission.id}`}
                            href={`/games/${submission.gameSlug}`}
                            className="block rounded-lg p-3 sm:p-4 border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] hover:border-[rgb(var(--color-primary))]/40 transition-colors group"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <FaGamepad
                                    className="text-[rgb(var(--color-primary))] flex-shrink-0"
                                    size={14}
                                  />
                                  <h3 className="text-[rgb(var(--text-primary))] font-semibold truncate group-hover:text-[rgb(var(--color-primary))] transition-colors">
                                    {submission.gameTitle}
                                  </h3>
                                </div>
                                <p className="text-xs text-[rgb(var(--text-muted))] flex flex-wrap items-center gap-1.5">
                                  <span>
                                    {submission.type === "correction"
                                      ? "Correction"
                                      : "Game submission"}
                                  </span>
                                  {correction ? (
                                    <>
                                      <span aria-hidden>·</span>
                                      <span>
                                        {getFieldDisplayName(correction.field)}
                                      </span>
                                    </>
                                  ) : null}
                                  <span aria-hidden>·</span>
                                  <span>
                                    {formatDateTime(submission.submittedAt)}
                                  </span>
                                </p>
                                {showReviewNotes && (
                                  <p className="text-[rgb(var(--text-secondary))] text-xs mt-2 p-2 bg-[rgb(var(--bg-card))] rounded border border-[rgb(var(--border-color))]">
                                    <span className="font-medium text-[rgb(var(--text-primary))]">
                                      Reviewer notes:{" "}
                                    </span>
                                    {correction.reviewNotes}
                                  </p>
                                )}
                                {showSupersededHint && (
                                  <p className="text-[rgb(var(--text-muted))] text-xs mt-2">
                                    Replaced by a newer correction you submitted
                                    for the same field.
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <StatusPill
                                  status={submission.status}
                                  label={getCorrectionStatusLabel(
                                    submission.status
                                  )}
                                />
                                <FaExternalLinkAlt
                                  className="text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--color-primary))] transition-colors"
                                  size={12}
                                />
                              </div>
                            </div>
                          </Link>
                            );
                          })}
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
