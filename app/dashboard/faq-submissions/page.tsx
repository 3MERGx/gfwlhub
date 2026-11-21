"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  FaSearch,
  FaClock,
  FaCheck,
  FaUser,
  FaQuestionCircle,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useCSRF } from "@/hooks/useCSRF";
import { useDebounce } from "@/hooks/useDebounce";
import { usePusherChannel } from "@/hooks/usePusherChannel";
import { PUSHER_EVENTS } from "@/lib/pusher-client";
import { useToast } from "@/components/ui/toast-context";
import { safeLog, sanitizeHtml } from "@/lib/security";
import type { FAQSubmission } from "@/types/faq-submission";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardToolbar, {
  FilterChip,
} from "@/components/dashboard/DashboardToolbar";
import StatusPill from "@/components/dashboard/StatusPill";
import ReviewModal from "@/components/dashboard/ReviewModal";
import {
  ReviewApproveButton,
  ReviewGhostButton,
  ReviewRejectButton,
} from "@/components/dashboard/ReviewActions";
import SubmitterHoverLink from "@/components/SubmitterHoverLink";
import { formatReviewDateTime } from "@/lib/format-review-date";

/** Extract unique href values from HTML string (e.g. answer content). */
function extractLinksFromHtml(html: string): string[] {
  const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = hrefRegex.exec(html)) !== null) {
    const url = match[1].trim();
    if (url && !urls.includes(url)) urls.push(url);
  }
  return urls;
}

export default function FAQSubmissionsPage() {
  const { data: session, status } = useSession();
  const { csrfToken } = useCSRF();
  const { showToast } = useToast();
  const [submissions, setSubmissions] = useState<FAQSubmission[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedSubmission, setSelectedSubmission] = useState<FAQSubmission | null>(null);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "submitter">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const itemsPerPage = 10;
  const [adminNotes, setAdminNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  // Check if user is reviewer or admin
  const canReview = session?.user?.role === "reviewer" || session?.user?.role === "admin";

  const fetchSubmissions = useCallback(
    async (background = false) => {
      if (!background) setIsLoadingSubmissions(true);
      try {
        const url = `/api/faq-submissions?status=${statusFilter || "all"}&_t=${Date.now()}`;
        const response = await fetch(url, { cache: "no-store" });

        if (response.ok) {
          const data = await response.json();
          setSubmissions(data);
        } else if (!background) {
          showToast("Failed to fetch FAQ submissions", 3000, "error");
        }
      } catch (error) {
        safeLog.error("Error fetching FAQ submissions:", error);
        if (!background) showToast("Failed to fetch FAQ submissions", 3000, "error");
      } finally {
        if (!background) setIsLoadingSubmissions(false);
      }
    },
    [statusFilter, showToast]
  );

  useEffect(() => {
    if (canReview) {
      fetchSubmissions();
    }
  }, [canReview, fetchSubmissions]);

  usePusherChannel(PUSHER_EVENTS.FAQ_SUBMISSIONS_UPDATED, () => {
    fetchSubmissions(true);
  });

  useEffect(() => {
    const onFocus = () => fetchSubmissions(true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchSubmissions]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, debouncedSearchQuery]);

  const filteredSubmissions = useMemo(() => {
    let filtered = [...submissions];
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (sub) =>
          sub.question.toLowerCase().includes(query) ||
          sub.answer.toLowerCase().includes(query) ||
          sub.submittedByName.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [submissions, debouncedSearchQuery]);

  const sortedSubmissions = useMemo(() => {
    const sorted = [...filteredSubmissions];
    sorted.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "date") {
        comparison =
          new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      } else {
        comparison = (a.submittedByName || "").localeCompare(b.submittedByName || "");
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [filteredSubmissions, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedSubmissions.length / itemsPerPage);
  const paginatedSubmissions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedSubmissions.slice(start, start + itemsPerPage);
  }, [sortedSubmissions, currentPage, itemsPerPage]);

  // Clamp current page when list shrinks (e.g. after optimistic remove)
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const closeReviewModal = useCallback(() => {
    setSelectedSubmission(null);
    setAdminNotes("");
    setShowRejectConfirm(false);
  }, []);

  const handleApprove = async (submissionId: string) => {
    const sub = selectedSubmission;
    if (!sub || sub.id !== submissionId) return;

    setIsProcessing(true);
    closeReviewModal();
    setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
    showToast("FAQ approved and added to the FAQ page", 3000, "success");

    try {
      const response = await fetch(`/api/faq-submissions/${submissionId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        body: JSON.stringify({
          adminNotes: adminNotes.trim() || undefined,
        }),
      });

      if (response.ok) {
        fetchSubmissions(true);
        window.dispatchEvent(new CustomEvent("faqSubmissionsUpdated"));
      } else {
        const error = await response.json();
        setSubmissions((prev) => [...prev, sub]);
        showToast(error.error || "Failed to approve FAQ", 3000, "error");
      }
    } catch (error) {
      safeLog.error("Error approving FAQ submission:", error);
      setSubmissions((prev) => [...prev, sub]);
      showToast("Failed to approve FAQ", 3000, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectClick = () => {
    if (!adminNotes.trim()) {
      showToast("Please provide a reason for rejection", 3000, "error");
      return;
    }
    setShowRejectConfirm(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedSubmission) return;
    setShowRejectConfirm(false);
    await handleReject(selectedSubmission.id);
  };

  const handleReject = async (submissionId: string) => {
    if (!adminNotes.trim()) {
      showToast("Please provide a reason for rejection", 3000, "error");
      return;
    }

    const sub = selectedSubmission;
    if (!sub || sub.id !== submissionId) return;

    setIsProcessing(true);
    closeReviewModal();
    setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
    showToast("FAQ submission rejected", 3000, "success");

    try {
      const response = await fetch(`/api/faq-submissions/${submissionId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        body: JSON.stringify({
          adminNotes: adminNotes.trim(),
        }),
      });

      if (response.ok) {
        fetchSubmissions(true);
        window.dispatchEvent(new CustomEvent("faqSubmissionsUpdated"));
      } else {
        const error = await response.json();
        setSubmissions((prev) => [...prev, sub]);
        showToast(error.error || "Failed to reject FAQ", 3000, "error");
      }
    } catch (error) {
      safeLog.error("Error rejecting FAQ submission:", error);
      setSubmissions((prev) => [...prev, sub]);
      showToast("Failed to reject FAQ", 3000, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const openReviewModal = useCallback((submission: FAQSubmission) => {
    setSelectedSubmission(submission);
    setAdminNotes(submission.adminNotes || "");
  }, []);

  const formatDate = (date: Date | string) => formatReviewDateTime(date);

  if (status === "loading" || !session) {
    return (
      <DashboardLayout>
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          <div className="space-y-4" role="status" aria-live="polite" aria-busy="true">
            <span className="sr-only">Loading submissions</span>
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!canReview) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-[rgb(var(--text-secondary))]">
            You do not have permission to access this page.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="space-y-6">
          <DashboardPageHeader
            title="FAQ submissions"
            subtitle="Review and manage user-submitted FAQs"
            icon={<FaQuestionCircle className="text-[#107c10]" size={24} />}
          />

        <DashboardToolbar
          filtersOpen={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          filtersActive={
            statusFilter !== "pending" ||
            sortBy !== "date" ||
            sortOrder !== "desc"
          }
          search={
            <div className="relative">
              <FaSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]"
                size={14}
                aria-hidden
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by question, answer, or submitter..."
                className="w-full pl-10 pr-4 py-2.5 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[rgb(var(--color-primary))] focus:outline-none text-sm min-h-[44px] sm:min-h-0 touch-manipulation"
                aria-label="Search FAQ submissions"
              />
            </div>
          }
          filters={
            <>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-auto min-w-[140px]" aria-label="Filter by status">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => {
                  setSortBy("date");
                  setSortOrder(
                    sortBy === "date" && sortOrder === "desc" ? "asc" : "desc"
                  );
                }}
                className="px-3 py-1.5 rounded-lg border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] text-sm font-medium flex items-center justify-center gap-1.5"
                title="Sort by date"
                aria-pressed={sortBy === "date"}
              >
                <FaSort size={12} aria-hidden />
                Date
                {sortBy === "date" &&
                  (sortOrder === "asc" ? (
                    <FaSortUp size={10} />
                  ) : (
                    <FaSortDown size={10} />
                  ))}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSortBy("submitter");
                  setSortOrder(
                    sortBy === "submitter" && sortOrder === "asc"
                      ? "desc"
                      : "asc"
                  );
                }}
                className="px-3 py-1.5 rounded-lg border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] text-sm font-medium flex items-center justify-center gap-1.5"
                title="Sort by submitter"
                aria-pressed={sortBy === "submitter"}
              >
                <FaSort size={12} aria-hidden />
                Submitter
                {sortBy === "submitter" &&
                  (sortOrder === "asc" ? (
                    <FaSortUp size={10} />
                  ) : (
                    <FaSortDown size={10} />
                  ))}
              </button>
            </>
          }
          chips={
            searchQuery || statusFilter !== "pending" ? (
              <>
                {searchQuery && (
                  <FilterChip
                    label={`Search: ${searchQuery}`}
                    onClear={() => setSearchQuery("")}
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
        {!isLoadingSubmissions && (
          <p className="text-sm text-[rgb(var(--text-muted))] -mt-2" aria-live="polite">
            {sortedSubmissions.length === 0
              ? "No submissions"
              : totalPages > 1
              ? `Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, sortedSubmissions.length)} of ${sortedSubmissions.length} submission${sortedSubmissions.length !== 1 ? "s" : ""}`
              : `Showing ${sortedSubmissions.length} submission${sortedSubmissions.length !== 1 ? "s" : ""}`}
          </p>
        )}

        {/* Submissions List */}
        {isLoadingSubmissions ? (
          <div className="space-y-4" role="status" aria-live="polite" aria-busy="true">
            <span className="sr-only">Loading submissions</span>
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : sortedSubmissions.length === 0 ? (
          <DashboardEmptyState
            icon={<FaQuestionCircle className="mx-auto" size={48} />}
            title={
              debouncedSearchQuery
                ? "No submissions found matching your search."
                : statusFilter === "all"
                  ? "No FAQ submissions found."
                  : `No ${statusFilter} submissions.`
            }
            description={
              debouncedSearchQuery
                ? "Try different keywords or clear the search."
                : statusFilter !== "all"
                  ? 'Try "All Statuses" to see other submissions.'
                  : undefined
            }
            onClearFilters={
              debouncedSearchQuery || statusFilter !== "pending"
                ? () => {
                    setSearchQuery("");
                    setStatusFilter("pending");
                  }
                : undefined
            }
          />
        ) : (
          <>
          <div className="dashboard-inbox">
            {paginatedSubmissions.map((submission) => (
              <div key={submission.id} className="dashboard-inbox-row">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <StatusPill status={submission.status} />
                      <span className="text-xs text-[rgb(var(--text-muted))] inline-flex items-center gap-1">
                        <FaClock size={10} aria-hidden />
                        {formatDate(submission.submittedAt)}
                      </span>
                    </div>
                    <h3 className="font-medium text-[rgb(var(--text-primary))] line-clamp-1">
                      {submission.question}
                    </h3>
                    <p className="text-sm text-[rgb(var(--text-secondary))] line-clamp-1 mt-0.5">
                      {submission.answer.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}
                    </p>
                    <p className="mt-1 text-xs text-[rgb(var(--text-muted))] inline-flex items-center gap-1">
                      <FaUser size={10} aria-hidden />
                      {submission.submittedByName}
                      {submission.reviewedByName
                        ? ` · Reviewed by ${submission.reviewedByName}`
                        : ""}
                    </p>
                  </div>
                  {submission.status === "pending" && (
                    <button
                      onClick={() => openReviewModal(submission)}
                      className="shrink-0 px-3 py-2 bg-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary-hover))] text-white rounded-lg text-sm font-medium inline-flex items-center gap-2 min-h-[44px] sm:min-h-0 touch-manipulation"
                    >
                      <FaCheck size={14} />
                      Review
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium min-h-[44px] sm:min-h-0 touch-manipulation"
                aria-label="Previous page"
              >
                <FaChevronLeft size={14} aria-hidden />
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-[rgb(var(--text-secondary))]" aria-live="polite">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium min-h-[44px] sm:min-h-0 touch-manipulation"
                aria-label="Next page"
              >
                Next
                <FaChevronRight size={14} aria-hidden />
              </button>
            </div>
          )}
          </>
        )}
        </div>
      </div>

      {selectedSubmission ? (
        <ReviewModal
          isOpen
          onClose={closeReviewModal}
          closeOnEscape={!showRejectConfirm}
          title="FAQ submission"
          titleId="faq-review-modal-title"
          descriptionId="faq-review-modal-description"
          status={selectedSubmission.status}
          submittedBy={
            <SubmitterHoverLink
              userId={selectedSubmission.submittedBy}
              name={selectedSubmission.submittedByName}
              className="text-[rgb(var(--text-secondary))]"
            />
          }
          submittedAt={selectedSubmission.submittedAt}
          maxWidthClass="max-w-3xl"
          notes={
            selectedSubmission.status === "pending" ? (
              <>
                <label
                  htmlFor="faq-review-admin-notes"
                  className="text-xs font-medium text-[rgb(var(--text-secondary))]"
                >
                  Review notes{" "}
                  <span className="text-[rgb(var(--text-muted))]">
                    (required to reject)
                  </span>
                </label>
                <textarea
                  id="faq-review-admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2.5 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[rgb(var(--color-primary))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--color-primary))]/20 text-sm"
                  placeholder="Optional for approval"
                  disabled={isProcessing}
                />
              </>
            ) : null
          }
          actions={
            selectedSubmission.status === "pending" ? (
              <>
                <ReviewApproveButton
                  onClick={() => handleApprove(selectedSubmission.id)}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing…" : "Approve and add to FAQ"}
                </ReviewApproveButton>
                <ReviewRejectButton
                  onClick={handleRejectClick}
                  disabled={isProcessing}
                >
                  {isProcessing ? "Processing…" : "Reject"}
                </ReviewRejectButton>
              </>
            ) : (
              <ReviewGhostButton onClick={closeReviewModal}>
                Close
              </ReviewGhostButton>
            )
          }
        >
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-[rgb(var(--text-primary))] mb-2">
                Question
              </h3>
              <p className="text-[rgb(var(--text-primary))] text-sm sm:text-base">
                {selectedSubmission.question}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-[rgb(var(--text-primary))] mb-2">
                Answer
              </h3>
              <div
                className="text-sm text-[rgb(var(--text-secondary))] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_p]:mb-2 [&_p:last-child]:mb-0"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(selectedSubmission.answer),
                }}
              />
              {(() => {
                const links = extractLinksFromHtml(selectedSubmission.answer);
                if (links.length === 0) return null;
                return (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-[rgb(var(--text-muted))] mb-2">
                      Links in this answer
                    </p>
                    <ul className="space-y-1 text-sm break-all">
                      {links.map((url) => (
                        <li key={url}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[rgb(var(--color-primary))] hover:underline"
                          >
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </div>
          </div>
        </ReviewModal>
      ) : null}

      <ConfirmDialog
        isOpen={showRejectConfirm}
        title="Reject FAQ submission"
        message="Are you sure you want to reject this submission? Your admin note will be stored with the decision."
        confirmText="Reject"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleRejectConfirm}
        onCancel={() => setShowRejectConfirm(false)}
      />
    </DashboardLayout>
  );
}
