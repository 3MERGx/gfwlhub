"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  FaTimesCircle,
  FaCheckCircle,
  FaClock,
  FaUser,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import { useToast } from "@/components/ui/toast-context";
import { useCSRF } from "@/hooks/useCSRF";
import { useDebounce } from "@/hooks/useDebounce";
import Image from "next/image";
import { getAvatarUrl } from "@/lib/image-utils";
import Link from "next/link";
import { ListSkeleton } from "@/components/ui/loading-skeleton";
import { FaChevronDown, FaChevronUp, FaExternalLinkAlt, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";

interface ReviewerApplication {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  motivationText: string;
  experienceText: string;
  contributionExamples: string;
  timeAvailability?: string;
  languages?: string;
  priorExperience?: string;
  agreedToRules: boolean;
  createdAt: Date;
  status: "pending" | "approved" | "rejected";
  adminId?: string;
  adminName?: string;
  decisionAt?: Date;
  adminNotes?: string;
}

interface UserStats {
  submissionsCount: number;
  approvedCount: number;
  rejectedCount: number;
  accountAgeDays: number;
}

export default function ReviewerApplicationsPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const { csrfToken } = useCSRF();

  const [applications, setApplications] = useState<ReviewerApplication[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<
    ReviewerApplication[]
  >([]);
  const [statusFilter] = useState<
    "pending" | "approved" | "rejected" | "all"
  >("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] =
    useState<ReviewerApplication | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(
    null
  );
  const [adminNotes, setAdminNotes] = useState("");
  const [userStats, setUserStats] = useState<Record<string, UserStats>>({});
  const [loadingStats, setLoadingStats] = useState<Set<string>>(new Set());
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
  const [expandedApplicationId, setExpandedApplicationId] = useState<string | null>(null);
  const [expandedHistoryUserId, setExpandedHistoryUserId] = useState<string | null>(null);
  const [userApplicationHistory, setUserApplicationHistory] = useState<Record<string, ReviewerApplication[]>>({});
  const [allApplicationsForStats, setAllApplicationsForStats] = useState<ReviewerApplication[]>([]);
  const [sortBy, setSortBy] = useState<"date" | "name" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Calculate stats from all applications (not just filtered ones)
  // Use allApplicationsForStats if available, otherwise fall back to applications
  const statsSource = allApplicationsForStats.length > 0 ? allApplicationsForStats : applications;
  const stats = {
    pending: statsSource.filter((app) => app.status === "pending").length,
    approved: statsSource.filter((app) => app.status === "approved").length,
    rejected: statsSource.filter((app) => app.status === "rejected").length,
    total: statsSource.length,
  };

  const fetchUserStats = useCallback(async (userId: string) => {
    if (userStats[userId] || loadingStats.has(userId)) {
      return;
    }

    setLoadingStats((prev) => new Set(prev).add(userId));
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const user = await response.json();
        const accountAgeDays = Math.floor(
          (Date.now() - new Date(user.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        setUserStats((prev) => ({
          ...prev,
          [userId]: {
            submissionsCount: user.submissionsCount || 0,
            approvedCount: user.approvedCount || 0,
            rejectedCount: user.rejectedCount || 0,
            accountAgeDays,
          },
        }));
        // Also store the avatar
        if (user.avatar) {
          setUserAvatars((prev) => ({
            ...prev,
            [userId]: user.avatar,
          }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch user stats:", error);
    } finally {
      setLoadingStats((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }, [userStats, loadingStats]);

  useEffect(() => {
    if (session?.user.role === "admin") {
      fetchApplications();
      // Also fetch all applications for stats calculation
      fetch(`/api/admin/reviewer-applications`)
        .then((res) => res.json())
        .then((data) => {
          if (data.applications) {
            setAllApplicationsForStats(data.applications);
          }
        })
        .catch(() => {
          // Silently fail - stats will use current applications as fallback
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, statusFilter]);

  // Automatically fetch user stats for all applications when they're loaded
  useEffect(() => {
    if (applications.length > 0) {
      applications.forEach((application) => {
        // Only fetch if we don't already have stats and aren't currently loading
        if (!userStats[application.userId] && !loadingStats.has(application.userId)) {
          fetchUserStats(application.userId);
        }
      });
    }
  }, [applications, fetchUserStats, userStats, loadingStats]);

  useEffect(() => {
    let filtered = [...applications];

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    // Apply search filter
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.userName?.toLowerCase().includes(query) ||
          app.userEmail?.toLowerCase().includes(query) ||
          app.motivationText.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "date":
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "name":
          comparison = (a.userName || "").localeCompare(b.userName || "");
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    setFilteredApplications(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [applications, statusFilter, debouncedSearchQuery, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const fetchUserApplicationHistory = async (userId: string) => {
    if (userApplicationHistory[userId]) {
      return;
    }
    try {
      const response = await fetch(`/api/reviewer-application/history?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUserApplicationHistory((prev) => ({
          ...prev,
          [userId]: data.history || [],
        }));
      }
    } catch (error) {
      console.error("Failed to fetch user application history:", error);
    }
  };

  const fetchApplications = async (fetchAll = false) => {
    try {
      setIsLoading(true);
      // If fetchAll is true, fetch all applications regardless of filter (for stats calculation)
      const statusParam = fetchAll ? "" : (statusFilter === "all" ? "" : `?status=${statusFilter}`);
      const response = await fetch(`/api/admin/reviewer-applications${statusParam}`);
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      }
    } catch (error) {
      showToast(
        error instanceof Error
          ? `Failed to load applications: ${error.message}`
          : "Failed to load applications. Please try again later.",
        undefined,
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = (application: ReviewerApplication) => {
    setSelectedApplication(application);
    setConfirmAction("approve");
    setShowConfirmDialog(true);
  };

  const handleReject = (application: ReviewerApplication) => {
    setSelectedApplication(application);
    setConfirmAction("reject");
    setShowConfirmDialog(true);
  };

  const confirmActionHandler = async () => {
    if (!selectedApplication || !confirmAction) return;

    try {
      const response = await fetch(
        `/api/admin/reviewer-applications/${selectedApplication.id}/${confirmAction}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken || "",
          },
          body: JSON.stringify({
            adminNotes: adminNotes.trim() || undefined,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error ||
            `Failed to ${confirmAction} application. Please check your connection and try again.`
        );
      }

      const actionMessage = confirmAction === "approve" 
        ? "Application approved successfully! The user has been promoted to reviewer and will need to sign in again to access their new permissions."
        : "Application rejected successfully!";
      
      showToast(
        actionMessage,
        undefined,
        "success"
      );
      setShowConfirmDialog(false);
      setSelectedApplication(null);
      setConfirmAction(null);
      setAdminNotes("");
      
      // Refresh applications and stats
      await fetchApplications();
      // Also refresh stats by fetching all applications
      const statsResponse = await fetch(`/api/admin/reviewer-applications`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.applications) {
          setAllApplicationsForStats(statsData.applications);
        }
      }
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to process application. Please try again later.",
        undefined,
        "error"
      );
    }
  };

  if (session?.user.role !== "admin") {
    return (
      <DashboardLayout requireRole="admin">
        <div className="p-6">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold text-[rgb(var(--text-primary))] mb-2">
              Access Denied
            </h1>
            <p className="text-[rgb(var(--text-secondary))]">
              You must be an admin to access this page.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout requireRole="admin">
      <div className="p-6">
        <h1 className="text-3xl font-bold text-[rgb(var(--text-primary))] mb-6">
          Reviewer Applications
        </h1>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[rgb(var(--bg-card))] border border-[rgb(var(--border-color))] rounded-lg p-4">
            <div className="text-sm text-[rgb(var(--text-secondary))] mb-1">Total</div>
            <div className="text-2xl font-bold text-[rgb(var(--text-primary))]">
              {stats.total}
            </div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="text-sm text-[rgb(var(--text-secondary))] mb-1">Pending</div>
            <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="text-sm text-[rgb(var(--text-secondary))] mb-1">Approved</div>
            <div className="text-2xl font-bold text-green-500">{stats.approved}</div>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="text-sm text-[rgb(var(--text-secondary))] mb-1">Rejected</div>
            <div className="text-2xl font-bold text-red-500">{stats.rejected}</div>
          </div>
        </div>

        {/* Filters and Sorting */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, email, or motivation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 border border-[rgb(var(--border-color))] focus:outline-none focus:ring-2 focus:ring-[#107c10]"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSortBy("date");
                  setSortOrder(sortBy === "date" && sortOrder === "desc" ? "asc" : "desc");
                }}
                className="px-4 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:bg-[rgb(var(--bg-card))] transition-colors flex items-center gap-2"
                title="Sort by date"
              >
                <FaSort size={14} />
                Date
                {sortBy === "date" && (sortOrder === "asc" ? <FaSortUp /> : <FaSortDown />)}
              </button>
              <button
                onClick={() => {
                  setSortBy("name");
                  setSortOrder(sortBy === "name" && sortOrder === "asc" ? "desc" : "asc");
                }}
                className="px-4 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:bg-[rgb(var(--bg-card))] transition-colors flex items-center gap-2"
                title="Sort by name"
              >
                <FaSort size={14} />
                Name
                {sortBy === "name" && (sortOrder === "asc" ? <FaSortUp /> : <FaSortDown />)}
              </button>
              <button
                onClick={() => {
                  setSortBy("status");
                  setSortOrder(sortBy === "status" && sortOrder === "asc" ? "desc" : "asc");
                }}
                className="px-4 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:bg-[rgb(var(--bg-card))] transition-colors flex items-center gap-2"
                title="Sort by status"
              >
                <FaSort size={14} />
                Status
                {sortBy === "status" && (sortOrder === "asc" ? <FaSortUp /> : <FaSortDown />)}
              </button>
            </div>
          </div>
        </div>

        {/* Applications List */}
        {isLoading ? (
          <ListSkeleton items={5} />
        ) : filteredApplications.length === 0 ? (
          <div className="text-center py-12 text-[rgb(var(--text-secondary))]">
            No applications found.
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedApplications.map((application) => {
                const isExpanded = expandedApplicationId === application.id;
                const showHistory = expandedHistoryUserId === application.userId;
              const stats = userStats[application.userId];
              const isLoadingUserStats = loadingStats.has(application.userId);
              const history = userApplicationHistory[application.userId] || [];

              return (
                <div
                  key={application.id}
                  className="bg-[rgb(var(--bg-card))] border border-[rgb(var(--border-color))] rounded-lg overflow-hidden"
                >
                  {/* Header - Always Visible */}
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                      <div className="flex items-center gap-4">
                        {userAvatars[application.userId] ? (
                          <div className="relative w-12 h-12 flex-shrink-0">
                            <Image
                              src={getAvatarUrl(userAvatars[application.userId]) || userAvatars[application.userId]}
                              alt={application.userName || "User"}
                              width={48}
                              height={48}
                              className="w-12 h-12 rounded-full object-cover"
                              unoptimized
                              onError={(e) => {
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
                              className="avatar-fallback w-12 h-12 rounded-full bg-gradient-to-br from-[#107c10] to-[#0d6b0d] flex items-center justify-center text-white font-bold text-sm"
                              style={{ display: "none", position: "absolute", top: 0, left: 0 }}
                            >
                              {(application.userName || "U").charAt(0).toUpperCase()}
                            </div>
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[rgb(var(--bg-card-alt))] flex items-center justify-center flex-shrink-0">
                            <FaUser size={20} className="text-[rgb(var(--text-secondary))]" />
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))]">
                            {application.userName || "Unknown User"}
                          </h3>
                          <p className="text-sm text-[rgb(var(--text-secondary))]">
                            {application.userEmail}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <Link
                              href={`/profile/${application.userId}`}
                              className="text-sm text-[#107c10] hover:underline inline-flex items-center gap-1"
                            >
                              View Profile <FaExternalLinkAlt size={10} />
                            </Link>
                            <Link
                              href={`/dashboard/submissions?userId=${application.userId}`}
                              className="text-sm text-[#107c10] hover:underline inline-flex items-center gap-1"
                            >
                              View Corrections <FaExternalLinkAlt size={10} />
                            </Link>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {application.status === "pending" && (
                          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-full text-sm font-medium flex items-center gap-2">
                            <FaClock size={12} />
                            Pending
                          </span>
                        )}
                        {application.status === "approved" && (
                          <span className="px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-sm font-medium flex items-center gap-2">
                            <FaCheckCircle size={12} />
                            Approved
                          </span>
                        )}
                        {application.status === "rejected" && (
                          <span className="px-3 py-1 bg-red-500/20 text-red-500 rounded-full text-sm font-medium flex items-center gap-2">
                            <FaTimesCircle size={12} />
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* User Stats */}
                  <div className="mb-4 px-4 sm:px-6">
                    {isLoadingUserStats && (
                      <p className="text-sm text-[rgb(var(--text-secondary))]">
                        Loading stats...
                      </p>
                    )}
                    {stats && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                        <div>
                          <p className="text-xs text-[rgb(var(--text-secondary))]">
                            Submissions
                          </p>
                          <p className="text-lg font-semibold text-[rgb(var(--text-primary))]">
                            {stats.submissionsCount}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[rgb(var(--text-secondary))]">
                            Accepted
                          </p>
                          <p className="text-lg font-semibold text-green-500">
                            {stats.approvedCount}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[rgb(var(--text-secondary))]">
                            Rejected
                          </p>
                          <p className="text-lg font-semibold text-red-500">
                            {stats.rejectedCount}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[rgb(var(--text-secondary))]">
                            Account Age
                          </p>
                          <p className="text-lg font-semibold text-[rgb(var(--text-primary))]">
                            {stats.accountAgeDays} days
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions - Above collapsible section so buttons don't move */}
                  {application.status === "pending" && (
                    <div className="px-4 sm:px-6 mb-4">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApprove(application)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <FaCheck />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(application)}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <FaTimes />
                          Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Expand/Collapse Button */}
                  <div className="px-4 sm:px-6 mb-4">
                    <button
                      onClick={() =>
                        setExpandedApplicationId(
                          isExpanded ? null : application.id
                        )
                      }
                      className="w-full p-2 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] rounded-lg transition-colors flex items-center justify-between text-sm text-[rgb(var(--text-primary))]"
                    >
                    <span>{isExpanded ? "Hide Details" : "Show Details"}</span>
                      {isExpanded ? (
                        <FaChevronUp size={14} />
                      ) : (
                        <FaChevronDown size={14} />
                      )}
                    </button>
                  </div>

                  {/* Application Details - Collapsible */}
                  {isExpanded && (
                    <div className="mb-4 space-y-4 border-t border-[rgb(var(--border-color))] pt-4">
                    <div>
                      <h4 className="text-sm font-semibold text-[rgb(var(--text-primary))] mb-2">
                        Motivation:
                      </h4>
                      <p className="text-sm text-[rgb(var(--text-secondary))] bg-[rgb(var(--bg-card-alt))] p-3 rounded">
                        {application.motivationText}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-[rgb(var(--text-primary))] mb-2">
                        Experience with Platform:
                      </h4>
                      <p className="text-sm text-[rgb(var(--text-secondary))] bg-[rgb(var(--bg-card-alt))] p-3 rounded">
                        {application.experienceText || "Not provided"}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-[rgb(var(--text-primary))] mb-2">
                        Examples of Contribution:
                      </h4>
                      <p className="text-sm text-[rgb(var(--text-secondary))] bg-[rgb(var(--bg-card-alt))] p-3 rounded whitespace-pre-wrap">
                        {application.contributionExamples || "Not provided"}
                      </p>
                    </div>

                    {application.timeAvailability && (
                      <div>
                        <h4 className="text-sm font-semibold text-[rgb(var(--text-primary))] mb-2">
                          Time & Availability:
                        </h4>
                        <p className="text-sm text-[rgb(var(--text-secondary))] bg-[rgb(var(--bg-card-alt))] p-3 rounded">
                          {application.timeAvailability}
                        </p>
                      </div>
                    )}

                    {application.languages && (
                      <div>
                        <h4 className="text-sm font-semibold text-[rgb(var(--text-primary))] mb-2">
                          Languages:
                        </h4>
                        <p className="text-sm text-[rgb(var(--text-secondary))] bg-[rgb(var(--bg-card-alt))] p-3 rounded">
                          {application.languages}
                        </p>
                      </div>
                    )}

                    {application.priorExperience && (
                      <div>
                        <h4 className="text-sm font-semibold text-[rgb(var(--text-primary))] mb-2">
                          Prior Moderation/Reviewer Experience:
                        </h4>
                        <p className="text-sm text-[rgb(var(--text-secondary))] bg-[rgb(var(--bg-card-alt))] p-3 rounded">
                          {application.priorExperience}
                        </p>
                      </div>
                    )}

                      {/* Application Info */}
                      <div className="text-sm text-[rgb(var(--text-secondary))]">
                    <p>
                      Submitted:{" "}
                      {new Date(application.createdAt).toLocaleString()}
                    </p>
                    {application.decisionAt && (
                      <p>
                        Decision:{" "}
                        {new Date(application.decisionAt).toLocaleString()}
                      </p>
                    )}
                    {application.adminName && (
                      <p>Reviewed by: {application.adminName}</p>
                    )}
                    {application.adminNotes && (
                      <div className="mt-2 p-2 bg-[rgb(var(--bg-card-alt))] rounded">
                        <strong>Admin Notes:</strong> {application.adminNotes}
                      </div>
                    )}
                      </div>

                      {/* User Application History */}
                      <div className="border-t border-[rgb(var(--border-color))] pt-4">
                        <button
                          onClick={() => {
                            if (!showHistory) {
                              fetchUserApplicationHistory(application.userId);
                            }
                            setExpandedHistoryUserId(
                              showHistory ? null : application.userId
                            );
                          }}
                          className="w-full p-2 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] rounded-lg transition-colors flex items-center justify-between text-sm text-[rgb(var(--text-primary))] mb-2"
                        >
                          <span>
                            {showHistory
                              ? "Hide Application History"
                              : "Show Application History"}
                          </span>
                          {showHistory ? (
                            <FaChevronUp size={14} />
                          ) : (
                            <FaChevronDown size={14} />
                          )}
                        </button>
                        {showHistory && (
                          <div className="space-y-2 mt-2">
                            {history.length === 0 ? (
                              <p className="text-sm text-[rgb(var(--text-secondary))]">
                                No previous applications found.
                              </p>
                            ) : (
                              history.map((histApp) => (
                                <div
                                  key={histApp.id}
                                  className="p-3 bg-[rgb(var(--bg-card-alt))] rounded border border-[rgb(var(--border-color))]"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-[rgb(var(--text-primary))] capitalize">
                                      {histApp.status}
                                    </span>
                                    <span className="text-xs text-[rgb(var(--text-secondary))]">
                                      {new Date(histApp.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  {histApp.decisionAt && (
                                    <p className="text-xs text-[rgb(var(--text-secondary))]">
                                      Decision:{" "}
                                      {new Date(histApp.decisionAt).toLocaleDateString()}
                                    </p>
                                  )}
                                  {histApp.adminNotes && (
                                    <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">
                                      Note: {histApp.adminNotes}
                                    </p>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:bg-[rgb(var(--bg-card))] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-[rgb(var(--text-secondary))]">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:bg-[rgb(var(--bg-card))] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* Admin Notes Dialog */}
        {showConfirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-[rgb(var(--bg-card))] rounded-lg max-w-md w-full border border-[rgb(var(--border-color))] shadow-xl p-6">
              <h3 className="text-lg font-bold text-[rgb(var(--text-primary))] mb-2">
                {confirmAction === "approve"
                  ? "Approve Reviewer Application"
                  : "Reject Reviewer Application"}
              </h3>
              <p className="text-sm text-[rgb(var(--text-secondary))] mb-4">
                {confirmAction === "approve"
                  ? `Are you sure you want to approve ${selectedApplication?.userName}'s application? This will grant them reviewer privileges.`
                  : `Are you sure you want to reject ${selectedApplication?.userName}'s application?`}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[rgb(var(--text-primary))] mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-3 py-2 border border-[rgb(var(--border-color))] focus:outline-none focus:ring-2 focus:ring-[#107c10]"
                  placeholder="Add any notes about this decision..."
                  maxLength={1000}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setSelectedApplication(null);
                    setConfirmAction(null);
                    setAdminNotes("");
                  }}
                  className="flex-1 px-4 py-2 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmActionHandler}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    confirmAction === "approve"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {confirmAction === "approve" ? "Approve" : "Reject"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

