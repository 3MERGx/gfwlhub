"use client";

import { useState, useEffect } from "react";
import {
  FaSearch,
  FaFilter,
  FaClock,
  FaGamepad,
  FaEdit,
  FaCheck,
  FaTimes,
  FaSortAmountDown,
  FaSortAmountUp,
  FaUser,
} from "react-icons/fa";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

interface Correction {
  id: string;
  gameId: string;
  gameSlug: string;
  gameTitle: string;
  submittedBy: string;
  submittedByName: string;
  submittedAt: Date;
  field: string;
  oldValue: string | number | boolean | string[] | null;
  newValue: string | number | boolean | string[] | null;
  reason: string;
  status: "pending" | "approved" | "rejected" | "modified";
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  finalValue?: string | number | boolean | string[] | null;
}

export default function SubmissionsPage() {
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [filteredCorrections, setFilteredCorrections] = useState<Correction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [fieldFilter, setFieldFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCorrection, setSelectedCorrection] = useState<Correction | null>(null);

  // Fetch real corrections from API
  useEffect(() => {
    const fetchCorrections = async () => {
      try {
        const response = await fetch("/api/corrections");
        if (response.ok) {
          const data = await response.json();
          setCorrections(data.corrections || []);
          setFilteredCorrections(data.corrections || []);
        }
      } catch (error) {
        console.error("Error fetching corrections:", error);
      }
    };

    fetchCorrections();
  }, []);

  // Filter and sort corrections
  useEffect(() => {
    let filtered = [...corrections];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.gameTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.submittedByName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.field.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    // Field filter
    if (fieldFilter !== "all") {
      filtered = filtered.filter((c) => c.field === fieldFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "date":
          comparison =
            new Date(b.submittedAt).getTime() -
            new Date(a.submittedAt).getTime();
          break;
        case "game":
          comparison = a.gameTitle.localeCompare(b.gameTitle);
          break;
        case "submitter":
          comparison = a.submittedByName.localeCompare(b.submittedByName);
          break;
      }
      return sortOrder === "asc" ? -comparison : comparison;
    });

    setFilteredCorrections(filtered);
  }, [corrections, searchQuery, statusFilter, fieldFilter, sortBy, sortOrder]);

  const getFieldDisplayName = (field: string) => {
    return field
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-900/30 text-yellow-400 border-yellow-500/30";
      case "approved":
        return "bg-green-900/30 text-green-400 border-green-500/30";
      case "rejected":
        return "bg-red-900/30 text-red-400 border-red-500/30";
      case "modified":
        return "bg-blue-900/30 text-blue-400 border-blue-500/30";
      default:
        return "bg-gray-700/30 text-gray-400 border-gray-600/30";
    }
  };

  return (
    <DashboardLayout requireRole="reviewer">
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-[#107c10] hover:underline text-sm mb-2 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Review Submissions
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Review and approve game information corrections
          </p>
        </div>

        {/* Search and Controls */}
        <div className="bg-[#2d2d2d] rounded-lg p-4 mb-6">
          {/* Search Bar */}
          <div className="relative mb-4">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by game, user, or field..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none"
            />
          </div>

          {/* Filter Toggle (Mobile) */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden w-full flex items-center justify-center gap-2 bg-[#1a1a1a] text-white py-2 rounded-lg border border-gray-700 mb-4"
          >
            <FaFilter size={14} />
            <span>Filters & Sort</span>
          </button>

          {/* Filters and Sort */}
          <div
            className={`${
              showFilters ? "block" : "hidden"
            } md:block space-y-3 md:space-y-0 md:flex md:gap-3 md:flex-wrap md:items-center`}
          >
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-auto px-4 py-2 pr-10 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none"
              style={{ paddingRight: '2.75rem' }}
            >
              <option value="pending">Pending</option>
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="modified">Modified</option>
            </select>

            {/* Field Filter */}
            <select
              value={fieldFilter}
              onChange={(e) => setFieldFilter(e.target.value)}
              className="w-full md:w-auto px-4 py-2 pr-10 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none"
              style={{ paddingRight: '2.75rem' }}
            >
              <option value="all">All Fields</option>
              <option value="title">Title</option>
              <option value="description">Description</option>
              <option value="developer">Developer</option>
              <option value="publisher">Publisher</option>
              <option value="releaseDate">Release Date</option>
              <option value="genres">Genres</option>
              <option value="platforms">Platforms</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full md:w-auto px-4 py-2 pr-10 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none"
              style={{ paddingRight: '2.75rem' }}
            >
              <option value="date">Submission Date</option>
              <option value="game">Game Name</option>
              <option value="submitter">Submitter</option>
            </select>

            {/* Sort Order */}
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="w-full md:w-auto px-4 py-2 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 hover:border-[#107c10] transition-colors flex items-center justify-center gap-2"
            >
              {sortOrder === "desc" ? (
                <FaSortAmountDown size={14} />
              ) : (
                <FaSortAmountUp size={14} />
              )}
              <span className="text-sm">
                {sortOrder === "desc" ? "Desc" : "Asc"}
              </span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#2d2d2d] rounded-lg p-3 border border-gray-700">
            <p className="text-xs text-gray-500 mb-1">Total</p>
            <p className="text-xl font-bold text-white">{corrections.length}</p>
          </div>
          <div className="bg-[#2d2d2d] rounded-lg p-3 border border-yellow-700">
            <p className="text-xs text-gray-500 mb-1">Pending</p>
            <p className="text-xl font-bold text-yellow-400">
              {corrections.filter((c) => c.status === "pending").length}
            </p>
          </div>
          <div className="bg-[#2d2d2d] rounded-lg p-3 border border-green-700">
            <p className="text-xs text-gray-500 mb-1">Approved</p>
            <p className="text-xl font-bold text-green-400">
              {corrections.filter((c) => c.status === "approved").length}
            </p>
          </div>
          <div className="bg-[#2d2d2d] rounded-lg p-3 border border-red-700">
            <p className="text-xs text-gray-500 mb-1">Rejected</p>
            <p className="text-xl font-bold text-red-400">
              {corrections.filter((c) => c.status === "rejected").length}
            </p>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-gray-400 text-sm mb-4">
          Showing {filteredCorrections.length} of {corrections.length} submissions
        </div>

        {/* Submissions List */}
        <div className="space-y-3">
          {filteredCorrections.length === 0 ? (
            <div className="bg-[#2d2d2d] rounded-lg p-8 text-center">
              <FaClock className="mx-auto text-gray-600 mb-4" size={48} />
              <p className="text-gray-400">No submissions found</p>
            </div>
          ) : (
            filteredCorrections.map((correction) => (
              <CorrectionCard
                key={correction.id}
                correction={correction}
                getFieldDisplayName={getFieldDisplayName}
                getStatusBadgeColor={getStatusBadgeColor}
                onViewDetails={() => setSelectedCorrection(correction)}
              />
            ))
          )}
        </div>

        {/* Review Modal */}
        {selectedCorrection && (
          <ReviewModal
            correction={selectedCorrection}
            onClose={() => setSelectedCorrection(null)}
            getFieldDisplayName={getFieldDisplayName}
            onReview={(action) => {
              console.log("Review action:", action, selectedCorrection.id);
              setSelectedCorrection(null);
              // Refresh the list after closing modal
              fetch("/api/corrections")
                .then((res) => res.json())
                .then((data) => {
                  console.log("Fetched corrections after review:", data.corrections);
                  setCorrections(data.corrections || []);
                })
                .catch((error) =>
                  console.error("Error refreshing corrections:", error)
                );
            }}
          />
        )}
      </div>
    </div>
    </DashboardLayout>
  );
}

// Correction Card Component
interface CorrectionCardProps {
  correction: Correction;
  getFieldDisplayName: (field: string) => string;
  getStatusBadgeColor: (status: string) => string;
  onViewDetails: () => void;
}

function CorrectionCard({
  correction,
  getFieldDisplayName,
  getStatusBadgeColor,
  onViewDetails,
}: CorrectionCardProps) {
  const formatValue = (value: string | number | boolean | string[] | null, isNewValue = false) => {
    if (value === null || value === undefined || value === "") {
      return isNewValue ? "(clearing field)" : "N/A";
    }
    if (Array.isArray(value)) {
      return value.length === 0 
        ? (isNewValue ? "(clearing field)" : "N/A")
        : value.join(", ");
    }
    return String(value);
  };

  return (
    <div className="bg-[#2d2d2d] rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FaGamepad className="text-[#107c10] flex-shrink-0" size={16} />
          <h3 className="text-white font-medium truncate">
            {correction.gameTitle}
          </h3>
        </div>
        {correction.status === "pending" && (
          <button
            onClick={onViewDetails}
            className="px-3 py-1 bg-[#107c10] hover:bg-[#0d6b0d] text-white text-sm rounded-lg transition-colors whitespace-nowrap ml-2"
          >
            Review
          </button>
        )}
        {correction.status !== "pending" && (
          <button
            onClick={onViewDetails}
            className="text-[#107c10] hover:text-[#0d6b0d] text-sm whitespace-nowrap ml-2"
          >
            View
          </button>
        )}
      </div>

      {/* Badges Row */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span
          className={`px-2 py-1 rounded text-xs border ${getStatusBadgeColor(
            correction.status
          )}`}
        >
          {correction.status}
        </span>
        <span className="px-2 py-1 rounded text-xs border bg-blue-900/30 text-blue-400 border-blue-500/30 inline-flex items-center gap-1">
          <FaEdit size={10} />
          {getFieldDisplayName(correction.field)}
        </span>
      </div>

      {/* Changes */}
      <div className="space-y-2 mb-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Current:</p>
          <p className="text-gray-400 text-sm line-clamp-2">
            {formatValue(correction.oldValue)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Proposed:</p>
          <p className="text-[#107c10] text-sm line-clamp-2">
            {formatValue(correction.newValue, true)}
          </p>
        </div>
      </div>

      {/* Reason */}
      {correction.reason && (
        <div className="mb-3 p-2 bg-[#1a1a1a] rounded">
          <p className="text-xs text-gray-500 mb-1">Reason:</p>
          <p className="text-gray-400 text-sm line-clamp-2">
            {correction.reason}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <FaUser size={10} />
          <span>{correction.submittedByName}</span>
        </div>
        <span>•</span>
        <span>{new Date(correction.submittedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

// Review Modal Component
interface ReviewModalProps {
  correction: Correction;
  onClose: () => void;
  getFieldDisplayName: (field: string) => string;
  onReview: (action: "approve" | "reject" | "modify") => void;
}

function ReviewModal({
  correction,
  onClose,
  getFieldDisplayName,
  onReview,
}: ReviewModalProps) {
  const [reviewNotes, setReviewNotes] = useState("");
  const [modifiedValue, setModifiedValue] = useState(
    typeof correction.newValue === 'string' && !correction.newValue.startsWith('[')
      ? correction.newValue 
      : JSON.stringify(correction.newValue, null, 2)
  );
  const [showModify, setShowModify] = useState(false);

  const formatValue = (value: string | number | boolean | string[] | null, isNewValue = false) => {
    if (value === null || value === undefined || value === "") {
      return isNewValue ? "(clearing field)" : "N/A";
    }
    if (Array.isArray(value)) {
      return value.length === 0
        ? (isNewValue ? "(clearing field)" : "N/A")
        : JSON.stringify(value, null, 2);
    }
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleApprove = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/corrections/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          correctionId: correction.id,
          status: "approved",
          reviewNotes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to approve correction");
      }

      onReview("approve");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/corrections/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          correctionId: correction.id,
          status: "rejected",
          reviewNotes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reject correction");
      }

      onReview("reject");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModify = async () => {
    if (!modifiedValue.trim()) {
      setError("Modified value cannot be empty");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      let parsedValue;
      // Try to parse as JSON if it looks like JSON (starts with [ or {)
      if (modifiedValue.trim().startsWith('[') || modifiedValue.trim().startsWith('{')) {
        try {
          parsedValue = JSON.parse(modifiedValue);
        } catch {
          setError("Invalid JSON format. Please check your input.");
          setIsSubmitting(false);
          return;
        }
      } else {
        // For simple strings, use as-is
        parsedValue = modifiedValue.trim();
      }

      const response = await fetch("/api/corrections/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          correctionId: correction.id,
          status: "modified",
          reviewNotes,
          finalValue: parsedValue,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to modify correction");
      }

      onReview("modify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to modify");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#2d2d2d] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#2d2d2d] border-b border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">
                Review Submission
              </h2>
              <p className="text-gray-400 text-sm">{correction.gameTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Field */}
          <div>
            <h3 className="text-sm text-gray-500 mb-2">Field</h3>
            <div className="bg-[#1a1a1a] rounded-lg p-3">
              <p className="text-white">{getFieldDisplayName(correction.field)}</p>
            </div>
          </div>

          {/* Submitted By */}
          <div>
            <h3 className="text-sm text-gray-500 mb-2">Submitted By</h3>
            <div className="bg-[#1a1a1a] rounded-lg p-3 flex items-center justify-between">
              <span className="text-white">{correction.submittedByName}</span>
              <span className="text-gray-500 text-sm">
                {new Date(correction.submittedAt).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Current Value */}
          <div>
            <h3 className="text-sm text-gray-500 mb-2">Current Value</h3>
            <div className="bg-[#1a1a1a] rounded-lg p-3">
              <pre className="text-gray-400 text-sm whitespace-pre-wrap break-all">
                {formatValue(correction.oldValue)}
              </pre>
            </div>
          </div>

          {/* Proposed Value */}
          <div>
            <h3 className="text-sm text-gray-500 mb-2">Proposed Value</h3>
            <div className="bg-[#1a1a1a] rounded-lg p-3 border-l-4 border-[#107c10]">
              <pre className="text-[#107c10] text-sm whitespace-pre-wrap break-all">
                {formatValue(correction.newValue, true)}
              </pre>
            </div>
            {(correction.newValue === null || correction.newValue === "" || (Array.isArray(correction.newValue) && correction.newValue.length === 0)) && (
              <p className="text-xs text-yellow-400 mt-1">
                ⚠️ This will clear/remove the field value
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <h3 className="text-sm text-gray-500 mb-2">Reason for Change</h3>
            <div className="bg-[#1a1a1a] rounded-lg p-3">
              <p className="text-gray-400 text-sm">{correction.reason}</p>
            </div>
          </div>

          {/* Modify Value (Optional) */}
          {showModify && (
            <div>
              <h3 className="text-sm text-gray-500 mb-2">Modified Value</h3>
              <textarea
                value={modifiedValue}
                onChange={(e) => setModifiedValue(e.target.value)}
                className="w-full p-3 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none font-mono text-sm"
                rows={6}
              />
            </div>
          )}

          {/* Review Notes */}
          <div>
            <h3 className="text-sm text-gray-500 mb-2">
              Review Notes (Optional)
            </h3>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add notes about your decision..."
              className="w-full p-3 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none"
              rows={3}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer - Actions */}
        {correction.status === "pending" && (
          <div className="sticky bottom-0 bg-[#2d2d2d] border-t border-gray-700 p-6 space-y-3">
            {!showModify && (
              <button
                onClick={() => setShowModify(true)}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Modify Value
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleReject}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaTimes />
                {isSubmitting ? "Processing..." : "Reject"}
              </button>
              <button
                onClick={showModify ? handleModify : handleApprove}
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaCheck />
                {isSubmitting
                  ? "Processing..."
                  : showModify
                  ? "Approve Modified"
                  : "Approve"}
              </button>
            </div>
          </div>
        )}

        {/* Footer - Reviewed */}
        {correction.status !== "pending" && (
          <div className="sticky bottom-0 bg-[#2d2d2d] border-t border-gray-700 p-6">
            <div className="mb-4 p-3 bg-[#1a1a1a] rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Reviewed by</p>
              <p className="text-white">{correction.reviewedByName}</p>
              <p className="text-gray-500 text-xs mt-1">
                {correction.reviewedAt &&
                  new Date(correction.reviewedAt).toLocaleString()}
              </p>
              {correction.reviewNotes && (
                <p className="text-gray-400 text-sm mt-2">
                  {correction.reviewNotes}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

