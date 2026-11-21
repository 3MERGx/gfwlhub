"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import {
  FaCheck,
  FaTimes,
  FaEye,
  FaRocket,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { GameSubmission } from "@/types/crowdsource";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardErrorBanner from "@/components/dashboard/DashboardErrorBanner";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ConfirmPublishModal from "@/components/ConfirmPublishModal";
import { useToast } from "@/components/ui/toast-context";
import { safeLog } from "@/lib/security";
import { useCSRF } from "@/hooks/useCSRF";
import { useDebounce } from "@/hooks/useDebounce";
import { usePusherChannel } from "@/hooks/usePusherChannel";
import { PUSHER_EVENTS } from "@/lib/pusher-client";
import { ListSkeleton } from "@/components/ui/loading-skeleton";
import { valuesAreEffectivelySame } from "@/lib/normalize-value";
import { formatReviewDateTime } from "@/lib/format-review-date";

function GameSubmissionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const { csrfToken } = useCSRF();
  const [allSubmissions, setAllSubmissions] = useState<GameSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [gameFilter, setGameFilter] = useState("");
  const [selectedSubmission, setSelectedSubmission] =
    useState<GameSubmission | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const [showConfirmPublish, setShowConfirmPublish] = useState(false);
  const [publishingSubmission, setPublishingSubmission] =
    useState<GameSubmission | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const debouncedGameFilter = useDebounce(gameFilter, 300);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    const game = new URLSearchParams(window.location.search).get("game");
    if (game) setGameFilter(game);
  }, []);

  const fetchSubmissions = useCallback(
    async (background = false) => {
      if (!background) setLoading(true);
      try {
        const response = await fetch(`/api/game-submissions?_t=${Date.now()}`, {
          cache: "no-store",
        });
        if (response.ok) {
          const data = await response.json();
          setAllSubmissions(Array.isArray(data) ? data : []);
          setFetchError(null);
        } else if (!background) {
          setFetchError("Failed to fetch game submissions. Please try again.");
          showToast("Failed to fetch game submissions", 3000, "error");
        }
      } catch (error) {
        safeLog.error("Error fetching game submissions:", error);
        if (!background) {
          setFetchError("Failed to fetch game submissions. Please try again.");
          showToast("Failed to fetch game submissions", 3000, "error");
        }
      } finally {
        if (!background) setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (session) {
      void fetchSubmissions();
    }
    // Initial load only; silent refreshes are handled by Pusher and focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  usePusherChannel(PUSHER_EVENTS.GAME_SUBMISSIONS_UPDATED, () => {
    void fetchSubmissions(true);
  });

  useEffect(() => {
    const onFocus = () => void fetchSubmissions(true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReview = (submission: GameSubmission) => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    setSelectedSubmission(submission);
    setReviewNotes("");
    setShowReviewModal(true);
  };

  const closeReviewModal = useCallback(() => {
    setShowReviewModal(false);
    setSelectedSubmission(null);
    setReviewNotes("");
    setShowDiscardConfirm(false);
    previousFocusRef.current?.focus();
  }, []);

  const requestCloseReviewModal = useCallback(() => {
    if (reviewNotes.trim()) {
      setShowDiscardConfirm(true);
      return;
    }
    closeReviewModal();
  }, [reviewNotes, closeReviewModal]);

  useEffect(() => {
    if (!showReviewModal) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
          return;
        }
        requestCloseReviewModal();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showReviewModal, showDiscardConfirm, requestCloseReviewModal]);

  useEffect(() => {
    if (!showReviewModal || !modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();
  }, [showReviewModal, selectedSubmission]);

  const submitReview = async (action: "approved" | "rejected") => {
    if (!selectedSubmission) return;

    setIsReviewing(true);
    try {
      const response = await fetch(
        `/api/game-submissions/${selectedSubmission.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken || "",
          },
          body: JSON.stringify({
            status: action,
            reviewNotes,
          }),
        }
      );

      if (response.ok) {
        const approvedSubmission = action === "approved" ? selectedSubmission : null;

        // Refetch first so list updates before closing modal
        await fetchSubmissions(true);

        setShowReviewModal(false);
        setReviewNotes("");

        // If approved and has required fields, check if we should offer to publish
        if (action === "approved" && approvedSubmission && hasRequiredFields(approvedSubmission)) {
          // Fetch the updated submission to check if game is published
          try {
            const updatedResponse = await fetch(`/api/game-submissions/${approvedSubmission.id}`);
            if (updatedResponse.ok) {
              const updatedSubmission = await updatedResponse.json();
              const isAlreadyPublished = updatedSubmission.currentGameData?.featureEnabled === true;
              
              if (!isAlreadyPublished) {
                // Set the updated submission and show publish modal
                setPublishingSubmission(updatedSubmission);
                setShowConfirmPublish(true);
                showToast(
                  `Submission approved! Ready to publish "${approvedSubmission.gameTitle}"?`,
                  4000,
                  "success"
                );
              } else {
                setSelectedSubmission(null);
                showToast(
                  `Submission approved successfully`,
                  3000,
                  "success"
                );
              }
            } else {
              setSelectedSubmission(null);
              showToast(
                `Submission approved successfully`,
                3000,
                "success"
              );
            }
          } catch {
            setSelectedSubmission(null);
            showToast(
              `Submission approved successfully`,
              3000,
              "success"
            );
          }
        } else {
          setSelectedSubmission(null);
          showToast(
            `Submission ${
              action === "approved" ? "approved" : "rejected"
            } successfully`,
            3000,
            "success"
          );
        }
        
        // Dispatch event to update notification counts
        window.dispatchEvent(new CustomEvent("gameSubmissionsUpdated"));
      } else {
        const errorData = await response.json();
        showToast(errorData.error || "Failed to submit review", 5000, "error");
      }
    } catch (error) {
      safeLog.error("Error submitting review:", error);
      showToast("Failed to submit review", 5000, "error");
    } finally {
      setIsReviewing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClass = "px-3 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "pending":
        return (
          <span
            className={`${baseClass} bg-yellow-500/20 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400`}
          >
            Pending
          </span>
        );
      case "approved":
        return (
          <span
            className={`${baseClass} bg-green-500/20 dark:bg-green-900/30 text-green-600 dark:text-green-400`}
          >
            Approved
          </span>
        );
      case "rejected":
        return (
          <span
            className={`${baseClass} bg-red-500/20 dark:bg-red-900/30 text-red-600 dark:text-red-400`}
          >
            Rejected
          </span>
        );
      case "superseded":
        return (
          <span
            className={`${baseClass} bg-gray-500/20 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400`}
          >
            Superseded
          </span>
        );
      default:
        return (
          <span
            className={`${baseClass} bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))]`}
          >
            {status}
          </span>
        );
    }
  };

  const formatDate = (date: Date) => formatReviewDateTime(date);

  const isReviewer =
    session?.user?.role === "reviewer" || session?.user?.role === "admin";
  const isAdmin = session?.user?.role === "admin";

  // Helper function to check if game has minimum required fields
  const hasRequiredFields = (submission: GameSubmission) => {
    const data = submission.proposedData;
    return !!(
      data.title &&
      data.releaseDate &&
      data.developer &&
      data.publisher
    );
  };

  // Helper function to get required fields status
  const getRequiredFields = (submission: GameSubmission) => {
    const data = submission.proposedData;
    return {
      title: !!data.title,
      releaseDate: !!data.releaseDate,
      developer: !!data.developer,
      publisher: !!data.publisher,
    };
  };

  const handlePublishGame = (submission: GameSubmission) => {
    setPublishingSubmission(submission);
    setShowConfirmPublish(true);
  };

  const handlePublishConfirm = async () => {
    if (!publishingSubmission) return;

    setShowConfirmPublish(false);
    try {
      if (!csrfToken) {
        showToast("Security token not ready. Please wait...", 3000, "error");
        return;
      }

      const response = await fetch(
        `/api/games/${publishingSubmission.gameSlug}/publish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
        }
      );

      if (response.ok) {
        showToast(
          `${publishingSubmission.gameTitle} has been published successfully!`,
          5000,
          "success"
        );
        
        // Refresh submissions list to update UI
        await fetchSubmissions(true);
        
        // Refresh router to get updated game data
        router.refresh();
        
        // Redirect to the published game page after a short delay
        setTimeout(() => {
          router.push(`/games/${publishingSubmission.gameSlug}`);
        }, 500);
      } else {
        const error = await response.json();
        showToast(
          `Failed to publish game: ${error.error || "Unknown error"}`,
          5000,
          "error"
        );
      }
    } catch (error) {
      safeLog.error("Error publishing game:", error);
      showToast("Failed to publish game", 5000, "error");

      // Refresh UI
      if (pathname === "/dashboard/game-submissions") {
        router.refresh();
      }
    } finally {
      setPublishingSubmission(null);
    }
  };

  const handlePublishCancel = () => {
    setShowConfirmPublish(false);
    setPublishingSubmission(null);
  };

  const filteredSubmissions = useMemo(() => {
    let list = allSubmissions;
    if (statusFilter && statusFilter !== "all") {
      list = list.filter((submission) => submission.status === statusFilter);
    }
    if (debouncedGameFilter) {
      const query = debouncedGameFilter.toLowerCase();
      list = list.filter(
        (submission) =>
          submission.gameTitle.toLowerCase().includes(query) ||
          submission.gameSlug.toLowerCase().includes(query)
      );
    }
    return list;
  }, [allSubmissions, statusFilter, debouncedGameFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSubmissions.length / itemsPerPage)
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, debouncedGameFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedSubmissions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSubmissions.slice(start, start + itemsPerPage);
  }, [filteredSubmissions, currentPage, itemsPerPage]);

  const hasActiveFilters = Boolean(
    gameFilter || statusFilter !== "pending"
  );

  const clearGameFilters = () => {
    setGameFilter("");
    setStatusFilter("pending");
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState({}, "", "/dashboard/game-submissions");
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[rgb(var(--bg-card))] rounded-lg shadow-xl p-6 md:p-8">
            <div className="mb-6">
              <div className="h-8 w-64 bg-[rgb(var(--bg-card-alt))] rounded animate-pulse mb-2" />
              <div className="h-4 w-96 bg-[rgb(var(--bg-card-alt))] rounded animate-pulse" />
            </div>
            <ListSkeleton items={5} />
          </div>
        </div>
      </div>
    );
  }

  // Calculate stats from all submissions, not filtered ones
  const stats = {
    total: allSubmissions.length,
    pending: allSubmissions.filter((s) => s.status === "pending").length,
    approved: allSubmissions.filter((s) => s.status === "approved").length,
    rejected: allSubmissions.filter((s) => s.status === "rejected").length,
    superseded: allSubmissions.filter((s) => s.status === "superseded").length,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-[rgb(var(--bg-card))] rounded-lg shadow-xl p-6 md:p-8">
          <DashboardPageHeader
            title="Game submissions"
            subtitle="Review community-submitted game details. Publishing is admin-only after a submission is approved."
          />

          {fetchError && (
            <DashboardErrorBanner
              message={fetchError}
              onRetry={() => {
                void fetchSubmissions();
              }}
            />
          )}

          {/* Stats - Total = Pending + Approved + Rejected + Superseded. On mobile: Total 2x1, then 2x2. */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="col-span-2 md:col-span-1 bg-[rgb(var(--bg-card))] rounded-lg p-4 border border-[rgb(var(--border-color))]">
              <div className="text-2xl font-bold text-[rgb(var(--text-primary))]">
                {stats.total}
              </div>
              <div className="text-sm text-[rgb(var(--text-secondary))]">
                Total
              </div>
            </div>
            <div className="bg-[rgb(var(--bg-card))] rounded-lg p-4 border border-[rgb(var(--border-color))]">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.pending}
              </div>
              <div className="text-sm text-[rgb(var(--text-secondary))]">
                Pending
              </div>
            </div>
            <div className="bg-[rgb(var(--bg-card))] rounded-lg p-4 border border-[rgb(var(--border-color))]">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.approved}
              </div>
              <div className="text-sm text-[rgb(var(--text-secondary))]">
                Approved
              </div>
            </div>
            <div className="bg-[rgb(var(--bg-card))] rounded-lg p-4 border border-[rgb(var(--border-color))]">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats.rejected}
              </div>
              <div className="text-sm text-[rgb(var(--text-secondary))]">
                Rejected
              </div>
            </div>
            <div
              className="bg-[rgb(var(--bg-card))] rounded-lg p-4 border border-[rgb(var(--border-color))]"
              title="Another submission for the same game was approved first. Not counted as rejected."
            >
              <div className="text-2xl font-bold text-slate-500 dark:text-slate-400">
                {stats.superseded}
              </div>
              <div className="text-sm text-[rgb(var(--text-secondary))]">
                Superseded
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-[rgb(var(--text-primary))] mb-2">
                Status
              </label>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="superseded">Superseded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-[rgb(var(--text-primary))] mb-2">
                Game
              </label>
              <input
                type="text"
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value)}
                placeholder="Filter by game title or slug..."
                className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
              />
            </div>
          </div>

          {/* Submissions List */}
          {filteredSubmissions.length === 0 ? (
            <DashboardEmptyState
              title={
                gameFilter
                  ? "No game submissions found matching your search."
                  : statusFilter === "all"
                    ? "No game submissions found."
                    : `No ${statusFilter} game submissions.`
              }
              description={
                gameFilter
                  ? "Try a different title or slug, or clear the search."
                  : statusFilter !== "all"
                    ? 'Try "All Status" to see other submissions.'
                    : undefined
              }
              onClearFilters={hasActiveFilters ? clearGameFilters : undefined}
            />
          ) : (
            <div className="space-y-4">
              {paginatedSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="bg-[rgb(var(--bg-card))] rounded-lg p-4 md:p-6 border border-[rgb(var(--border-color))]"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-lg sm:text-xl font-bold text-[rgb(var(--text-primary))] min-w-0 break-words">
                          {submission.gameTitle}
                        </h3>
                        {getStatusBadge(submission.status)}
                      </div>
                      <div className="text-sm text-[rgb(var(--text-secondary))] space-y-1">
                        <p>
                          Submitted by{" "}
                          <span className="text-[rgb(var(--text-primary))]">
                            {submission.submittedByName}
                          </span>
                        </p>
                        <p>{formatDate(submission.submittedAt)}</p>
                        {submission.reviewedByName && (
                          <p>
                            Reviewed by{" "}
                            <span className="text-[rgb(var(--text-primary))]">
                              {submission.reviewedByName}
                            </span>{" "}
                            on {formatDate(submission.reviewedAt!)}
                          </p>
                        )}
                        {submission.publishedByName &&
                          submission.publishedAt && (
                            <p>
                              Published by{" "}
                              <span className="text-[rgb(var(--text-primary))]">
                                {submission.publishedByName}
                              </span>{" "}
                              on {formatDate(submission.publishedAt)}
                            </p>
                          )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0 w-full md:w-auto">
                      <button
                        onClick={() => handleReview(submission)}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 bg-[#107c10] hover:bg-[#0d6b0d] text-white px-4 py-2 rounded-lg transition-colors text-sm touch-manipulation"
                      >
                        {submission.status === "pending" ? (
                          <FaCheck />
                        ) : (
                          <FaEye />
                        )}
                        {submission.status === "pending" ? "Review" : "View"}
                      </button>
                      {isAdmin &&
                        submission.status === "approved" &&
                        hasRequiredFields(submission) &&
                        !submission.currentGameData?.featureEnabled && (
                          <button
                            onClick={() => handlePublishGame(submission)}
                            className="inline-flex min-h-[44px] items-center justify-center gap-2 border border-[#107c10] text-[#107c10] hover:bg-[#107c10]/10 px-4 py-2 rounded-lg transition-colors text-sm font-semibold touch-manipulation"
                            title="This game has the minimum required fields and can be published"
                          >
                            <FaRocket />
                            Publish Game
                          </button>
                        )}
                    </div>
                  </div>

                  {/* Preview of submitted data: changed/new vs same as current (normalized) */}
                  {(() => {
                    interface SubmissionWithCurrentGame extends GameSubmission {
                      currentGameData?: Record<string, unknown>;
                    }
                    const currentGame = (
                      submission as SubmissionWithCurrentGame
                    ).currentGameData;
                    const changedFields: string[] = [];
                    const sameAsCurrentFields: string[] = [];
                    for (const key of Object.keys(submission.proposedData)) {
                      const proposedValue =
                        submission.proposedData[
                          key as keyof typeof submission.proposedData
                        ];
                      if (!proposedValue) continue;

                      if (!currentGame) {
                        changedFields.push(key);
                        continue;
                      }
                      const currentValue = currentGame[key];
                      if (valuesAreEffectivelySame(proposedValue, currentValue)) {
                        sameAsCurrentFields.push(key);
                      } else {
                        changedFields.push(key);
                      }
                    }

                    if (changedFields.length === 0 && sameAsCurrentFields.length === 0) return null;

                    const formatKey = (k: string) => k.replace(/([A-Z])/g, " $1").trim();
                    return (
                      <div className="bg-[rgb(var(--bg-card-alt))] rounded p-4 text-sm space-y-3">
                        {changedFields.length > 0 && (
                          <div>
                            <p className="text-[rgb(var(--text-secondary))] mb-2">
                              Submitted Fields (changed / new):
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {changedFields.map((key) => (
                                <span key={key} className="text-green-400 text-xs">
                                  ✓ {formatKey(key)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {sameAsCurrentFields.length > 0 && (
                          <div>
                            <p className="text-[rgb(var(--text-secondary))] mb-2">
                              No meaningful change (same as current):
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {sameAsCurrentFields.map((key) => (
                                <span
                                  key={key}
                                  className="text-amber-500 dark:text-amber-400 text-xs"
                                  title="Value matches current after normalizing spaces/case"
                                >
                                  ≈ {formatKey(key)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {submission.submitterNotes && (
                    <div className="mt-3 bg-[rgb(var(--bg-card-alt))] rounded p-3 text-sm">
                      <p className="text-[rgb(var(--text-secondary))] mb-1">
                        Submitter Notes:
                      </p>
                      <p className="text-[rgb(var(--text-primary))]">
                        {submission.submitterNotes}
                      </p>
                    </div>
                  )}

                  {submission.reviewNotes && (
                    <div className="mt-3 bg-[rgb(var(--bg-card-alt))] rounded p-3 text-sm">
                      <p className="text-[rgb(var(--text-secondary))] mb-1">
                        Review Notes:
                      </p>
                      <p className="text-[rgb(var(--text-primary))]">
                        {submission.reviewNotes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {filteredSubmissions.length > 0 && totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                aria-label="Previous page"
              >
                <FaChevronLeft size={14} aria-hidden />
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-[rgb(var(--text-secondary))]">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                aria-label="Next page"
              >
                Next
                <FaChevronRight size={14} aria-hidden />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedSubmission && (
        <div
          className="fixed inset-0 bg-black/40 dark:bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto"
          onClick={(event) => {
            if (event.target === event.currentTarget) requestCloseReviewModal();
          }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            className="bg-[rgb(var(--bg-card))] rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-[rgb(var(--border-color))] my-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[rgb(var(--bg-card))] border-b border-[rgb(var(--border-color))] p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 z-10">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-[rgb(var(--text-primary))] break-words">
                  {selectedSubmission.gameTitle}
                </h2>
                <p className="text-[rgb(var(--text-secondary))] text-xs sm:text-sm mt-1">
                  Submitted by {selectedSubmission.submittedByName}
                </p>
              </div>
              <button
                onClick={requestCloseReviewModal}
                className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors flex-shrink-0 self-start sm:self-auto"
                aria-label="Close modal"
              >
                <FaTimes size={24} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Submitted Data - show all fields with normalized "same as current" indicator */}
              {(() => {
                interface SubmissionWithOriginalGame extends GameSubmission {
                  originalGameData?: Record<string, unknown>;
                }
                const originalGame = (
                  selectedSubmission as SubmissionWithOriginalGame
                ).originalGameData;

                const allFields = Object.entries(
                  selectedSubmission.proposedData
                ).filter(
                  ([, value]) =>
                    value !== null && value !== undefined && value !== ""
                );

                const changedCount = allFields.filter(([key, value]) => {
                  if (!originalGame) return true;
                  return !valuesAreEffectivelySame(
                    value,
                    originalGame[key as keyof typeof originalGame]
                  );
                }).length;
                const sameAsCurrentCount = allFields.length - changedCount;

                if (allFields.length === 0) return null;

                if (sameAsCurrentCount === allFields.length) {
                  return (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-500/30 rounded-lg p-4">
                      <p className="text-yellow-800 dark:text-yellow-300 text-sm">
                        No meaningful change. All submitted fields match the
                        original game data (after normalizing spaces and case).
                      </p>
                    </div>
                  );
                }

                return (
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-[rgb(var(--text-primary))] mb-3 sm:mb-4">
                      Submitted Changes ({changedCount} changed
                      {sameAsCurrentCount > 0 &&
                        `, ${sameAsCurrentCount} same as current`}
                      )
                    </h3>
                    <div className="space-y-2 sm:space-y-3">
                      {allFields.map(([key, value]) => {
                        const isUrl =
                          typeof value === "string" &&
                          (value.startsWith("http://") ||
                            value.startsWith("https://"));
                        const isDownloadLink =
                          key === "downloadLink" ||
                          key === "communityAlternativeDownloadLink";
                        const originalValue = originalGame?.[key];
                        const hasOriginalValue =
                          originalValue !== undefined &&
                          originalValue !== null &&
                          originalValue !== "";
                        const isSameAsCurrent =
                          hasOriginalValue &&
                          valuesAreEffectivelySame(value, originalValue);

                        let badge: "changed" | "new" | "same" = hasOriginalValue
                          ? "changed"
                          : "new";
                        if (isSameAsCurrent) badge = "same";

                        return (
                          <div
                            key={key}
                            className={`bg-[rgb(var(--bg-card-alt))] rounded p-3 sm:p-4 ${
                              isDownloadLink
                                ? "border-2 border-yellow-500/50"
                                : isSameAsCurrent
                                  ? "border-l-4 border-amber-500"
                                  : "border-l-4 border-blue-500"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1 sm:mb-2 flex-wrap">
                              <p className="text-xs sm:text-sm text-[rgb(var(--text-secondary))] capitalize">
                                {key.replace(/([A-Z])/g, " $1").trim()}:
                              </p>
                              {isDownloadLink && (
                                <span className="px-2 py-0.5 rounded text-xs border bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30 font-semibold">
                                  ⚠️ Download Link - Review Carefully
                                </span>
                              )}
                              {badge === "same" ? (
                                <span
                                  className="px-2 py-0.5 rounded text-xs border bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 font-semibold"
                                  title="Value matches current after normalizing spaces/case"
                                >
                                  Same as current
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-xs border bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 font-semibold">
                                  {badge === "changed"
                                    ? "Changed"
                                    : "New Field"}
                                </span>
                              )}
                            </div>
                            {hasOriginalValue && (
                              <div className="mb-2">
                                <p className="text-[rgb(var(--text-muted))] text-xs mb-1">
                                  <span className="font-semibold">
                                    Original:
                                  </span>{" "}
                                  {Array.isArray(originalValue)
                                    ? originalValue.join(", ")
                                    : String(originalValue)}
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="text-[rgb(var(--text-secondary))] text-xs mb-1">
                                <span className="font-semibold">Proposed:</span>
                              </p>
                              {isUrl ? (
                                <a
                                  href={value as string}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 break-all text-xs sm:text-sm underline"
                                >
                                  {value as string}
                                </a>
                              ) : (
                                <p className="text-[rgb(var(--text-primary))] text-xs sm:text-sm break-words whitespace-pre-wrap">
                                  {Array.isArray(value)
                                    ? value.join(", ")
                                    : value.toString()}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {selectedSubmission.submitterNotes && (
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-[rgb(var(--text-primary))] mb-2">
                    Submitter Notes
                  </h3>
                  <div className="bg-[rgb(var(--bg-card-alt))] rounded p-3 sm:p-4">
                    <p className="text-[rgb(var(--text-primary))] text-xs sm:text-sm break-words whitespace-pre-wrap">
                      {selectedSubmission.submitterNotes}
                    </p>
                  </div>
                </div>
              )}

              {isReviewer && selectedSubmission.status === "pending" && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                    Review Notes (Optional)
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                    className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#107c10] border border-[rgb(var(--border-color))]"
                    placeholder="Add any notes about this review..."
                  />
                </div>
              )}

              {isReviewer && selectedSubmission.status === "pending" && (
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                  <button
                    onClick={() => submitReview("approved")}
                    disabled={isReviewing}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base"
                  >
                    {isReviewing ? "Approving..." : "Approve Submission"}
                  </button>
                  <button
                    onClick={() => submitReview("rejected")}
                    disabled={isReviewing}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base"
                  >
                    {isReviewing ? "Rejecting..." : "Reject Submission"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDiscardConfirm}
        title="Discard review?"
        message="You have unsaved review notes. Close anyway?"
        confirmText="Discard"
        cancelText="Keep editing"
        variant="warning"
        onConfirm={closeReviewModal}
        onCancel={() => setShowDiscardConfirm(false)}
      />

      {/* Confirm Publish Modal */}
      {showConfirmPublish && publishingSubmission && (
        <ConfirmPublishModal
          gameTitle={publishingSubmission.gameTitle}
          requiredFields={getRequiredFields(publishingSubmission)}
          onConfirm={handlePublishConfirm}
          onCancel={handlePublishCancel}
        />
      )}
    </div>
  );
}

export default function GameSubmissionsPageWrapper() {
  return (
    <DashboardLayout requireRole="reviewer">
      <GameSubmissionsPage />
    </DashboardLayout>
  );
}
