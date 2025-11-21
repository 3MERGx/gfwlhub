"use client";

import { useState, useEffect, useRef } from "react";
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
import Image from "next/image";

// Image Preview Component
interface ImagePreviewProps {
  imageUrl: string;
  label?: string;
}

function ImagePreview({ imageUrl, label }: ImagePreviewProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isTapped, setIsTapped] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const touchHandledRef = useRef(false);

  // Detect touch device on mount
  useEffect(() => {
    const hasTouch =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-expect-error - navigator.maxTouchPoints may not exist in all TypeScript definitions
      navigator.msMaxTouchPoints > 0;
    setIsTouchDevice(hasTouch);
  }, []);

  // Check if URL is valid
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  if (!isValidUrl(imageUrl) || imageError) {
    return null;
  }

  // Use the proxy API to avoid CORS issues
  const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;

  // Determine if image should be blurred
  const isRevealed = isHovered || isTapped;

  const handleTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    touchHandledRef.current = true;
    setIsTapped((prev) => !prev);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Only handle click if it wasn't from a touch event
    if (!touchHandledRef.current) {
      e.stopPropagation();
      if (!isTouchDevice) {
        // On non-touch devices, clicking can also toggle
        setIsTapped((prev) => !prev);
      }
    }
    // Reset the flag after a short delay
    setTimeout(() => {
      touchHandledRef.current = false;
    }, 300);
  };

  return (
    <div className="relative inline-block mt-2 z-10">
      <div
        className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-700 cursor-pointer transition-all touch-manipulation"
        onMouseEnter={() => {
          if (!isTouchDevice) {
            setIsHovered(true);
          }
        }}
        onMouseLeave={() => {
          if (!isTouchDevice) {
            setIsHovered(false);
          }
        }}
        onClick={handleClick}
        onTouchEnd={handleTouch}
        onTouchStart={(e) => {
          // Prevent double-tap zoom on mobile
          if (e.touches.length > 1) {
            e.preventDefault();
          }
        }}
      >
        <Image
          src={proxyUrl}
          alt={label || "Image preview"}
          className={`w-full h-full object-cover transition-all duration-300 ${
            isRevealed ? "blur-none" : "blur-md"
          } ${imageLoaded ? "opacity-100" : "opacity-0"}`}
          onError={() => setImageError(true)}
          onLoad={() => setImageLoaded(true)}
          draggable={false}
        />
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]">
            <p className="text-xs text-gray-500">Loading...</p>
          </div>
        )}
        {!isRevealed && imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <p className="text-xs text-white/70">
              {isTouchDevice ? "Tap to view" : "Hover to view"}
            </p>
          </div>
        )}
      </div>
      {isRevealed && imageLoaded && isTouchDevice && (
        <p className="text-xs text-gray-400 mt-1 text-center">Tap to hide</p>
      )}
    </div>
  );
}

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
  const [filteredCorrections, setFilteredCorrections] = useState<Correction[]>(
    []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [fieldFilter, setFieldFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCorrection, setSelectedCorrection] =
    useState<Correction | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch real corrections from API
  const fetchCorrections = async () => {
    try {
      const response = await fetch("/api/corrections");
      if (response.ok) {
        const data = await response.json();
        const correctionsData = data.corrections || [];
        setCorrections(correctionsData);
        // Filtered corrections will be updated by the useEffect that watches corrections
      }
    } catch (error) {
      console.error("Error fetching corrections:", error);
    }
  };

  useEffect(() => {
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
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [corrections, searchQuery, statusFilter, fieldFilter, sortBy, sortOrder]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredCorrections.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCorrections = filteredCorrections.slice(startIndex, endIndex);

  const getFieldDisplayName = (field: string) => {
    // Handle special cases like "steamDBLink" -> "SteamDB Link"
    // First, protect common acronyms by temporarily replacing them with a unique lowercase placeholder
    const result = field
      .replace(/([a-z])(DB)([A-Z])/gi, "$1__db_placeholder__$3") // Temporarily mark DB acronym
      .replace(/([a-z])([A-Z])/g, "$1 $2") // Add space between camelCase words
      .replace(/__db_placeholder__/g, "DB") // Restore DB acronym
      .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
      .trim();
    return result;
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
              } md:flex space-y-3 md:space-y-0 md:gap-3 md:flex-wrap md:items-center`}
            >
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full md:w-auto px-4 py-2 pr-10 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none"
                style={{ paddingRight: "2.75rem" }}
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
                style={{ paddingRight: "2.75rem" }}
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
                style={{ paddingRight: "2.75rem" }}
              >
                <option value="date">Submission Date</option>
                <option value="game">Game Name</option>
                <option value="submitter">Submitter</option>
              </select>

              {/* Sort Order */}
              <button
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
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
              <p className="text-xl font-bold text-white">
                {corrections.length}
              </p>
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
            Showing {startIndex + 1}-
            {Math.min(endIndex, filteredCorrections.length)} of{" "}
            {filteredCorrections.length} submissions
            {filteredCorrections.length !== corrections.length &&
              ` (filtered from ${corrections.length} total)`}
          </div>

          {/* Submissions List */}
          <div className="space-y-3 mb-6">
            {paginatedCorrections.length === 0 ? (
              <div className="bg-[#2d2d2d] rounded-lg p-8 text-center">
                <FaClock className="mx-auto text-gray-600 mb-4" size={48} />
                <p className="text-gray-400">No submissions found</p>
              </div>
            ) : (
              paginatedCorrections.map((correction) => (
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              <div className="text-sm text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 hover:border-[#107c10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
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
                            : "bg-[#1a1a1a] text-white border-gray-700 hover:border-[#107c10]"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 hover:border-[#107c10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Review Modal */}
          {selectedCorrection && (
            <ReviewModal
              correction={selectedCorrection}
              onClose={() => setSelectedCorrection(null)}
              getFieldDisplayName={getFieldDisplayName}
              onReview={async (action) => {
                console.log("Review action:", action, selectedCorrection.id);
                setSelectedCorrection(null);
                // Refresh the list after closing modal
                await fetchCorrections();
                // Dispatch event to update notification counts
                window.dispatchEvent(new CustomEvent("correctionsUpdated"));
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
  const formatValue = (
    value: string | number | boolean | string[] | null,
    isNewValue = false
  ) => {
    if (value === null || value === undefined || value === "") {
      return isNewValue ? "(clearing field)" : "N/A";
    }
    if (Array.isArray(value)) {
      return value.length === 0
        ? isNewValue
          ? "(clearing field)"
          : "N/A"
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
          <Link
            href={`/games/${correction.gameSlug}`}
            className="text-white font-medium truncate hover:text-[#107c10] transition-colors"
          >
            {correction.gameTitle}
          </Link>
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
          {correction.status.charAt(0).toUpperCase() +
            correction.status.slice(1)}
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
    typeof correction.newValue === "string" &&
      !correction.newValue.startsWith("[")
      ? correction.newValue
      : JSON.stringify(correction.newValue, null, 2)
  );
  const [showModify, setShowModify] = useState(false);

  const formatValue = (
    value: string | number | boolean | string[] | null,
    isNewValue = false
  ) => {
    if (value === null || value === undefined || value === "") {
      return isNewValue ? "(clearing field)" : "N/A";
    }
    if (Array.isArray(value)) {
      return value.length === 0
        ? isNewValue
          ? "(clearing field)"
          : "N/A"
        : JSON.stringify(value, null, 2);
    }
    if (typeof value === "object") return JSON.stringify(value, null, 2);
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
      // Dispatch event to update notification counts
      window.dispatchEvent(new CustomEvent("correctionsUpdated"));
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
      // Dispatch event to update notification counts
      window.dispatchEvent(new CustomEvent("correctionsUpdated"));
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
      if (
        modifiedValue.trim().startsWith("[") ||
        modifiedValue.trim().startsWith("{")
      ) {
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
      // Dispatch event to update notification counts
      window.dispatchEvent(new CustomEvent("correctionsUpdated"));
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
        <div className="sticky top-0 z-20 bg-[#2d2d2d] border-b border-gray-700 p-6">
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
        <div className="p-6 space-y-6 pb-24">
          {/* Field */}
          <div>
            <h3 className="text-sm text-gray-500 mb-2">Field</h3>
            <div className="bg-[#1a1a1a] rounded-lg p-3">
              <p className="text-white">
                {getFieldDisplayName(correction.field)}
              </p>
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
              {correction.field === "imageUrl" &&
                typeof correction.oldValue === "string" &&
                correction.oldValue && (
                  <div className="mt-3">
                    <ImagePreview
                      imageUrl={correction.oldValue}
                      label="Current image"
                    />
                  </div>
                )}
            </div>
          </div>

          {/* Proposed Value */}
          <div>
            <h3 className="text-sm text-gray-500 mb-2">Proposed Value</h3>
            <div className="bg-[#1a1a1a] rounded-lg p-3 border-l-4 border-[#107c10]">
              <pre className="text-[#107c10] text-sm whitespace-pre-wrap break-all">
                {formatValue(correction.newValue, true)}
              </pre>
              {correction.field === "imageUrl" &&
                typeof correction.newValue === "string" &&
                correction.newValue && (
                  <div className="mt-3">
                    <ImagePreview
                      imageUrl={correction.newValue}
                      label="Proposed image"
                    />
                  </div>
                )}
            </div>
            {(correction.newValue === null ||
              correction.newValue === "" ||
              (Array.isArray(correction.newValue) &&
                correction.newValue.length === 0)) && (
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
          <div className="sticky bottom-0 z-20 bg-[#2d2d2d] border-t border-gray-700 p-6 space-y-3">
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
          <div className="sticky bottom-0 z-20 bg-[#2d2d2d] border-t border-gray-700 p-6">
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
