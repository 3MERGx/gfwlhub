"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
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
  FaShieldAlt,
  FaSpinner,
} from "react-icons/fa";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getFieldDisplayName } from "@/lib/field-display";
import { useCSRF } from "@/hooks/useCSRF";
import { useDebounce } from "@/hooks/useDebounce";
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

  // Reset image state when imageUrl changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setIsHovered(false);
    setIsTapped(false);
  }, [imageUrl]);

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
        className="relative w-24 h-24 rounded-lg overflow-hidden border border-[rgb(var(--border-color))] cursor-pointer transition-all touch-manipulation"
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
          key={imageUrl}
          src={proxyUrl}
          alt={label || "Image preview"}
          width={96}
          height={96}
          className={`w-full h-full object-cover transition-all duration-300 ${
            isRevealed ? "blur-none" : "blur-md"
          } ${imageLoaded ? "opacity-100" : "opacity-0"}`}
          onError={() => setImageError(true)}
          onLoad={() => setImageLoaded(true)}
          loading="eager"
          draggable={false}
          unoptimized
        />
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgb(var(--bg-card-alt))]">
            <p className="text-xs text-[rgb(var(--text-muted))]">Loading...</p>
          </div>
        )}
        {!isRevealed && imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <p className="text-xs text-[rgb(var(--text-primary))]/70">
              {isTouchDevice ? "Tap to view" : "Hover to view"}
            </p>
          </div>
        )}
      </div>
      {isRevealed && imageLoaded && isTouchDevice && (
        <p className="text-xs text-[rgb(var(--text-secondary))] mt-1 text-center">
          Tap to hide
        </p>
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
  const { data: session } = useSession();
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
  const [selectedBatch, setSelectedBatch] = useState<Correction[] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [userIdFilter, setUserIdFilter] = useState<string | null>(null);

  // Get userId from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUserIdFilter(params.get("userId"));
  }, []);

  // Fetch real corrections from API
  const fetchCorrections = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/corrections");
      if (response.ok) {
        const data = await response.json();
        const correctionsData = data.corrections || [];
        setCorrections(correctionsData);
        // Filtered corrections will be updated by the useEffect that watches corrections
      } else {
        console.error("Failed to fetch corrections");
      }
    } catch (error) {
      console.error("Error fetching corrections:", error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  useEffect(() => {
    fetchCorrections();
  }, []);

  // Filter and sort corrections
  useEffect(() => {
    let filtered = [...corrections];

    // User ID filter (from query parameter)
    if (userIdFilter) {
      filtered = filtered.filter((c) => c.submittedBy === userIdFilter);
    }

    // Search filter (using debounced value)
    if (debouncedSearchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.gameTitle
            .toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase()) ||
          c.submittedByName
            .toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase()) ||
          c.field.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
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
  }, [
    corrections,
    debouncedSearchQuery,
    statusFilter,
    fieldFilter,
    sortBy,
    sortOrder,
    userIdFilter,
  ]);

  // Group corrections by user + game + timeframe (10 minutes)
  const groupCorrections = (
    corrections: Correction[]
  ): Array<Correction | Correction[]> => {
    const groups: Map<string, Correction[]> = new Map();
    const standalone: Correction[] = [];
    const MERGE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes - good balance between grouping related corrections and avoiding unrelated ones

    corrections.forEach((correction) => {
      // Only group pending corrections
      if (correction.status !== "pending") {
        standalone.push(correction);
        return;
      }

      const submittedAt = new Date(correction.submittedAt).getTime();
      let foundGroup = false;

      // Check existing groups
      for (const [key, group] of groups.entries()) {
        const [groupUserId, groupGameSlug, groupTimeStr] = key.split("|");
        const groupTime = parseInt(groupTimeStr, 10);

        // Same user and game, and within time window
        if (
          correction.submittedBy === groupUserId &&
          correction.gameSlug === groupGameSlug &&
          Math.abs(submittedAt - groupTime) <= MERGE_WINDOW_MS
        ) {
          group.push(correction);
          foundGroup = true;
          break;
        }
      }

      // Create new group if not found
      if (!foundGroup) {
        const key = `${correction.submittedBy}|${correction.gameSlug}|${submittedAt}`;
        groups.set(key, [correction]);
      }
    });

    // Combine groups and standalone corrections
    const result: Array<Correction | Correction[]> = [];

    // Add groups (only if more than 1 correction)
    for (const group of groups.values()) {
      if (group.length > 1) {
        // Sort by submission time
        group.sort(
          (a, b) =>
            new Date(a.submittedAt).getTime() -
            new Date(b.submittedAt).getTime()
        );
        result.push(group);
      } else {
        standalone.push(group[0]);
      }
    }

    // Add standalone corrections
    result.push(...standalone);

    // Sort all items by the earliest submission time in each group/item
    result.sort((a, b) => {
      const aTime = Array.isArray(a)
        ? new Date(a[0].submittedAt).getTime()
        : new Date(a.submittedAt).getTime();
      const bTime = Array.isArray(b)
        ? new Date(b[0].submittedAt).getTime()
        : new Date(b.submittedAt).getTime();
      return bTime - aTime; // Descending (newest first)
    });

    return result;
  };

  // Group filtered corrections
  const groupedCorrections = groupCorrections(filteredCorrections);

  // Calculate pagination for grouped items
  const totalPages = Math.ceil(groupedCorrections.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCorrections = groupedCorrections.slice(startIndex, endIndex);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-yellow-500/50 dark:border-yellow-500/30";
      case "approved":
        return "bg-green-500/20 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-500/50 dark:border-green-500/30";
      case "rejected":
        return "bg-red-500/20 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-500/50 dark:border-red-500/30";
      case "modified":
        return "bg-blue-500/20 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-500/50 dark:border-blue-500/30";
      default:
        return "bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] border-[rgb(var(--border-color))]";
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
            <h1 className="text-2xl md:text-3xl font-bold text-[rgb(var(--text-primary))] mb-2">
              Review Submissions
            </h1>
            <p className="text-[rgb(var(--text-secondary))] text-sm md:text-base">
              Review and approve game information corrections
            </p>
            {userIdFilter && (
              <div className="mt-3 p-3 bg-[#107c10]/10 border border-[#107c10]/30 rounded-lg">
                <p className="text-sm text-[rgb(var(--text-primary))]">
                  <span className="font-semibold">Filtered by user:</span>{" "}
                  Showing corrections for user ID: {userIdFilter}
                  <Link
                    href="/dashboard/submissions"
                    className="ml-2 text-[#107c10] hover:underline inline-flex items-center gap-1"
                  >
                    Clear filter
                  </Link>
                </p>
              </div>
            )}
          </div>

          {/* Search and Controls */}
          <div className="bg-[rgb(var(--bg-card))] rounded-lg p-4 mb-6">
            {/* Search Bar */}
            <div className="relative mb-4">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[rgb(var(--text-muted))]" />
              <input
                type="text"
                placeholder="Search by game, user, or field..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none"
              />
            </div>

            {/* Filter Toggle (Mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden w-full flex items-center justify-center gap-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] py-2 rounded-lg border border-[rgb(var(--border-color))] mb-4"
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-auto min-w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="modified">Modified</SelectItem>
                </SelectContent>
              </Select>

              {/* Field Filter */}
              <Select value={fieldFilter} onValueChange={setFieldFilter}>
                <SelectTrigger className="w-full md:w-auto min-w-[140px]">
                  <SelectValue placeholder="All Fields" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fields</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="description">Description</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="publisher">Publisher</SelectItem>
                  <SelectItem value="releaseDate">Release Date</SelectItem>
                  <SelectItem value="genres">Genres</SelectItem>
                  <SelectItem value="platforms">Platforms</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort By */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-auto min-w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Submission Date</SelectItem>
                  <SelectItem value="game">Game Name</SelectItem>
                  <SelectItem value="submitter">Submitter</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort Order */}
              <button
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="w-full md:w-auto px-4 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:border-[#107c10] transition-colors flex items-center justify-center gap-2"
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
            <div className="bg-[rgb(var(--bg-card))] rounded-lg p-3 border border-[rgb(var(--border-color))]">
              <p className="text-xs text-[rgb(var(--text-muted))] mb-1">
                Total
              </p>
              <p className="text-xl font-bold text-[rgb(var(--text-primary))]">
                {corrections.length}
              </p>
            </div>
            <div className="bg-[rgb(var(--bg-card))] rounded-lg p-3 border border-yellow-500/50">
              <p className="text-xs text-[rgb(var(--text-muted))] mb-1">
                Pending
              </p>
              <p className="text-xl font-bold text-yellow-500">
                {corrections.filter((c) => c.status === "pending").length}
              </p>
            </div>
            <div className="bg-[rgb(var(--bg-card))] rounded-lg p-3 border border-green-500/50">
              <p className="text-xs text-[rgb(var(--text-muted))] mb-1">
                Approved
              </p>
              <p className="text-xl font-bold text-green-500">
                {corrections.filter((c) => c.status === "approved").length}
              </p>
            </div>
            <div className="bg-[rgb(var(--bg-card))] rounded-lg p-3 border border-red-500/50">
              <p className="text-xs text-[rgb(var(--text-muted))] mb-1">
                Rejected
              </p>
              <p className="text-xl font-bold text-red-500">
                {corrections.filter((c) => c.status === "rejected").length}
              </p>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-[rgb(var(--text-secondary))] text-sm mb-4">
            Showing {startIndex + 1}-
            {Math.min(endIndex, groupedCorrections.length)} of{" "}
            {groupedCorrections.length} item
            {groupedCorrections.length !== 1 ? "s" : ""} (
            {filteredCorrections.length} correction
            {filteredCorrections.length !== 1 ? "s" : ""})
            {filteredCorrections.length !== corrections.length &&
              ` (filtered from ${corrections.length} total)`}
          </div>

          {/* Submissions List */}
          <div className="space-y-3 mb-6">
            {loading ? (
              <div className="bg-[rgb(var(--bg-card))] rounded-lg p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#107c10] mx-auto mb-4"></div>
                <p className="text-[rgb(var(--text-secondary))]">
                  Loading submissions...
                </p>
              </div>
            ) : paginatedCorrections.length === 0 ? (
              <div className="bg-[rgb(var(--bg-card))] rounded-lg p-8 text-center">
                <FaClock
                  className="mx-auto text-[rgb(var(--text-muted))] mb-4"
                  size={48}
                />
                <p className="text-[rgb(var(--text-secondary))]">
                  No submissions found
                </p>
              </div>
            ) : (
              paginatedCorrections.map((item, index) => {
                interface SessionUser {
                  isDeveloper?: boolean;
                }
                const isDeveloper =
                  (session?.user as SessionUser)?.isDeveloper === true;

                // Check if this is a batch (array) or single correction
                if (Array.isArray(item)) {
                  // Render batch
                  return (
                    <BatchCorrectionCard
                      key={`batch-${item[0].id}-${index}`}
                      corrections={item}
                      getFieldDisplayName={getFieldDisplayName}
                      onReviewBatch={() => setSelectedBatch(item)}
                      currentUserId={session?.user?.id}
                      isDeveloper={isDeveloper}
                    />
                  );
                } else {
                  // Render single correction
                  return (
                    <CorrectionCard
                      key={item.id}
                      correction={item}
                      getFieldDisplayName={getFieldDisplayName}
                      getStatusBadgeColor={getStatusBadgeColor}
                      onViewDetails={() => setSelectedCorrection(item)}
                      currentUserId={session?.user?.id}
                      isDeveloper={isDeveloper}
                    />
                  );
                }
              })
            )}
          </div>

          {/* Pagination - Only show if more than 50 items */}
          {groupedCorrections.length > 50 && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              <div className="text-sm text-[rgb(var(--text-secondary))]">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:border-[#107c10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                            : "bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] border-[rgb(var(--border-color))] hover:border-[#107c10]"
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
                  className="px-4 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:border-[#107c10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              onReview={async () => {
                setSelectedCorrection(null);
                // Refresh the list after closing modal
                await fetchCorrections();
                // Dispatch event to update notification counts
                window.dispatchEvent(new CustomEvent("correctionsUpdated"));
              }}
            />
          )}

          {/* Batch Review Modal */}
          {selectedBatch && (
            <BatchReviewModal
              corrections={selectedBatch}
              onClose={() => setSelectedBatch(null)}
              getFieldDisplayName={getFieldDisplayName}
              onReview={async () => {
                setSelectedBatch(null);
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
  currentUserId?: string;
  isDeveloper?: boolean;
}

function CorrectionCard({
  correction,
  getFieldDisplayName,
  getStatusBadgeColor,
  onViewDetails,
  currentUserId,
  isDeveloper = false,
}: CorrectionCardProps) {
  const isOwnSubmission =
    correction.submittedBy === currentUserId && !isDeveloper;
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
    <div className="bg-[rgb(var(--bg-card))] rounded-lg p-4 border border-[rgb(var(--border-color))] hover:border-[rgb(var(--border-hover))] transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FaGamepad className="text-[#107c10] flex-shrink-0" size={16} />
          <Link
            href={`/games/${correction.gameSlug}`}
            className="text-[rgb(var(--text-primary))] font-medium truncate hover:text-[#107c10] transition-colors"
          >
            {correction.gameTitle}
          </Link>
        </div>
        {correction.status === "pending" && (
          <>
            {isOwnSubmission ? (
              <div
                className="px-3 py-1 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] text-sm rounded-lg whitespace-nowrap ml-2 cursor-not-allowed border border-[rgb(var(--border-color))]"
                title="You cannot review your own submissions"
              >
                Your Submission
              </div>
            ) : (
              <button
                onClick={onViewDetails}
                className="px-3 py-1 bg-[#107c10] hover:bg-[#0d6b0d] text-white text-sm rounded-lg transition-colors whitespace-nowrap ml-2"
              >
                Review
              </button>
            )}
          </>
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
        <span className="px-2 py-1 rounded text-xs border bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 inline-flex items-center gap-1">
          <FaEdit size={10} />
          {getFieldDisplayName(correction.field)}
        </span>
        {(correction.field === "downloadLink" ||
          correction.field === "communityAlternativeDownloadLink") && (
          <span className="px-2 py-1 rounded text-xs border bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30 inline-flex items-center gap-1 font-semibold">
            ⚠️ Download Link
          </span>
        )}
      </div>

      {/* Changes */}
      <div className="space-y-2 mb-3">
        <div>
          <p className="text-xs text-[rgb(var(--text-muted))] mb-1">Current:</p>
          <p className="text-[rgb(var(--text-secondary))] text-sm line-clamp-2">
            {formatValue(correction.oldValue)}
          </p>
        </div>
        <div>
          <p className="text-xs text-[rgb(var(--text-muted))] mb-1">
            Proposed:
          </p>
          <p className="text-[#107c10] text-sm line-clamp-2">
            {formatValue(correction.newValue, true)}
          </p>
        </div>
      </div>

      {/* Reason */}
      {correction.reason && (
        <div className="mb-3 p-2 bg-[rgb(var(--bg-card-alt))] rounded">
          <p className="text-xs text-[rgb(var(--text-muted))] mb-1">Reason:</p>
          <p className="text-[rgb(var(--text-secondary))] text-sm line-clamp-2">
            {correction.reason}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-[rgb(var(--text-secondary))]">
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

// Batch Correction Card Component
interface BatchCorrectionCardProps {
  corrections: Correction[];
  getFieldDisplayName: (field: string) => string;
  onReviewBatch: () => void;
  currentUserId?: string;
  isDeveloper?: boolean;
}

function BatchCorrectionCard({
  corrections,
  getFieldDisplayName,
  onReviewBatch,
  currentUserId,
  isDeveloper = false,
}: BatchCorrectionCardProps) {
  const firstCorrection = corrections[0];
  const isOwnSubmission =
    firstCorrection.submittedBy === currentUserId && !isDeveloper;
  const uniqueFields = Array.from(new Set(corrections.map((c) => c.field)));

  return (
    <div className="bg-[rgb(var(--bg-card))] rounded-lg p-4 border-2 border-[#107c10] border-dashed hover:border-solid transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FaGamepad className="text-[#107c10] flex-shrink-0" size={16} />
          <Link
            href={`/games/${firstCorrection.gameSlug}`}
            className="text-[rgb(var(--text-primary))] font-medium truncate hover:text-[#107c10] transition-colors"
          >
            {firstCorrection.gameTitle}
          </Link>
          <span className="px-2 py-0.5 bg-[#107c10]/20 text-[#107c10] text-xs font-semibold rounded">
            Batch ({corrections.length})
          </span>
        </div>
        {firstCorrection.status === "pending" && (
          <>
            {isOwnSubmission ? (
              <div
                className="px-3 py-1 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] text-sm rounded-lg whitespace-nowrap ml-2 cursor-not-allowed border border-[rgb(var(--border-color))]"
                title="You cannot review your own submissions"
              >
                Your Submission
              </div>
            ) : (
              <button
                onClick={onReviewBatch}
                className="px-3 py-1 bg-[#107c10] hover:bg-[#0d6b0d] text-white text-sm rounded-lg transition-colors whitespace-nowrap ml-2"
              >
                Review Batch
              </button>
            )}
          </>
        )}
      </div>

      {/* Batch Info */}
      <div className="mb-3 p-3 bg-[#107c10]/10 rounded-lg border border-[#107c10]/30">
        <div className="flex items-center gap-2 mb-2">
          <FaUser size={12} className="text-[rgb(var(--text-secondary))]" />
          <span className="text-sm font-medium text-[rgb(var(--text-primary))]">
            {firstCorrection.submittedByName}
          </span>
          <span className="text-xs text-[rgb(var(--text-muted))]">
            • {new Date(firstCorrection.submittedAt).toLocaleString()}
          </span>
        </div>
        <div className="text-xs text-[rgb(var(--text-secondary))]">
          {corrections.length} correction{corrections.length > 1 ? "s" : ""}{" "}
          submitted within 5 minutes
        </div>
      </div>

      {/* Fields Changed */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="px-2 py-1 rounded text-xs border bg-yellow-500/20 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-yellow-500/50 dark:border-yellow-500/30">
          Pending
        </span>
        {uniqueFields.map((field) => (
          <span
            key={field}
            className="px-2 py-1 rounded text-xs border bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 inline-flex items-center gap-1"
          >
            <FaEdit size={10} />
            {getFieldDisplayName(field)}
          </span>
        ))}
      </div>

      {/* Preview of Changes */}
      <div className="space-y-2 mb-3">
        {corrections.slice(0, 3).map((correction) => {
          const formatValue = (
            value: string | number | boolean | string[] | null
          ) => {
            if (value === null || value === undefined || value === "") {
              return "N/A";
            }
            if (Array.isArray(value)) {
              return value.length === 0 ? "N/A" : value.join(", ");
            }
            const str = String(value);
            return str.length > 50 ? str.substring(0, 50) + "..." : str;
          };
          return (
            <div
              key={correction.id}
              className="text-xs p-2 bg-[rgb(var(--bg-card-alt))] rounded"
            >
              <span className="font-medium text-[rgb(var(--text-primary))]">
                {getFieldDisplayName(correction.field)}:
              </span>{" "}
              <span className="text-[rgb(var(--text-secondary))]">
                {formatValue(correction.oldValue)} →{" "}
              </span>
              <span className="text-[#107c10]">
                {formatValue(correction.newValue)}
              </span>
            </div>
          );
        })}
        {corrections.length > 3 && (
          <div className="text-xs text-[rgb(var(--text-muted))] text-center py-1">
            +{corrections.length - 3} more correction
            {corrections.length - 3 > 1 ? "s" : ""}
          </div>
        )}
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
  const { csrfToken } = useCSRF();
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
  const [scanningUrl, setScanningUrl] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    url: string;
    malicious: number;
    harmless: number;
    suspicious: number;
    total: number;
    reportUrl?: string;
  } | null>(null);

  const handleApprove = async () => {
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/corrections/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
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
          "X-CSRF-Token": csrfToken || "",
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
          "X-CSRF-Token": csrfToken || "",
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[rgb(var(--bg-card))] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-20 bg-[rgb(var(--bg-card))] border-b border-[rgb(var(--border-color))] p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-[rgb(var(--text-primary))] mb-1">
                Review Submission
              </h2>
              <p className="text-[rgb(var(--text-secondary))] text-sm">
                {correction.gameTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 pb-24">
          {/* Field */}
          <div>
            <h3 className="text-sm text-[rgb(var(--text-muted))] mb-2">
              Field
            </h3>
            <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3">
              <p className="text-[rgb(var(--text-primary))]">
                {getFieldDisplayName(correction.field)}
              </p>
            </div>
          </div>

          {/* Submitted By */}
          <div>
            <h3 className="text-sm text-[rgb(var(--text-muted))] mb-2">
              Submitted By
            </h3>
            <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3 flex items-center justify-between">
              <span className="text-[rgb(var(--text-primary))]">
                {correction.submittedByName}
              </span>
              <span className="text-[rgb(var(--text-muted))] text-sm">
                {new Date(correction.submittedAt).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Current Value */}
          <div>
            <h3 className="text-sm text-[rgb(var(--text-muted))] mb-2">
              Current Value
            </h3>
            <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3">
              <pre className="text-[rgb(var(--text-secondary))] text-sm whitespace-pre-wrap break-all">
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
            <h3 className="text-sm text-[rgb(var(--text-muted))] mb-2">
              Proposed Value
            </h3>
            <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3 border-l-4 border-[#107c10]">
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
              {/* VirusTotal Scan for Download Links */}
              {(correction.field === "downloadLink" ||
                correction.field === "communityAlternativeDownloadLink") &&
                typeof correction.newValue === "string" &&
                correction.newValue &&
                (correction.newValue.startsWith("http://") ||
                  correction.newValue.startsWith("https://")) && (
                  <div className="mt-3 pt-3 border-t border-[rgb(var(--border-color))]">
                    <div className="flex items-center gap-2 mb-2">
                      <FaShieldAlt className="text-blue-400" size={16} />
                      <span className="text-sm font-medium text-[rgb(var(--text-primary))]">
                        VirusTotal Security Scan
                      </span>
                    </div>
                    {scanningUrl === correction.newValue ? (
                      <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]">
                        <FaSpinner className="animate-spin" size={14} />
                        <span>Scanning URL...</span>
                      </div>
                    ) : scanResult && scanResult.url === correction.newValue ? (
                      <div className="space-y-2">
                        <div className="p-3 bg-[rgb(var(--bg-card-alt))] rounded-lg border-l-4 border-green-500">
                          <div className="flex items-center gap-4 text-sm mb-2">
                            <div className="flex items-center gap-1">
                              <span className="text-green-400 font-semibold">
                                {scanResult.harmless}
                              </span>
                              <span className="text-[rgb(var(--text-secondary))]">
                                clean
                              </span>
                            </div>
                            {scanResult.malicious > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-red-400 font-semibold">
                                  {scanResult.malicious}
                                </span>
                                <span className="text-[rgb(var(--text-secondary))]">
                                  malicious
                                </span>
                              </div>
                            )}
                            {scanResult.suspicious > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-yellow-400 font-semibold">
                                  {scanResult.suspicious}
                                </span>
                                <span className="text-[rgb(var(--text-secondary))]">
                                  suspicious
                                </span>
                              </div>
                            )}
                            {scanResult.total > 0 && (
                              <span className="text-[rgb(var(--text-muted))] text-xs">
                                ({scanResult.total} total engines)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-yellow-400 bg-yellow-900/20 dark:bg-yellow-900/10 border border-yellow-500/30 rounded p-2 mt-2">
                            ⚠️ <strong>Important:</strong> VirusTotal results
                            are not a guarantee of safety. Proceed with caution
                            and use antivirus software.
                          </div>
                          {scanResult.reportUrl && (
                            <a
                              href={scanResult.reportUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 underline mt-2 inline-block"
                            >
                              View full report on VirusTotal →
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={async () => {
                          const url = correction.newValue as string;
                          setScanningUrl(url);
                          setScanResult(null);
                          try {
                            const response = await fetch(
                              "/api/virustotal/scan",
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  url,
                                  action: "scan",
                                }),
                              }
                            );

                            if (!response.ok) {
                              const data = await response.json();
                              setError(data.error || "Failed to scan URL");
                              setScanningUrl(null);
                              return;
                            }

                            const scanData = await response.json();
                            if (scanData.report?.data?.attributes) {
                              const attrs = scanData.report.data.attributes;
                              // VirusTotal URL report endpoint uses 'last_analysis_stats' instead of 'stats'
                              // Analysis endpoint uses 'stats'
                              const stats =
                                attrs.last_analysis_stats || attrs.stats;

                              if (!stats) {
                                setError(
                                  "Scan results are not yet available. Please try again in a moment."
                                );
                                setScanningUrl(null);
                                return;
                              }

                              // Construct the correct VirusTotal URL report link
                              // URL needs to be base64 encoded (without padding, with URL-safe characters)
                              const encodedUrl = btoa(url)
                                .replace(/=/g, "")
                                .replace(/\+/g, "-")
                                .replace(/\//g, "_");
                              setScanResult({
                                url,
                                malicious: stats.malicious || 0,
                                harmless: stats.harmless || 0,
                                suspicious: stats.suspicious || 0,
                                total:
                                  (stats.malicious || 0) +
                                  (stats.harmless || 0) +
                                  (stats.suspicious || 0) +
                                  (stats.undetected || 0),
                                reportUrl: `https://www.virustotal.com/gui/url/${encodedUrl}`,
                              });
                            } else if (scanData.analysisId) {
                              setError(
                                "Scan submitted but results not yet available. Please try again in a moment."
                              );
                            } else {
                              setError(
                                "Unexpected response format from VirusTotal API"
                              );
                            }
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Failed to scan URL"
                            );
                          } finally {
                            setScanningUrl(null);
                          }
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                      >
                        <FaShieldAlt size={12} />
                        Scan URL with VirusTotal
                      </button>
                    )}
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
            <h3 className="text-sm text-[rgb(var(--text-muted))] mb-2">
              Reason for Change
            </h3>
            <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3">
              <p className="text-[rgb(var(--text-secondary))] text-sm">
                {correction.reason}
              </p>
            </div>
          </div>

          {/* Modify Value (Optional) */}
          {showModify && (
            <div>
              <h3 className="text-sm text-[rgb(var(--text-muted))] mb-2">
                Modified Value
              </h3>
              <textarea
                value={modifiedValue}
                onChange={(e) => setModifiedValue(e.target.value)}
                className="w-full p-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none font-mono text-sm"
                rows={6}
              />
            </div>
          )}

          {/* Review Notes */}
          <div>
            <h3 className="text-sm text-[rgb(var(--text-muted))] mb-2">
              Review Notes (Optional)
            </h3>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add notes about your decision..."
              className="w-full p-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none"
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
          <div className="sticky bottom-0 z-20 bg-[rgb(var(--bg-card))] border-t border-[rgb(var(--border-color))] p-6 space-y-3">
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
          <div className="sticky bottom-0 z-20 bg-[rgb(var(--bg-card))] border-t border-[rgb(var(--border-color))] p-6">
            <div className="mb-4 p-3 bg-[rgb(var(--bg-card-alt))] rounded-lg">
              <p className="text-sm text-[rgb(var(--text-muted))] mb-1">
                Reviewed by
              </p>
              <p className="text-[rgb(var(--text-primary))]">
                {correction.reviewedByName}
              </p>
              <p className="text-[rgb(var(--text-muted))] text-xs mt-1">
                {correction.reviewedAt &&
                  new Date(correction.reviewedAt).toLocaleString()}
              </p>
              {correction.reviewNotes && (
                <p className="text-[rgb(var(--text-secondary))] text-sm mt-2">
                  {correction.reviewNotes}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] rounded-lg transition-colors border border-[rgb(var(--border-color))]"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Batch Review Modal Component
interface BatchReviewModalProps {
  corrections: Correction[];
  onClose: () => void;
  getFieldDisplayName: (field: string) => string;
  onReview: () => void;
}

function BatchReviewModal({
  corrections,
  onClose,
  getFieldDisplayName,
  onReview,
}: BatchReviewModalProps) {
  const { csrfToken } = useCSRF();
  const [reviewStates, setReviewStates] = useState<
    Map<
      string,
      {
        action: "approve" | "reject" | "modify" | "pending";
        modifiedValue?: string;
        reviewNotes?: string;
      }
    >
  >(new Map());
  const [batchNotes, setBatchNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Initialize review states
  useEffect(() => {
    const states = new Map();
    corrections.forEach((correction) => {
      states.set(correction.id, {
        action: "pending" as const,
        modifiedValue:
          typeof correction.newValue === "string" &&
          !String(correction.newValue).startsWith("[")
            ? String(correction.newValue)
            : JSON.stringify(correction.newValue, null, 2),
      });
    });
    setReviewStates(states);
  }, [corrections]);

  const updateReviewState = (
    correctionId: string,
    updates: {
      action?: "approve" | "reject" | "modify" | "pending";
      modifiedValue?: string;
      reviewNotes?: string;
    }
  ) => {
    setReviewStates((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(correctionId) || {
        action: "pending" as const,
      };
      newMap.set(correctionId, { ...current, ...updates });
      return newMap;
    });
  };

  const setAllActions = async (action: "approve" | "reject") => {
    // Set all actions
    setReviewStates((prev) => {
      const newMap = new Map(prev);
      corrections.forEach((correction) => {
        const current = newMap.get(correction.id) || {
          action: "pending" as const,
        };
        newMap.set(correction.id, { ...current, action });
      });
      return newMap;
    });

    // Submit immediately
    setIsSubmitting(true);
    setError("");

    try {
      if (!csrfToken) {
        setError("Security token not ready. Please wait...");
        setIsSubmitting(false);
        return;
      }

      // Submit all reviews with the batch action using batch endpoint
      // Convert action to API status format: "approve" -> "approved", "reject" -> "rejected"
      const apiStatus = action === "approve" ? "approved" : "rejected";

      const reviews = corrections.map((correction) => ({
        correctionId: correction.id,
        status: apiStatus,
        reviewNotes: batchNotes || undefined,
      }));

      const response = await fetch(`/api/corrections/review-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ reviews }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit batch reviews");
      }
      onReview();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit reviews");
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      if (!csrfToken) {
        setError("Security token not ready. Please wait...");
        setIsSubmitting(false);
        return;
      }

      // Check if all corrections have an action
      const hasPending = Array.from(reviewStates.values()).some(
        (state) => state.action === "pending"
      );
      if (hasPending) {
        setError("Please review all corrections before submitting.");
        setIsSubmitting(false);
        return;
      }

      // Submit all reviews using batch endpoint
      const reviews = corrections
        .map((correction) => {
          const state = reviewStates.get(correction.id);
          if (!state || state.action === "pending") {
            return null;
          }

          // Parse finalValue if it's JSON (for arrays/objects)
          let parsedFinalValue: unknown = undefined;
          if (state.action === "modify" && state.modifiedValue) {
            try {
              // Try to parse as JSON first (for arrays/objects)
              parsedFinalValue = JSON.parse(state.modifiedValue);
            } catch {
              // If not valid JSON, use as string
              parsedFinalValue = state.modifiedValue;
            }
          }

          // Convert action to API status format: "approve" -> "approved", "reject" -> "rejected", "modify" -> "modified"
          const apiStatus =
            state.action === "approve"
              ? "approved"
              : state.action === "reject"
              ? "rejected"
              : "modified";

          return {
            correctionId: correction.id,
            status: apiStatus,
            reviewNotes:
              state.reviewNotes || (batchNotes ? batchNotes : undefined),
            finalValue: parsedFinalValue,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (reviews.length === 0) {
        setError("No reviews to submit.");
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(`/api/corrections/review-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ reviews }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit batch reviews");
      }
      onReview();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit reviews");
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const firstCorrection = corrections[0];

  return (
    <div
      className="fixed inset-0 bg-black/40 dark:bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[rgb(var(--bg-card))] rounded-lg max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-[rgb(var(--border-color))] my-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[rgb(var(--bg-card))] border-b border-[rgb(var(--border-color))] p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 z-10">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-[rgb(var(--text-primary))] break-words">
              Batch Review: {firstCorrection.gameTitle}
            </h2>
            <p className="text-[rgb(var(--text-secondary))] text-xs sm:text-sm mt-1">
              {corrections.length} correction{corrections.length > 1 ? "s" : ""}{" "}
              from {firstCorrection.submittedByName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors flex-shrink-0 self-start sm:self-auto"
            aria-label="Close modal"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 pb-24">
          {/* Batch Actions */}
          <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-4 border border-[rgb(var(--border-color))]">
            <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))] mb-3">
              Batch Actions
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setAllActions("approve")}
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="inline mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FaCheck className="inline mr-2" />
                    Approve All
                  </>
                )}
              </button>
              <button
                onClick={() => setAllActions("reject")}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="inline mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FaTimes className="inline mr-2" />
                    Reject All
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-[rgb(var(--text-muted))] mt-2">
              Clicking &quot;Approve All&quot; or &quot;Reject All&quot; will
              immediately submit all reviews. Use individual buttons below to
              review corrections separately.
            </p>
          </div>

          {/* Batch Notes */}
          <div>
            <h3 className="text-sm text-[rgb(var(--text-muted))] mb-2">
              Batch Review Notes (Optional)
            </h3>
            <textarea
              value={batchNotes}
              onChange={(e) => setBatchNotes(e.target.value)}
              placeholder="Add notes that will apply to all corrections in this batch..."
              className="w-full px-4 py-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none resize-none"
              rows={3}
            />
          </div>

          {/* Individual Corrections */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[rgb(var(--text-primary))]">
              Individual Corrections
            </h3>
            {corrections.map((correction, index) => {
              const state = reviewStates.get(correction.id) || {
                action: "pending" as const,
              };
              const showModify = state.action === "modify";

              return (
                <div
                  key={correction.id}
                  className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-4 border border-[rgb(var(--border-color))]"
                >
                  {/* Correction Header */}
                  <div className="mb-4">
                    <h4 className="text-base font-semibold text-[rgb(var(--text-primary))] mb-1">
                      Correction {index + 1} of {corrections.length}
                    </h4>
                    <p className="text-sm text-[rgb(var(--text-secondary))] mb-3">
                      Field: {getFieldDisplayName(correction.field)}
                    </p>
                    {/* Action Buttons - Moved below header for better mobile layout */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          updateReviewState(correction.id, {
                            action:
                              state.action === "approve"
                                ? "pending"
                                : "approve",
                          })
                        }
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors flex-1 min-w-[100px] ${
                          state.action === "approve"
                            ? "bg-green-600 text-white"
                            : "bg-[rgb(var(--bg-card))] text-[rgb(var(--text-secondary))] hover:bg-green-600/20 border border-[rgb(var(--border-color))]"
                        }`}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          updateReviewState(correction.id, {
                            action:
                              state.action === "reject" ? "pending" : "reject",
                          })
                        }
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors flex-1 min-w-[100px] ${
                          state.action === "reject"
                            ? "bg-red-600 text-white"
                            : "bg-[rgb(var(--bg-card))] text-[rgb(var(--text-secondary))] hover:bg-red-600/20 border border-[rgb(var(--border-color))]"
                        }`}
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          if (state.action === "modify") {
                            // Deselecting modify - clear modified value
                            updateReviewState(correction.id, {
                              action: "pending",
                              modifiedValue: undefined,
                            });
                          } else {
                            // Selecting modify
                            updateReviewState(correction.id, {
                              action: "modify",
                            });
                          }
                        }}
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors flex-1 min-w-[100px] ${
                          state.action === "modify"
                            ? "bg-blue-600 text-white"
                            : "bg-[rgb(var(--bg-card))] text-[rgb(var(--text-secondary))] hover:bg-blue-600/20 border border-[rgb(var(--border-color))]"
                        }`}
                      >
                        Modify
                      </button>
                    </div>
                  </div>

                  {/* Current and Proposed Values */}
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h5 className="text-xs text-[rgb(var(--text-muted))] mb-2">
                        Current Value
                      </h5>
                      <div className="bg-[rgb(var(--bg-card))] rounded p-3">
                        <pre className="text-sm text-[rgb(var(--text-secondary))] whitespace-pre-wrap break-all">
                          {formatValue(correction.oldValue)}
                        </pre>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-xs text-[rgb(var(--text-muted))] mb-2">
                        Proposed Value
                      </h5>
                      <div className="bg-[rgb(var(--bg-card))] rounded p-3 border-l-4 border-[#107c10]">
                        <pre className="text-sm text-[#107c10] whitespace-pre-wrap break-all">
                          {formatValue(correction.newValue, true)}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  {correction.reason && (
                    <div className="mb-4">
                      <h5 className="text-xs text-[rgb(var(--text-muted))] mb-2">
                        Reason
                      </h5>
                      <div className="bg-[rgb(var(--bg-card))] rounded p-3">
                        <p className="text-sm text-[rgb(var(--text-secondary))]">
                          {correction.reason}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Modify Value (if modify selected) */}
                  {showModify && (
                    <div className="mb-4">
                      <h5 className="text-xs text-[rgb(var(--text-muted))] mb-2">
                        Modified Value
                      </h5>
                      <textarea
                        value={state.modifiedValue || ""}
                        onChange={(e) =>
                          updateReviewState(correction.id, {
                            modifiedValue: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none resize-none font-mono text-sm"
                        rows={4}
                      />
                    </div>
                  )}

                  {/* Individual Review Notes */}
                  <div>
                    <h5 className="text-xs text-[rgb(var(--text-muted))] mb-2">
                      Review Notes (Optional)
                    </h5>
                    <textarea
                      value={state.reviewNotes || ""}
                      onChange={(e) =>
                        updateReviewState(correction.id, {
                          reviewNotes: e.target.value,
                        })
                      }
                      placeholder="Add notes specific to this correction..."
                      className="w-full px-4 py-3 bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none resize-none"
                      rows={2}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-[rgb(var(--bg-card))] border-t border-[rgb(var(--border-color))] p-4 sm:p-6 flex flex-col sm:flex-row gap-3">
          {/* Only show Submit All Reviews if individual corrections have been manually reviewed */}
          {(() => {
            const states = Array.from(reviewStates.values());
            const hasIndividualReviews = states.some(
              (state) => state.action !== "pending"
            );

            // Check if there are mixed actions (user reviewed individually) or any modifications
            const hasMixedActions =
              new Set(states.map((s) => s.action)).size > 1;
            const hasModifications = states.some(
              (state) => state.action === "modify" || state.reviewNotes
            );

            // Show submit button if user has manually reviewed individual corrections
            // (not just using approve all/reject all which submit immediately)
            const showSubmitButton =
              hasIndividualReviews && (hasMixedActions || hasModifications);

            return showSubmitButton ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-[#107c10] hover:bg-[#0d6b0d] text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FaCheck />
                    Submit All Reviews
                  </>
                )}
              </button>
            ) : null;
          })()}
          <button
            onClick={onClose}
            className={`px-6 py-3 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] rounded-lg transition-colors border border-[rgb(var(--border-color))] ${
              Array.from(reviewStates.values()).some(
                (state) => state.action !== "pending"
              ) &&
              Array.from(reviewStates.values()).some(
                (state, _, arr) =>
                  state.action !== arr[0]?.action || state.action === "pending"
              )
                ? "flex-1"
                : ""
            }`}
          >
            {isSubmitting ? "Processing..." : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
