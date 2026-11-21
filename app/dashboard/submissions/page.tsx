"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  FaExclamationTriangle,
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
import {
  getFieldDisplayName,
  getCorrectionStatusLabel,
} from "@/lib/field-display";
import { CORRECTION_FIELDS } from "@/types/crowdsource";
import { valuesAreEffectivelySame } from "@/lib/normalize-value";
import { useCSRF } from "@/hooks/useCSRF";
import { useDebounce } from "@/hooks/useDebounce";
import { usePusherChannel } from "@/hooks/usePusherChannel";
import { PUSHER_EVENTS } from "@/lib/pusher-client";
import CorrectionValueDiff from "@/components/CorrectionValueDiff";
import SubmitterHoverLink from "@/components/SubmitterHoverLink";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardErrorBanner from "@/components/dashboard/DashboardErrorBanner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/ui/toast-context";
import { formatReviewDateTime } from "@/lib/format-review-date";
import { safeLog } from "@/lib/security";
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
  status: "pending" | "approved" | "rejected" | "modified" | "superseded";
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  finalValue?: string | number | boolean | string[] | null;
  autoVirusTotalUrl?: string;
  virusTotalScan?: {
    reportUrl: string;
    malicious: number;
    suspicious: number;
    harmless: number;
    total: number;
    scannedAt: Date | string;
    source?: "submit" | "review";
  };
}

function isCleanVirusTotalScan(
  scan: Correction["virusTotalScan"] | undefined
): boolean {
  if (!scan || !(scan.total > 0)) return false;
  return (scan.malicious || 0) + (scan.suspicious || 0) === 0;
}

function DownloadLinkScanBadge({
  scan,
}: {
  scan: Correction["virusTotalScan"] | undefined;
}) {
  if (isCleanVirusTotalScan(scan)) {
    return (
      <span className="px-2 py-1 rounded text-xs border bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30 inline-flex items-center gap-1 font-semibold">
        <FaCheck size={10} />
        Download Link
      </span>
    );
  }

  const flagged =
    scan && (scan.malicious || 0) + (scan.suspicious || 0) > 0;
  if (flagged) {
    return (
      <span className="px-2 py-1 rounded text-xs border bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30 inline-flex items-center gap-1 font-semibold">
        <FaExclamationTriangle size={10} />
        Download Link
      </span>
    );
  }

  return (
    <span className="px-2 py-1 rounded text-xs border bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30 inline-flex items-center gap-1 font-semibold">
      <FaExclamationTriangle size={10} />
      Download Link
    </span>
  );
}

export default function SubmissionsPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
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
  const [itemsPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [userIdFilter, setUserIdFilter] = useState<string | null>(null);
  const [userNameFilter, setUserNameFilter] = useState<string | null>(null);
  const reviewModalOpenRef = useRef(false);
  const fetchInFlightRef = useRef(false);

  // Get userId from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUserIdFilter(params.get("userId"));
    setUserNameFilter(params.get("userName"));
  }, []);

  useEffect(() => {
    reviewModalOpenRef.current = Boolean(selectedCorrection || selectedBatch);
  }, [selectedCorrection, selectedBatch]);

  const applyVirusTotalScanToCorrection = (
    correctionId: string,
    scan: NonNullable<Correction["virusTotalScan"]>
  ) => {
    const patch = {
      virusTotalScan: scan,
      autoVirusTotalUrl: scan.reportUrl,
    };
    setCorrections((prev) =>
      prev.map((c) => (c.id === correctionId ? { ...c, ...patch } : c))
    );
    setSelectedCorrection((prev) =>
      prev?.id === correctionId ? { ...prev, ...patch } : prev
    );
    setSelectedBatch((prev) =>
      prev
        ? prev.map((c) => (c.id === correctionId ? { ...c, ...patch } : c))
        : prev
    );
  };

  // Fetch corrections. Background refreshes stay silent so opening Review doesn't flash the list.
  const fetchCorrections = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (fetchInFlightRef.current && silent) return;
    fetchInFlightRef.current = true;
    if (!silent) setLoading(true);
    try {
      const url = `/api/corrections?_t=${Date.now()}`;
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        const correctionsData = data.corrections || [];
        setCorrections(correctionsData);
        setFetchError(null);
      } else if (!silent) {
        setFetchError("Failed to fetch corrections. Please try again.");
        showToast("Failed to fetch corrections", 3000, "error");
      }
    } catch (error) {
      safeLog.error("Error fetching corrections:", error);
      if (!silent) {
        setFetchError("Failed to fetch corrections. Please try again.");
        showToast("Failed to fetch corrections", 3000, "error");
      }
    } finally {
      fetchInFlightRef.current = false;
      if (!silent) setLoading(false);
    }
  }, [showToast]);

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  useEffect(() => {
    void fetchCorrections();
  }, []);

  // Real-time: refetch when server broadcasts that submissions changed
  usePusherChannel(PUSHER_EVENTS.SUBMISSIONS_UPDATED, () => {
    if (reviewModalOpenRef.current) return;
    void fetchCorrections({ silent: true });
    window.dispatchEvent(new CustomEvent("correctionsUpdated"));
  });

  // Fallback: silent refetch when tab becomes visible again (not on every in-page focus)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (reviewModalOpenRef.current) return;
      void fetchCorrections({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
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

  const userFilterDisplayName =
    userNameFilter ||
    corrections.find((correction) => correction.submittedBy === userIdFilter)
      ?.submittedByName ||
    null;

  useEffect(() => {
    if (!userIdFilter || userFilterDisplayName) return;
    let cancelled = false;
    const loadName = async () => {
      try {
        const response = await fetch(
          `/api/users/${encodeURIComponent(userIdFilter)}`,
          { cache: "no-store" }
        );
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && data.name) {
          setUserNameFilter(data.name);
        }
      } catch (error) {
        safeLog.error("Error fetching submitter name:", error);
      }
    };
    void loadName();
    return () => {
      cancelled = true;
    };
  }, [userIdFilter, userFilterDisplayName]);

  const hasActiveFilters = Boolean(
    debouncedSearchQuery ||
      fieldFilter !== "all" ||
      userIdFilter ||
      statusFilter !== "pending"
  );

  const clearCorrectionFilters = () => {
    setSearchQuery("");
    setStatusFilter("pending");
    setFieldFilter("all");
    setUserIdFilter(null);
    setUserNameFilter(null);
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState({}, "", "/dashboard/submissions");
    }
  };

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
      case "superseded":
        return "bg-gray-500/20 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 border-gray-500/50 dark:border-gray-500/30";
      default:
        return "bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] border-[rgb(var(--border-color))]";
    }
  };

  return (
    <DashboardLayout requireRole="reviewer">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          <DashboardPageHeader
            title="Review corrections"
            subtitle="Review and approve game information corrections"
          >
            {userIdFilter && (
              <div className="mt-3 p-3 bg-[#107c10]/10 border border-[#107c10]/30 rounded-lg">
                <p className="text-sm text-[rgb(var(--text-primary))] flex flex-wrap items-center gap-2">
                  <span className="font-semibold">Filtered by user:</span>
                  <SubmitterHoverLink
                    userId={userIdFilter}
                    name={userFilterDisplayName || "Loading name…"}
                  />
                  <Link
                    href="/dashboard/submissions"
                    onClick={() => {
                      setUserIdFilter(null);
                      setUserNameFilter(null);
                    }}
                    className="text-[#107c10] hover:underline inline-flex items-center gap-1"
                  >
                    Clear filter
                  </Link>
                </p>
              </div>
            )}
          </DashboardPageHeader>

          {fetchError && (
            <DashboardErrorBanner
              message={fetchError}
              onRetry={() => {
                void fetchCorrections();
              }}
            />
          )}

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
              className={`md:hidden w-full flex items-center justify-center gap-2 py-2.5 min-h-[44px] rounded-lg border mb-4 touch-manipulation ${
                statusFilter !== "pending" ||
                fieldFilter !== "all" ||
                sortBy !== "date" ||
                sortOrder !== "desc"
                  ? "bg-[#107c10]/15 border-[#107c10]/40 text-[rgb(var(--text-primary))]"
                  : "bg-[rgb(var(--bg-card-alt))] border-[rgb(var(--border-color))] text-[rgb(var(--text-primary))]"
              }`}
            >
              <FaFilter size={14} />
              <span>Filters & Sort</span>
              {(statusFilter !== "pending" ||
                fieldFilter !== "all" ||
                sortBy !== "date" ||
                sortOrder !== "desc") && (
                <span className="bg-[#107c10] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  On
                </span>
              )}
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
                  <SelectItem value="modified">Approved with edits</SelectItem>
                  <SelectItem value="superseded">Superseded</SelectItem>
                </SelectContent>
              </Select>

              {/* Field Filter */}
              <Select value={fieldFilter} onValueChange={setFieldFilter}>
                <SelectTrigger className="w-full md:w-auto min-w-[140px]">
                  <SelectValue placeholder="All Fields" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fields</SelectItem>
                  {CORRECTION_FIELDS.map((fieldKey) => (
                    <SelectItem key={fieldKey} value={fieldKey}>
                      {getFieldDisplayName(fieldKey)}
                    </SelectItem>
                  ))}
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
            {groupedCorrections.length !== 1 ? "s" : ""}
          </div>

          {/* Submissions List */}
          <div className="space-y-3 mb-6">
            {loading ? (
              <div className="bg-[rgb(var(--bg-card))] rounded-lg p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#107c10] mx-auto mb-4"></div>
                <p className="text-[rgb(var(--text-secondary))]">
                  Loading corrections...
                </p>
              </div>
            ) : paginatedCorrections.length === 0 ? (
              <DashboardEmptyState
                title={
                  debouncedSearchQuery
                    ? "No corrections found matching your search."
                    : statusFilter === "all"
                      ? "No corrections found."
                      : `No ${statusFilter} corrections.`
                }
                description={
                  debouncedSearchQuery
                    ? "Try different keywords or clear the search."
                    : statusFilter !== "all"
                      ? 'Try "All Statuses" to see other corrections.'
                      : undefined
                }
                onClearFilters={hasActiveFilters ? clearCorrectionFilters : undefined}
              />
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

          {/* Pagination */}
          {totalPages > 1 && (
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
              onVirusTotalScanSaved={applyVirusTotalScanToCorrection}
              onReview={async (action) => {
                // Refetch first so list and counts update before closing modal
                await fetchCorrections({ silent: true });
                window.dispatchEvent(new CustomEvent("correctionsUpdated"));
                const messages = {
                  approve: "Correction approved",
                  reject: "Correction rejected",
                  modify: "Correction modified",
                };
                showToast(messages[action], 3000, "success");
                setSelectedCorrection(null);
              }}
            />
          )}

          {/* Batch Review Modal */}
          {selectedBatch && (
            <BatchReviewModal
              corrections={selectedBatch}
              onClose={() => setSelectedBatch(null)}
              getFieldDisplayName={getFieldDisplayName}
              onVirusTotalScanSaved={applyVirusTotalScanToCorrection}
              onReview={async () => {
                await fetchCorrections({ silent: true });
                window.dispatchEvent(new CustomEvent("correctionsUpdated"));
                showToast("Corrections reviewed", 3000, "success");
                setSelectedBatch(null);
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
  const isSameAsCurrent = valuesAreEffectivelySame(
    correction.oldValue,
    correction.newValue
  );
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
                className="px-3 py-2 sm:py-1 min-h-[44px] sm:min-h-0 inline-flex items-center bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] text-sm rounded-lg whitespace-nowrap ml-2 cursor-not-allowed border border-[rgb(var(--border-color))]"
                title="You cannot review your own submissions"
              >
                Your Submission
              </div>
            ) : (
              <button
                onClick={onViewDetails}
                className="px-3 py-2 sm:py-1 min-h-[44px] sm:min-h-0 bg-[#107c10] hover:bg-[#0d6b0d] text-white text-sm rounded-lg transition-colors whitespace-nowrap ml-2 touch-manipulation"
              >
                Review
              </button>
            )}
          </>
        )}
        {correction.status !== "pending" && (
          <button
            onClick={onViewDetails}
            className="px-3 py-2 sm:py-1 min-h-[44px] sm:min-h-0 text-[#107c10] hover:text-[#0d6b0d] text-sm whitespace-nowrap ml-2 touch-manipulation"
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
          {getCorrectionStatusLabel(correction.status)}
        </span>
        <span className="px-2 py-1 rounded text-xs border bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30 inline-flex items-center gap-1">
          <FaEdit size={10} />
          {getFieldDisplayName(correction.field)}
        </span>
        {isSameAsCurrent && (
          <span
            className="px-2 py-1 rounded text-xs border bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30"
            title="Proposed value matches current after normalizing spaces/case"
          >
            No meaningful change
          </span>
        )}
        {(correction.field === "downloadLink" ||
          correction.field === "communityAlternativeDownloadLink") && (
          <DownloadLinkScanBadge scan={correction.virusTotalScan} />
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
          <SubmitterHoverLink
            userId={correction.submittedBy}
            name={correction.submittedByName}
          />
        </div>
        <span>•</span>
        <span>{formatReviewDateTime(correction.submittedAt)}</span>
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
                className="px-3 py-2 sm:py-1 min-h-[44px] sm:min-h-0 inline-flex items-center bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] text-sm rounded-lg whitespace-nowrap ml-2 cursor-not-allowed border border-[rgb(var(--border-color))]"
                title="You cannot review your own submissions"
              >
                Your Submission
              </div>
            ) : (
              <button
                onClick={onReviewBatch}
                className="px-3 py-2 sm:py-1 min-h-[44px] sm:min-h-0 bg-[#107c10] hover:bg-[#0d6b0d] text-white text-sm rounded-lg transition-colors whitespace-nowrap ml-2 touch-manipulation"
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
          <SubmitterHoverLink
            userId={firstCorrection.submittedBy}
            name={firstCorrection.submittedByName}
            className="text-sm font-medium text-[rgb(var(--text-primary))]"
          />
          <span className="text-xs text-[rgb(var(--text-muted))]">
            • {formatReviewDateTime(firstCorrection.submittedAt)}
          </span>
        </div>
        <div className="text-xs text-[rgb(var(--text-secondary))]">
          {corrections.length} correction{corrections.length > 1 ? "s" : ""}{" "}
          submitted within 10 minutes
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
        {corrections
          .filter(
            (c) =>
              c.field === "downloadLink" ||
              c.field === "communityAlternativeDownloadLink"
          )
          .map((c) => (
            <DownloadLinkScanBadge key={`vt-${c.id}`} scan={c.virusTotalScan} />
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

interface VirusTotalScanResult {
  url: string;
  malicious: number;
  harmless: number;
  suspicious: number;
  total: number;
  reportUrl?: string;
  scannedAt?: string;
  source?: "submit" | "review";
}

function scanResultFromCorrection(
  url: string,
  correction: Pick<Correction, "virusTotalScan" | "autoVirusTotalUrl">
): VirusTotalScanResult | null {
  const saved = correction.virusTotalScan;
  if (saved?.reportUrl) {
    return {
      url,
      malicious: saved.malicious || 0,
      harmless: saved.harmless || 0,
      suspicious: saved.suspicious || 0,
      total: saved.total || 0,
      reportUrl: saved.reportUrl,
      scannedAt: saved.scannedAt
        ? new Date(saved.scannedAt).toISOString()
        : undefined,
      source: saved.source,
    };
  }
  if (correction.autoVirusTotalUrl) {
    return {
      url,
      malicious: 0,
      harmless: 0,
      suspicious: 0,
      total: 0,
      reportUrl: correction.autoVirusTotalUrl,
      source: "submit",
    };
  }
  return null;
}

function VirusTotalScanPanel({
  url,
  correctionId,
  csrfToken,
  scanningUrl,
  setScanningUrl,
  scanResult,
  setScanResult,
  setError,
  onScanPersisted,
}: {
  url: string;
  correctionId?: string;
  csrfToken: string | null;
  scanningUrl: string | null;
  setScanningUrl: (url: string | null) => void;
  scanResult: VirusTotalScanResult | null;
  setScanResult: (result: VirusTotalScanResult | null) => void;
  setError: (error: string) => void;
  onScanPersisted?: (scan: NonNullable<Correction["virusTotalScan"]>) => void;
}) {
  const activeResult =
    scanResult && scanResult.url === url ? scanResult : null;
  const flagged = activeResult
    ? activeResult.malicious + activeResult.suspicious
    : 0;
  const isClean = flagged === 0;
  const hasEngineCounts = Boolean(activeResult && activeResult.total > 0);

  const runScan = async () => {
    setScanningUrl(url);
    try {
      const response = await fetch("/api/virustotal/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        body: JSON.stringify({
          url,
          action: "scan",
          ...(correctionId ? { correctionId } : {}),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to scan URL");
        return;
      }

      const scanData = await response.json();
      const persisted = scanData.virusTotalScan as
        | Correction["virusTotalScan"]
        | undefined;

      if (persisted?.reportUrl) {
        const next: VirusTotalScanResult = {
          url,
          malicious: persisted.malicious || 0,
          harmless: persisted.harmless || 0,
          suspicious: persisted.suspicious || 0,
          total: persisted.total || 0,
          reportUrl: persisted.reportUrl,
          scannedAt: persisted.scannedAt
            ? new Date(persisted.scannedAt).toISOString()
            : new Date().toISOString(),
          source: persisted.source || "review",
        };
        setScanResult(next);
        onScanPersisted?.(persisted);
        return;
      }

      if (scanData.report?.data?.attributes) {
        const attrs = scanData.report.data.attributes;
        const stats = attrs.last_analysis_stats || attrs.stats;

        if (!stats) {
          setError(
            "Scan results are not yet available. Please try again in a moment."
          );
          return;
        }

        const rawId =
          typeof scanData.report?.data?.id === "string"
            ? scanData.report.data.id
            : "";
        let reportId = /^[a-f0-9]{64}$/i.test(rawId) ? rawId : "";
        if (!reportId) {
          const digest = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(url.trim())
          );
          reportId = Array.from(new Uint8Array(digest))
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
        }
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
          reportUrl: `https://www.virustotal.com/gui/url/${reportId}/detection`,
          scannedAt: new Date().toISOString(),
          source: "review",
        });
      } else if (scanData.analysisId) {
        setError(
          "Scan submitted but results not yet available. Please try again in a moment."
        );
      } else {
        setError("Unexpected response format from VirusTotal API");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan URL");
    } finally {
      setScanningUrl(null);
    }
  };

  return (
    <div className="pt-2 border-t border-[rgb(var(--border-color))]">
      <div className="flex items-center gap-2 mb-2">
        <FaShieldAlt className="text-blue-400" size={16} />
        <span className="text-sm font-medium text-[rgb(var(--text-primary))]">
          VirusTotal Security Scan
        </span>
      </div>
      {scanningUrl === url ? (
        <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]">
          <FaSpinner className="animate-spin" size={14} />
          <span>Scanning URL...</span>
        </div>
      ) : activeResult ? (
        <div
          className={`p-3 bg-[rgb(var(--bg-card-alt))] rounded-lg border-l-4 space-y-2 ${
            hasEngineCounts
              ? isClean
                ? "border-green-500"
                : "border-red-500"
              : "border-blue-500"
          }`}
        >
          <div className="space-y-1 text-sm">
            {hasEngineCounts ? (
              <>
                <p
                  className={`font-semibold ${
                    isClean ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {isClean
                    ? "No threats detected"
                    : `${flagged} of ${activeResult.total} engines flagged this URL`}
                </p>
                <p className="text-xs text-[rgb(var(--text-muted))]">
                  {activeResult.malicious} malicious ·{" "}
                  {activeResult.suspicious} suspicious
                  {activeResult.total > 0
                    ? ` · ${activeResult.total} engines checked`
                    : ""}
                </p>
              </>
            ) : (
              <p className="font-semibold text-blue-300">
                VirusTotal report already linked
              </p>
            )}
            {activeResult.scannedAt && (
              <p className="text-xs text-[rgb(var(--text-muted))]">
                Saved{" "}
                {formatReviewDateTime(activeResult.scannedAt)}
                {activeResult.source === "submit"
                  ? " (at submit)"
                  : activeResult.source === "review"
                    ? " (by reviewer)"
                    : ""}
              </p>
            )}
          </div>
          <div className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-500/30 rounded p-2">
            VirusTotal results are not a guarantee of safety. Proceed with
            caution.
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {activeResult.reportUrl && (
              <a
                href={activeResult.reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 underline inline-block"
              >
                View full report on VirusTotal →
              </a>
            )}
            <button
              type="button"
              onClick={runScan}
              className="text-xs text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] underline"
            >
              {hasEngineCounts ? "Rescan" : "Load engine results"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={runScan}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
        >
          <FaShieldAlt size={12} />
          Scan URL with VirusTotal
        </button>
      )}
    </div>
  );
}

// Review Modal Component
interface ReviewModalProps {
  correction: Correction;
  onClose: () => void;
  getFieldDisplayName: (field: string) => string;
  onVirusTotalScanSaved?: (
    correctionId: string,
    scan: NonNullable<Correction["virusTotalScan"]>
  ) => void;
  onReview: (action: "approve" | "reject" | "modify") => void | Promise<void>;
}

function ReviewModal({
  correction,
  onClose,
  getFieldDisplayName,
  onVirusTotalScanSaved,
  onReview,
}: ReviewModalProps) {
  const { csrfToken } = useCSRF();
  const isSameAsCurrent = valuesAreEffectivelySame(
    correction.oldValue,
    correction.newValue
  );
  const [reviewNotes, setReviewNotes] = useState("");
  const [modifiedValue, setModifiedValue] = useState(
    typeof correction.newValue === "string" &&
      !correction.newValue.startsWith("[")
      ? correction.newValue
      : JSON.stringify(correction.newValue, null, 2)
  );
  const [showModify, setShowModify] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [staleBase, setStaleBase] = useState(false);
  const [scanningUrl, setScanningUrl] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const initialModifiedValue = useRef(modifiedValue);
  const [scanResult, setScanResult] = useState<VirusTotalScanResult | null>(
    () =>
      typeof correction.newValue === "string"
        ? scanResultFromCorrection(correction.newValue, correction)
        : null
  );

  const isDirty =
    reviewNotes.trim() !== "" ||
    showModify ||
    modifiedValue !== initialModifiedValue.current;

  const requestClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }, [isDirty, onClose]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();
    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
          return;
        }
        requestClose();
        return;
      }
      if (event.key !== "Tab" || !modalRef.current) return;
      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [requestClose, showDiscardConfirm]);

  useEffect(() => {
    if (typeof correction.newValue === "string") {
      setScanResult(scanResultFromCorrection(correction.newValue, correction));
    } else {
      setScanResult(null);
    }
  }, [correction]);

  useEffect(() => {
    let cancelled = false;
    const checkStaleBase = async () => {
      try {
        const response = await fetch(
          `/api/games/${encodeURIComponent(correction.gameSlug)}`,
          { cache: "no-store" }
        );
        if (!response.ok || cancelled) return;
        const game = await response.json();
        const liveValue = game?.[correction.field];
        if (
          !cancelled &&
          !valuesAreEffectivelySame(liveValue, correction.oldValue)
        ) {
          setStaleBase(true);
        }
      } catch {
        // Non-blocking: review can proceed without live comparison
      }
    };
    checkStaleBase();
    return () => {
      cancelled = true;
    };
  }, [correction.gameSlug, correction.field, correction.oldValue]);

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
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to approve correction");
      }

      await onReview("approve");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!reviewNotes.trim()) {
      setError("Please add review notes explaining why this was rejected.");
      return;
    }

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
          reviewNotes: reviewNotes.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to reject correction");
      }

      await onReview("reject");
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

      await onReview("modify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to modify");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/75 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        className="bg-[rgb(var(--bg-card))] rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 bg-[rgb(var(--bg-card))] border-b border-[rgb(var(--border-color))] p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="review-modal-title"
                className="text-lg sm:text-xl font-bold text-[rgb(var(--text-primary))] mb-1"
              >
                Review Submission
              </h2>
              <p className="text-[rgb(var(--text-secondary))] text-sm truncate">
                {correction.gameTitle}
              </p>
            </div>
            <button
              onClick={requestClose}
              className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] text-2xl min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
              aria-label="Close"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
          {isSameAsCurrent && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-500/30 rounded-lg p-3">
              <p className="text-amber-800 dark:text-amber-300 text-sm">
                No meaningful change. Proposed value matches current after
                normalizing spaces and case.
              </p>
            </div>
          )}
          {staleBase && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-500/30 rounded-lg p-3">
              <p className="text-orange-800 dark:text-orange-300 text-sm">
                The live page value for this field has changed since this
                correction was submitted. Review carefully before applying.
              </p>
            </div>
          )}
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
            <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3 flex items-center justify-between gap-3">
              <SubmitterHoverLink
                userId={correction.submittedBy}
                name={correction.submittedByName}
                className="text-[rgb(var(--text-primary))]"
              />
              <span className="text-[rgb(var(--text-muted))] text-sm shrink-0">
                {formatReviewDateTime(correction.submittedAt)}
              </span>
            </div>
          </div>

          <CorrectionValueDiff
            oldValue={correction.oldValue}
            newValue={correction.newValue}
          />

          {correction.field === "imageUrl" && (
            <div className="grid md:grid-cols-2 gap-4">
              {typeof correction.oldValue === "string" &&
                correction.oldValue && (
                  <ImagePreview
                    imageUrl={correction.oldValue}
                    label="Current image"
                  />
                )}
              {typeof correction.newValue === "string" &&
                correction.newValue && (
                  <ImagePreview
                    imageUrl={correction.newValue}
                    label="Proposed image"
                  />
                )}
            </div>
          )}

          {(correction.field === "downloadLink" ||
            correction.field === "communityAlternativeDownloadLink") &&
            typeof correction.newValue === "string" &&
            correction.newValue &&
            (correction.newValue.startsWith("http://") ||
              correction.newValue.startsWith("https://")) && (
              <VirusTotalScanPanel
                url={correction.newValue}
                correctionId={correction.id}
                csrfToken={csrfToken}
                scanningUrl={scanningUrl}
                setScanningUrl={setScanningUrl}
                scanResult={scanResult}
                setScanResult={setScanResult}
                setError={setError}
                onScanPersisted={(scan) => {
                  setScanResult(
                    scanResultFromCorrection(correction.newValue as string, {
                      virusTotalScan: scan,
                      autoVirusTotalUrl: scan.reportUrl,
                    })
                  );
                  onVirusTotalScanSaved?.(correction.id, scan);
                }}
              />
            )}

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
              Review notes{" "}
              <span className="text-red-400">(required to reject)</span>
            </h3>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add notes about your decision. Required when rejecting."
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
          <div className="shrink-0 bg-[rgb(var(--bg-card))] border-t border-[rgb(var(--border-color))] p-4 sm:p-6 space-y-3">
            {!showModify && (
              <button
                onClick={() => setShowModify(true)}
                className="w-full min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors touch-manipulation"
              >
                Modify Value
              </button>
            )}
            <div className="flex flex-col-reverse sm:grid sm:grid-cols-2 gap-3">
              <button
                onClick={handleReject}
                disabled={isSubmitting}
                className="min-h-[44px] px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                <FaTimes />
                {isSubmitting ? "Processing..." : "Reject"}
              </button>
              <button
                onClick={showModify ? handleModify : handleApprove}
                disabled={isSubmitting}
                className="min-h-[44px] px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                <FaCheck />
                {isSubmitting
                  ? "Processing..."
                  : showModify
                  ? "Approve Edited"
                  : "Approve"}
              </button>
            </div>
          </div>
        )}

        {/* Footer - Reviewed */}
        {correction.status !== "pending" && (
          <div className="shrink-0 bg-[rgb(var(--bg-card))] border-t border-[rgb(var(--border-color))] p-4 sm:p-6">
            <div className="mb-4 p-3 bg-[rgb(var(--bg-card-alt))] rounded-lg">
              <p className="text-sm text-[rgb(var(--text-muted))] mb-1">
                Reviewed by
              </p>
              <p className="text-[rgb(var(--text-primary))]">
                {correction.reviewedByName}
              </p>
              <p className="text-[rgb(var(--text-muted))] text-xs mt-1">
                {correction.reviewedAt &&
                  formatReviewDateTime(correction.reviewedAt)}
              </p>
              {correction.reviewNotes && (
                <p className="text-[rgb(var(--text-secondary))] text-sm mt-2">
                  {correction.reviewNotes}
                </p>
              )}
            </div>
            <button
              onClick={requestClose}
              className="w-full min-h-[44px] px-4 py-2 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] rounded-lg transition-colors border border-[rgb(var(--border-color))] touch-manipulation"
            >
              Close
            </button>
          </div>
        )}
      </div>
      <ConfirmDialog
        isOpen={showDiscardConfirm}
        title="Discard review?"
        message="You have unsaved review notes or changes. Close anyway?"
        confirmText="Discard"
        cancelText="Keep editing"
        variant="warning"
        onConfirm={onClose}
        onCancel={() => setShowDiscardConfirm(false)}
      />
    </div>
  );
}

// Batch Review Modal Component
interface BatchReviewModalProps {
  corrections: Correction[];
  onClose: () => void;
  getFieldDisplayName: (field: string) => string;
  onVirusTotalScanSaved?: (
    correctionId: string,
    scan: NonNullable<Correction["virusTotalScan"]>
  ) => void;
  onReview: () => void;
}

function BatchReviewModal({
  corrections,
  onClose,
  getFieldDisplayName,
  onVirusTotalScanSaved,
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
  const [partialResultMessage, setPartialResultMessage] = useState("");
  const [scanningUrl, setScanningUrl] = useState<string | null>(null);
  const [scanResultsByCorrection, setScanResultsByCorrection] = useState<
    Map<string, VirusTotalScanResult | null>
  >(new Map());
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const isDirty =
    batchNotes.trim() !== "" ||
    Array.from(reviewStates.values()).some(
      (state) => state.action !== "pending" || Boolean(state.reviewNotes?.trim())
    );

  const requestClose = useCallback(() => {
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }, [isDirty, onClose]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
          return;
        }
        requestClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [requestClose, showDiscardConfirm]);

  useEffect(() => {
    const states = new Map();
    const scans = new Map<string, VirusTotalScanResult | null>();
    corrections.forEach((correction) => {
      states.set(correction.id, {
        action: "pending" as const,
        modifiedValue:
          typeof correction.newValue === "string" &&
          !String(correction.newValue).startsWith("[")
            ? String(correction.newValue)
            : JSON.stringify(correction.newValue, null, 2),
      });
      scans.set(
        correction.id,
        typeof correction.newValue === "string"
          ? scanResultFromCorrection(correction.newValue, correction)
          : null
      );
    });
    setReviewStates(states);
    setScanResultsByCorrection(scans);
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
    const label = action === "approve" ? "approve" : "reject";
    const confirmed = window.confirm(
      `This will immediately ${label} all ${corrections.length} corrections. Continue?`
    );
    if (!confirmed) return;

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

    setIsSubmitting(true);
    setError("");
    setPartialResultMessage("");

    try {
      if (!csrfToken) {
        setError("Security token not ready. Please wait...");
        setIsSubmitting(false);
        return;
      }

      if (action === "reject" && !batchNotes.trim()) {
        const hasAnyNotes = Array.from(reviewStates.values()).some((s) =>
          s.reviewNotes?.trim()
        );
        if (!hasAnyNotes) {
          setError(
            "Add batch review notes before rejecting all (submitters need an explanation)."
          );
          setIsSubmitting(false);
          return;
        }
      }

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

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit batch reviews");
      }

      if (
        typeof data.processed === "number" &&
        typeof data.total === "number" &&
        data.processed < data.total
      ) {
        setPartialResultMessage(
          `Processed ${data.processed} of ${data.total} reviews.`
        );
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
    setPartialResultMessage("");

    try {
      if (!csrfToken) {
        setError("Security token not ready. Please wait...");
        setIsSubmitting(false);
        return;
      }

      const hasPending = Array.from(reviewStates.values()).some(
        (state) => state.action === "pending"
      );
      if (hasPending) {
        setError("Please review all corrections before submitting.");
        setIsSubmitting(false);
        return;
      }

      const missingRejectNotes = corrections.some((correction) => {
        const state = reviewStates.get(correction.id);
        return (
          state?.action === "reject" &&
          !state.reviewNotes?.trim() &&
          !batchNotes.trim()
        );
      });
      if (missingRejectNotes) {
        setError(
          "Add review notes for rejected items (batch notes or per-item notes)."
        );
        setIsSubmitting(false);
        return;
      }

      const reviews = corrections
        .map((correction) => {
          const state = reviewStates.get(correction.id);
          if (!state || state.action === "pending") {
            return null;
          }

          let parsedFinalValue: unknown = undefined;
          if (state.action === "modify" && state.modifiedValue) {
            try {
              parsedFinalValue = JSON.parse(state.modifiedValue);
            } catch {
              parsedFinalValue = state.modifiedValue;
            }
          }

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

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit batch reviews");
      }

      if (
        typeof data.processed === "number" &&
        typeof data.total === "number" &&
        data.processed < data.total
      ) {
        window.alert(
          `Partial success: processed ${data.processed} of ${data.total} reviews.`
        );
      }

      onReview();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit reviews");
    } finally {
      setIsSubmitting(false);
    }
  };

  const firstCorrection = corrections[0];
  const allReviewed = Array.from(reviewStates.values()).every(
    (state) => state.action !== "pending"
  );

  return (
    <div
      className="fixed inset-0 bg-black/40 dark:bg-black/70 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto"
      onClick={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
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
              from{" "}
              <SubmitterHoverLink
                userId={firstCorrection.submittedBy}
                name={firstCorrection.submittedByName}
              />
            </p>
          </div>
          <button
            onClick={requestClose}
            className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors flex-shrink-0 self-start sm:self-auto"
            aria-label="Close modal"
          >
            <FaTimes size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6 pb-24">
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

                  <div className="mb-4">
                    <CorrectionValueDiff
                      oldValue={correction.oldValue}
                      newValue={correction.newValue}
                    />
                  </div>

                  {(correction.field === "downloadLink" ||
                    correction.field ===
                      "communityAlternativeDownloadLink") &&
                    typeof correction.newValue === "string" &&
                    correction.newValue &&
                    (correction.newValue.startsWith("http://") ||
                      correction.newValue.startsWith("https://")) && (
                      <div className="mb-4">
                        <VirusTotalScanPanel
                          url={correction.newValue}
                          correctionId={correction.id}
                          csrfToken={csrfToken}
                          scanningUrl={scanningUrl}
                          setScanningUrl={setScanningUrl}
                          scanResult={
                            scanResultsByCorrection.get(correction.id) || null
                          }
                          setScanResult={(result) => {
                            setScanResultsByCorrection((prev) => {
                              const next = new Map(prev);
                              next.set(correction.id, result);
                              return next;
                            });
                          }}
                          setError={setError}
                          onScanPersisted={(scan) => {
                            const downloadUrl = String(correction.newValue);
                            setScanResultsByCorrection((prev) => {
                              const next = new Map(prev);
                              next.set(
                                correction.id,
                                scanResultFromCorrection(downloadUrl, {
                                  virusTotalScan: scan,
                                  autoVirusTotalUrl: scan.reportUrl,
                                })
                              );
                              return next;
                            });
                            onVirusTotalScanSaved?.(correction.id, scan);
                          }}
                        />
                      </div>
                    )}

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

          {/* Bulk shortcuts — below the list so thumbs hit per-item review first */}
          <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-4 border border-dashed border-[rgb(var(--border-color))]">
            <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))] mb-1">
              Or apply to entire batch
            </h3>
            <p className="text-xs text-[rgb(var(--text-muted))] mb-3">
              These run immediately after confirmation. Prefer reviewing items
              above when decisions differ.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setAllActions("approve")}
                disabled={isSubmitting}
                className="min-h-[44px] px-4 py-2 border border-green-600/50 text-green-500 hover:bg-green-600/10 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
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
                className="min-h-[44px] px-4 py-2 border border-red-600/50 text-red-400 hover:bg-red-600/10 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
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
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400">
              {error}
            </div>
          )}
          {partialResultMessage && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4 text-amber-300 text-sm">
              {partialResultMessage}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-[rgb(var(--bg-card))] border-t border-[rgb(var(--border-color))] p-4 sm:p-6 flex flex-col sm:flex-row gap-3">
          {allReviewed && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 min-h-[44px] px-6 py-3 bg-[#107c10] hover:bg-[#0d6b0d] text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation"
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <FaCheck />
                  Submit all reviews
                </>
              )}
            </button>
          )}
          <button
            onClick={requestClose}
            className={`px-6 py-3 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] rounded-lg transition-colors border border-[rgb(var(--border-color))] ${
              allReviewed ? "flex-1" : "w-full"
            }`}
          >
            {isSubmitting ? "Processing..." : "Close"}
          </button>
        </div>
      </div>
      <ConfirmDialog
        isOpen={showDiscardConfirm}
        title="Discard batch review?"
        message="You have unsaved review decisions or notes. Close anyway?"
        confirmText="Discard"
        cancelText="Keep editing"
        variant="warning"
        onConfirm={onClose}
        onCancel={() => setShowDiscardConfirm(false)}
      />
    </div>
  );
}
