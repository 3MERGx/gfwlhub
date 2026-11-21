"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import {
  FaCheck,
  FaEye,
  FaRocket,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import {
  GAME_DOWNLOAD_LINK_FIELDS,
  type GameDownloadLinkField,
  type GameSubmission,
} from "@/types/crowdsource";
import VirusTotalScanPanel, {
  scanResultFromSaved,
  type VirusTotalScanResult,
} from "@/components/VirusTotalScanPanel";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardErrorBanner from "@/components/dashboard/DashboardErrorBanner";
import DashboardToolbar, {
  FilterChip,
} from "@/components/dashboard/DashboardToolbar";
import QueueCounts from "@/components/dashboard/QueueCounts";
import StatusPill from "@/components/dashboard/StatusPill";
import ReviewModal from "@/components/dashboard/ReviewModal";
import DownloadLinkReview from "@/components/dashboard/DownloadLinkReview";
import {
  ReviewApproveButton,
  ReviewGhostButton,
  ReviewRejectButton,
} from "@/components/dashboard/ReviewActions";
import ConfirmDialog from "@/components/ConfirmDialog";
import SubmitterHoverLink from "@/components/SubmitterHoverLink";
import CorrectionValueDiff from "@/components/CorrectionValueDiff";
import {
  formatCrowdsourceValue,
  getFieldDisplayName,
} from "@/lib/field-display";
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
  const [showFilters, setShowFilters] = useState(false);
  const [scanningUrl, setScanningUrl] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<
    Map<string, VirusTotalScanResult | null>
  >(new Map());
  const [scanError, setScanError] = useState("");
  const itemsPerPage = 10;
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
    setSelectedSubmission(submission);
    setReviewNotes("");
    setShowReviewModal(true);
  };

  const closeReviewModal = useCallback(() => {
    setShowReviewModal(false);
    setSelectedSubmission(null);
    setReviewNotes("");
    setShowDiscardConfirm(false);
  }, []);

  const requestCloseReviewModal = useCallback(() => {
    if (reviewNotes.trim()) {
      setShowDiscardConfirm(true);
      return;
    }
    closeReviewModal();
  }, [reviewNotes, closeReviewModal]);

  useEffect(() => {
    if (!showReviewModal || !selectedSubmission) return;
    const next = new Map<string, VirusTotalScanResult | null>();
    for (const field of GAME_DOWNLOAD_LINK_FIELDS) {
      const value = selectedSubmission.proposedData[field];
      if (typeof value !== "string" || !/^https?:\/\//i.test(value)) continue;
      const linkedReportUrl =
        field === "downloadLink"
          ? selectedSubmission.proposedData.virusTotalUrl
          : selectedSubmission.proposedData.communityAlternativeVirusTotalUrl;
      next.set(
        value,
        scanResultFromSaved(
          value,
          selectedSubmission.virusTotalScans?.[field],
          linkedReportUrl
        )
      );
    }
    setScanResults(next);
    setScanError("");
    setScanningUrl(null);
  }, [showReviewModal, selectedSubmission?.id]);

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
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="h-8 w-64 bg-[rgb(var(--bg-card-alt))] rounded animate-pulse mb-2" />
            <div className="h-4 w-96 bg-[rgb(var(--bg-card-alt))] rounded animate-pulse" />
          </div>
          <ListSkeleton items={5} />
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
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
      <div className="max-w-7xl mx-auto">
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

          <DashboardToolbar
            filtersOpen={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            filtersActive={hasActiveFilters}
            search={
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
                <input
                  type="text"
                  value={gameFilter}
                  onChange={(e) => setGameFilter(e.target.value)}
                  placeholder="Filter by game title or slug..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[rgb(var(--color-primary))] focus:outline-none"
                />
              </div>
            }
            filters={
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-auto min-w-[140px]">
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
            }
            chips={
              hasActiveFilters ? (
                <>
                  {gameFilter && (
                    <FilterChip
                      label={`Game: ${gameFilter}`}
                      onClear={() => setGameFilter("")}
                    />
                  )}
                  {statusFilter !== "pending" && (
                    <FilterChip
                      label={`Status: ${statusFilter}`}
                      onClear={() => setStatusFilter("pending")}
                    />
                  )}
                </>
              ) : undefined
            }
          />

          <QueueCounts
            items={[
              { label: "Total", value: stats.total },
              { label: "Pending", value: stats.pending, tone: "warning" },
              { label: "Approved", value: stats.approved, tone: "success" },
              { label: "Rejected", value: stats.rejected, tone: "danger" },
              {
                label: "Superseded",
                value: stats.superseded,
                description:
                  "A later approved submission for the same game replaced this one. It was not rejected, so it does not count against the submitter.",
              },
            ]}
          />

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
            <div className="dashboard-inbox">
              {paginatedSubmissions.map((submission) => {
                interface SubmissionWithCurrentGame extends GameSubmission {
                  currentGameData?: Record<string, unknown>;
                }
                const currentGame = (submission as SubmissionWithCurrentGame)
                  .currentGameData;
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
                  if (valuesAreEffectivelySame(proposedValue, currentGame[key])) {
                    sameAsCurrentFields.push(key);
                  } else {
                    changedFields.push(key);
                  }
                }
                return (
                  <div key={submission.id} className="dashboard-inbox-row">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-medium text-[rgb(var(--text-primary))] break-words">
                            {submission.gameTitle}
                          </h3>
                          <StatusPill status={submission.status} />
                          {changedFields.slice(0, 6).map((key) => (
                            <span
                              key={key}
                              className="status-pill status-pill-approved"
                            >
                              {getFieldDisplayName(key)}
                            </span>
                          ))}
                          {sameAsCurrentFields.length > 0 && (
                            <span className="status-pill status-pill-pending">
                              {sameAsCurrentFields.length} unchanged
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[rgb(var(--text-muted))] flex flex-wrap items-center gap-1.5">
                          <SubmitterHoverLink
                            userId={submission.submittedBy}
                            name={submission.submittedByName}
                          />
                          <span>·</span>
                          <span>{formatDate(submission.submittedAt)}</span>
                          {submission.reviewedByName ? (
                            <>
                              <span>·</span>
                              <span>
                                Reviewed by {submission.reviewedByName}
                              </span>
                            </>
                          ) : null}
                        </p>
                        {submission.submitterNotes && (
                          <p className="text-xs text-[rgb(var(--text-secondary))] line-clamp-1 mt-0.5">
                            {submission.submitterNotes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                        <button
                          onClick={() => handleReview(submission)}
                          className="inline-flex min-h-[44px] items-center justify-center gap-2 bg-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary-hover))] text-white px-3 py-2 rounded-lg text-sm touch-manipulation"
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
                              className="inline-flex min-h-[44px] items-center justify-center gap-2 border border-[rgb(var(--color-primary))] text-[rgb(var(--color-primary))] hover:bg-[rgba(var(--color-primary),0.1)] px-3 py-2 rounded-lg text-sm font-semibold touch-manipulation"
                              title="This game has the minimum required fields and can be published"
                            >
                              <FaRocket />
                              Publish
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                );
              })}
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

      {selectedSubmission ? (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={requestCloseReviewModal}
          closeOnEscape={!showDiscardConfirm}
          title={selectedSubmission.gameTitle}
          status={selectedSubmission.status}
          submittedBy={
            <SubmitterHoverLink
              userId={selectedSubmission.submittedBy}
              name={selectedSubmission.submittedByName}
              className="text-[rgb(var(--text-secondary))]"
            />
          }
          submittedAt={selectedSubmission.submittedAt}
          descriptionId="game-review-modal-description"
          notes={
            isReviewer && selectedSubmission.status === "pending" ? (
              <>
                {scanError ? (
                  <p className="text-sm text-[rgb(var(--color-danger))]">
                    {scanError}
                  </p>
                ) : null}
                <label
                  htmlFor="game-review-notes"
                  className="text-xs font-medium text-[rgb(var(--text-secondary))]"
                >
                  Review notes{" "}
                  <span className="text-[rgb(var(--text-muted))]">
                    (optional)
                  </span>
                </label>
                <textarea
                  id="game-review-notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary))] border border-[rgb(var(--border-color))]"
                  placeholder="Add notes about this decision…"
                />
              </>
            ) : selectedSubmission.reviewedByName ? (
              <div className="text-sm space-y-1">
                <p className="text-[rgb(var(--text-muted))]">
                  Reviewed by {selectedSubmission.reviewedByName}
                </p>
                {selectedSubmission.reviewNotes ? (
                  <p className="text-[rgb(var(--text-secondary))]">
                    {selectedSubmission.reviewNotes}
                  </p>
                ) : null}
              </div>
            ) : null
          }
          actions={
            isReviewer && selectedSubmission.status === "pending" ? (
              <>
                <ReviewApproveButton
                  onClick={() => submitReview("approved")}
                  disabled={isReviewing}
                >
                  {isReviewing ? "Approving…" : "Approve"}
                </ReviewApproveButton>
                <ReviewRejectButton
                  onClick={() => submitReview("rejected")}
                  disabled={isReviewing}
                >
                  {isReviewing ? "Rejecting…" : "Reject"}
                </ReviewRejectButton>
              </>
            ) : (
              <ReviewGhostButton onClick={requestCloseReviewModal}>
                Close
              </ReviewGhostButton>
            )
          }
        >
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

            return (
              <div className="space-y-4">
                {allFields.length === 0 ? null : sameAsCurrentCount ===
                  allFields.length ? (
                  <p className="text-sm text-[rgb(var(--text-secondary))] bg-[rgb(var(--bg-card-alt))] rounded-lg p-3">
                    No meaningful change. Submitted fields match the current
                    game data.
                  </p>
                ) : (
                  <p className="text-xs text-[rgb(var(--text-muted))]">
                    {changedCount} changed
                    {sameAsCurrentCount > 0
                      ? ` · ${sameAsCurrentCount} unchanged`
                      : ""}
                  </p>
                )}

                {allFields.map(([key, value]) => {
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
                  const proposedDisplay =
                    typeof value === "string"
                      ? formatCrowdsourceValue(value)
                      : Array.isArray(value)
                        ? value
                        : value;
                  const originalDisplay =
                    typeof originalValue === "string"
                      ? formatCrowdsourceValue(originalValue)
                      : Array.isArray(originalValue)
                        ? originalValue
                        : (originalValue as
                            | string
                            | number
                            | boolean
                            | string[]
                            | null
                            | undefined);

                  return (
                    <div key={key} className="review-field">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-sm font-medium text-[rgb(var(--text-primary))]">
                          {getFieldDisplayName(key)}
                        </h3>
                        <StatusPill
                          status={
                            isSameAsCurrent
                              ? "neutral"
                              : hasOriginalValue
                                ? "modified"
                                : "pending"
                          }
                          label={
                            isSameAsCurrent
                              ? "Unchanged"
                              : hasOriginalValue
                                ? "Changed"
                                : "New"
                          }
                        />
                      </div>
                      {isDownloadLink &&
                      typeof value === "string" &&
                      /^https?:\/\//i.test(value) ? (
                        <div className="space-y-3">
                          {hasOriginalValue ? (
                            <p className="text-xs text-[rgb(var(--text-muted))] break-all">
                              Current: {String(originalValue)}
                            </p>
                          ) : null}
                          <DownloadLinkReview url={value}>
                            <VirusTotalScanPanel
                              url={value}
                              csrfToken={csrfToken}
                              scanningUrl={scanningUrl}
                              setScanningUrl={setScanningUrl}
                              scanResult={scanResults.get(value) ?? null}
                              setScanResult={(result) => {
                                setScanResults((prev) => {
                                  const next = new Map(prev);
                                  if (result) next.set(result.url, result);
                                  else next.delete(value);
                                  return next;
                                });
                              }}
                              setError={setScanError}
                              gameSubmissionId={selectedSubmission.id}
                              field={key as GameDownloadLinkField}
                              onScanPersisted={(scan) => {
                                const fieldKey = key as GameDownloadLinkField;
                                setSelectedSubmission((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        virusTotalScans: {
                                          ...prev.virusTotalScans,
                                          [fieldKey]: scan,
                                        },
                                      }
                                    : prev
                                );
                                setAllSubmissions((prev) =>
                                  prev.map((item) =>
                                    item.id === selectedSubmission.id
                                      ? {
                                          ...item,
                                          virusTotalScans: {
                                            ...item.virusTotalScans,
                                            [fieldKey]: scan,
                                          },
                                        }
                                      : item
                                  )
                                );
                              }}
                            />
                          </DownloadLinkReview>
                        </div>
                      ) : (
                        <CorrectionValueDiff
                          oldValue={
                            hasOriginalValue ? originalDisplay : undefined
                          }
                          newValue={
                            proposedDisplay as
                              | string
                              | number
                              | boolean
                              | string[]
                              | null
                              | undefined
                          }
                        />
                      )}
                    </div>
                  );
                })}

                {selectedSubmission.submitterNotes ? (
                  <div className="review-field">
                    <h3 className="text-sm font-medium text-[rgb(var(--text-primary))] mb-2">
                      Submitter notes
                    </h3>
                    <p className="text-sm text-[rgb(var(--text-secondary))] whitespace-pre-wrap break-words">
                      {selectedSubmission.submitterNotes}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })()}
        </ReviewModal>
      ) : null}

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
