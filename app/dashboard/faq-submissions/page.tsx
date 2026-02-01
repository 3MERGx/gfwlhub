"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  FaSearch,
  FaClock,
  FaCheck,
  FaTimes,
  FaUser,
  FaSpinner,
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
import { useToast } from "@/components/ui/toast-context";
import { safeLog, sanitizeHtml } from "@/lib/security";
import type { FAQSubmission } from "@/types/faq-submission";

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
  const { data: session } = useSession();
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
  const itemsPerPage = 10;
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
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
        const url = `/api/faq-submissions?status=${statusFilter || "all"}`;
        const response = await fetch(url);

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

  // Body scroll lock when modal is open
  useEffect(() => {
    if (selectedSubmission) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [selectedSubmission]);

  // Focus first focusable when modal opens; restore focus on close
  useEffect(() => {
    if (selectedSubmission && modalRef.current) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      first?.focus();
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [selectedSubmission]);

  const closeReviewModal = useCallback(() => {
    setSelectedSubmission(null);
    setAdminNotes("");
    setShowRejectConfirm(false);
  }, []);

  // Escape key closes modal
  useEffect(() => {
    if (!selectedSubmission) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeReviewModal();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedSubmission, closeReviewModal]);

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
    previousFocusRef.current = document.activeElement as HTMLElement;
    setSelectedSubmission(submission);
    setAdminNotes(submission.adminNotes || "");
  }, []);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
          {/* Header */}
          <header className="pb-4 sm:pb-6 border-b border-[rgb(var(--border-color))]">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0 p-2.5 rounded-lg bg-[#107c10]/15 border border-[#107c10]/30" aria-hidden>
                <FaQuestionCircle className="text-[#107c10]" size={24} />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[rgb(var(--text-primary))] tracking-tight">
                  FAQ Submissions
                </h1>
                <p className="mt-1.5 text-sm sm:text-base text-[rgb(var(--text-secondary))]">
                  Review and manage user-submitted FAQs
                </p>
              </div>
            </div>
          </header>

        {/* Filters */}
        <div className="bg-[rgb(var(--bg-card))] rounded-lg border border-[rgb(var(--border-color))] p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <FaSearch
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[rgb(var(--text-muted))]"
                size={14}
                aria-hidden
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by question, answer, or submitter..."
                className="w-full pl-10 pr-4 py-2.5 sm:py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none focus:ring-2 focus:ring-[#107c10]/20 text-sm min-h-[44px] sm:min-h-0 touch-manipulation"
                aria-label="Search FAQ submissions"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full" aria-label="Filter by status">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sort */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-[rgb(var(--text-muted))]">Sort by:</span>
            <button
              type="button"
              onClick={() => {
                setSortBy("date");
                setSortOrder(sortBy === "date" && sortOrder === "desc" ? "asc" : "desc");
              }}
              className="px-3 py-1.5 rounded-lg border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] text-sm font-medium flex items-center gap-1.5 transition-colors"
              title="Sort by date"
              aria-pressed={sortBy === "date"}
            >
              <FaSort size={12} aria-hidden />
              Date
              {sortBy === "date" && (sortOrder === "asc" ? <FaSortUp size={10} /> : <FaSortDown size={10} />)}
            </button>
            <button
              type="button"
              onClick={() => {
                setSortBy("submitter");
                setSortOrder(sortBy === "submitter" && sortOrder === "asc" ? "desc" : "asc");
              }}
              className="px-3 py-1.5 rounded-lg border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] text-sm font-medium flex items-center gap-1.5 transition-colors"
              title="Sort by submitter"
              aria-pressed={sortBy === "submitter"}
            >
              <FaSort size={12} aria-hidden />
              Submitter
              {sortBy === "submitter" && (sortOrder === "asc" ? <FaSortUp size={10} /> : <FaSortDown size={10} />)}
            </button>
          </div>

          {!isLoadingSubmissions && (
            <p className="mt-3 text-sm text-[rgb(var(--text-muted))]" aria-live="polite">
              {sortedSubmissions.length === 0
                ? "No submissions"
                : totalPages > 1
                ? `Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, sortedSubmissions.length)} of ${sortedSubmissions.length} submission${sortedSubmissions.length !== 1 ? "s" : ""}`
                : `Showing ${sortedSubmissions.length} submission${sortedSubmissions.length !== 1 ? "s" : ""}`}
            </p>
          )}
        </div>

        {/* Submissions List */}
        {isLoadingSubmissions ? (
          <div className="space-y-4" role="status" aria-live="polite" aria-busy="true">
            <span className="sr-only">Loading submissions</span>
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : sortedSubmissions.length === 0 ? (
          <div className="bg-[rgb(var(--bg-card))] rounded-lg border border-[rgb(var(--border-color))] p-8 text-center">
            <FaQuestionCircle className="mx-auto text-[rgb(var(--text-muted))] mb-3" size={48} aria-hidden />
            <p className="text-[rgb(var(--text-secondary))]">
              {debouncedSearchQuery
                ? "No submissions found matching your search."
                : statusFilter === "all"
                ? "No FAQ submissions found."
                : `No ${statusFilter} submissions.`}
            </p>
            {debouncedSearchQuery ? (
              <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">
                Try different keywords or clear the search.
              </p>
            ) : statusFilter !== "all" ? (
              <p className="mt-2 text-sm text-[rgb(var(--text-muted))]">
                Try &quot;All Statuses&quot; to see other submissions.
              </p>
            ) : null}
          </div>
        ) : (
          <>
          <div className="space-y-4">
            {paginatedSubmissions.map((submission) => (
              <div
                key={submission.id}
                className="bg-[rgb(var(--bg-card))] rounded-lg border border-[rgb(var(--border-color))] p-5 hover:border-[#107c10]/30 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          submission.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : submission.status === "approved"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                      </span>
                      <span className="text-xs text-[rgb(var(--text-muted))] flex items-center gap-1">
                        <FaClock size={10} aria-hidden />
                        {formatDate(submission.submittedAt)}
                      </span>
                    </div>

                    {/* Question */}
                    <h3 className="font-semibold text-[rgb(var(--text-primary))] mb-2">
                      {submission.question}
                    </h3>

                    {/* Answer Preview (strip HTML for clamp) */}
                    <p className="text-sm text-[rgb(var(--text-secondary))] line-clamp-2 mb-3">
                      {submission.answer.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}
                    </p>

                    {/* Submitter Info */}
                    <div className="flex items-center gap-1 text-xs text-[rgb(var(--text-muted))]">
                      <FaUser size={10} aria-hidden />
                      <span>Submitted by {submission.submittedByName}</span>
                    </div>

                    {/* Review Info */}
                    {submission.reviewedByName && (
                      <div className="mt-2 text-xs text-[rgb(var(--text-muted))]">
                        Reviewed by {submission.reviewedByName} on{" "}
                        {submission.reviewedAt && formatDate(submission.reviewedAt)}
                        {submission.adminNotes && (
                          <p className="mt-1 text-[rgb(var(--text-secondary))]">
                            Note: {submission.adminNotes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {submission.status === "pending" && (
                    <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
                      <button
                        onClick={() => openReviewModal(submission)}
                        className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 bg-[#107c10] hover:bg-[#0d6b0d] text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2 min-h-[44px] sm:min-h-0 touch-manipulation"
                      >
                        <FaCheck size={14} />
                        Review
                      </button>
                    </div>
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

      {/* Review Modal */}
      {selectedSubmission && (
        <div
          className="fixed inset-0 bg-black/40 dark:bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={closeReviewModal}
          role="presentation"
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="faq-review-modal-title"
            aria-describedby="faq-review-modal-description"
            tabIndex={-1}
            className="bg-[rgb(var(--bg-card))] rounded-lg max-w-3xl w-full border border-[rgb(var(--border-color))] shadow-xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key !== "Tab" || !modalRef.current) return;
              const el = modalRef.current;
              const focusable = el.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
              );
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (e.shiftKey) {
                if (document.activeElement === first) {
                  e.preventDefault();
                  last?.focus();
                }
              } else {
                if (document.activeElement === last) {
                  e.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[rgb(var(--border-color))] shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 bg-[#107c10]/20 rounded shrink-0">
                  <FaQuestionCircle className="text-[#107c10]" size={16} aria-hidden />
                </div>
                <h2 id="faq-review-modal-title" className="text-lg sm:text-xl font-bold text-[rgb(var(--text-primary))] truncate">
                  Review FAQ Submission
                </h2>
              </div>
              <button
                type="button"
                onClick={closeReviewModal}
                className="text-gray-400 hover:text-white transition-colors shrink-0 p-2 -mr-2 touch-manipulation"
                aria-label="Close modal"
              >
                <FaTimes size={20} aria-hidden />
              </button>
            </div>

            <div id="faq-review-modal-description" className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Submitter Info */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-sm">
                <span className="text-[rgb(var(--text-muted))]">Submitted by:</span>
                <span className="text-[rgb(var(--text-primary))] font-medium">
                  {selectedSubmission.submittedByName}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-sm">
                <span className="text-[rgb(var(--text-muted))]">Submitted at:</span>
                <span className="text-[rgb(var(--text-primary))]">
                  {formatDate(selectedSubmission.submittedAt)}
                </span>
              </div>

              {/* Question */}
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                  Question
                </label>
                <div className="p-4 bg-[rgb(var(--bg-card-alt))] rounded-lg border border-[rgb(var(--border-color))]">
                  <p className="text-[rgb(var(--text-primary))]">{selectedSubmission.question}</p>
                </div>
              </div>

              {/* Answer */}
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                  Answer
                </label>
                <div
                  className="p-4 bg-[rgb(var(--bg-card-alt))] rounded-lg border border-[rgb(var(--border-color))] text-[rgb(var(--text-primary))] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_p]:mb-2 [&_p:last-child]:mb-0"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(selectedSubmission.answer),
                  }}
                />
                {(() => {
                  const links = extractLinksFromHtml(selectedSubmission.answer);
                  if (links.length === 0) return null;
                  return (
                    <div className="mt-3 p-3 bg-[rgb(var(--bg-card))] rounded-lg border border-[rgb(var(--border-color))]">
                      <p className="text-xs font-medium text-[rgb(var(--text-secondary))] mb-2">
                        Links in this answer ({links.length})
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-[rgb(var(--text-primary))] break-all">
                        {links.map((url, i) => (
                          <li key={i}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
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

              {/* Admin Notes */}
              <div>
                <label
                  htmlFor="faq-review-admin-notes"
                  className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2"
                >
                  Admin Notes {selectedSubmission.status === "pending" && "(optional for approval, required for rejection)"}
                </label>
                <textarea
                  id="faq-review-admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none focus:ring-2 focus:ring-[#107c10]/20"
                  placeholder="Add notes about your decision (optional for approval, required for rejection)..."
                  disabled={isProcessing}
                />
              </div>
            </div>

            <div className="flex gap-3 p-4 sm:p-6 border-t border-[rgb(var(--border-color))] shrink-0 flex-col sm:flex-row">
              <button
                onClick={() => handleApprove(selectedSubmission.id)}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 sm:py-2.5 bg-[#107c10] hover:bg-[#0d6b0d] text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 font-medium min-h-[44px] sm:min-h-0 touch-manipulation order-1"
              >
                {isProcessing ? (
                  <>
                    <FaSpinner className="animate-spin" size={14} />
                    Processing...
                  </>
                ) : (
                  <>
                    <FaCheck size={14} />
                    Approve & Add to FAQ
                  </>
                )}
              </button>
              <button
                onClick={handleRejectClick}
                disabled={isProcessing}
                className="flex-1 px-4 py-3 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 font-medium min-h-[44px] sm:min-h-0 touch-manipulation order-2"
              >
                {isProcessing ? (
                  <>
                    <FaSpinner className="animate-spin" size={14} />
                    Processing...
                  </>
                ) : (
                  <>
                    <FaTimes size={14} />
                    Reject
                  </>
                )}
              </button>
              <button
                onClick={closeReviewModal}
                disabled={isProcessing}
                className="w-full sm:w-auto px-4 py-3 sm:py-2.5 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] rounded-lg transition-colors font-medium border border-[rgb(var(--border-color))] disabled:opacity-50 min-h-[44px] sm:min-h-0 touch-manipulation order-3"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
