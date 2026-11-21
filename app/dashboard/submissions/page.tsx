"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  FaSearch,
  FaEdit,
  FaCheck,
  FaTimes,
  FaSortAmountDown,
  FaSortAmountUp,
  FaUser,
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
import VirusTotalScanPanel, {
  scanResultFromSaved,
  type VirusTotalScanResult,
} from "@/components/VirusTotalScanPanel";
import SubmitterHoverLink from "@/components/SubmitterHoverLink";
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

  const filtersActive =
    statusFilter !== "pending" ||
    fieldFilter !== "all" ||
    sortBy !== "date" ||
    sortOrder !== "desc";

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

          <DashboardToolbar
            filtersOpen={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            filtersActive={filtersActive}
            search={
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[rgb(var(--text-muted))]" />
                <input
                  type="text"
                  placeholder="Search by game, user, or field..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[rgb(var(--color-primary))] focus:outline-none"
                />
              </div>
            }
            filters={
              <>
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
                <button
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
                  className="w-full md:w-auto px-4 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:border-[rgb(var(--color-primary))] transition-colors flex items-center justify-center gap-2"
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
              </>
            }
            chips={
              filtersActive || searchQuery || userIdFilter ? (
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
                  {fieldFilter !== "all" && (
                    <FilterChip
                      label={getFieldDisplayName(fieldFilter)}
                      onClear={() => setFieldFilter("all")}
                    />
                  )}
                  {userIdFilter && (
                    <FilterChip
                      label={`User: ${userFilterDisplayName || userNameFilter || "selected"}`}
                      onClear={() => {
                        setUserIdFilter(null);
                        setUserNameFilter(null);
                      }}
                    />
                  )}
                </>
              ) : undefined
            }
          />

          <QueueCounts
            items={[
              { label: "Total", value: corrections.length },
              {
                label: "Pending",
                value: corrections.filter((c) => c.status === "pending").length,
                tone: "warning",
              },
              {
                label: "Approved",
                value: corrections.filter((c) => c.status === "approved").length,
                tone: "success",
              },
              {
                label: "Rejected",
                value: corrections.filter((c) => c.status === "rejected").length,
                tone: "danger",
              },
              {
                label: "Superseded",
                value: corrections.filter((c) => c.status === "superseded")
                  .length,
                description:
                  "A newer correction for the same field replaced this one before it was reviewed.",
              },
            ]}
          />

          {/* Results Count */}
          <div className="text-[rgb(var(--text-secondary))] text-sm mb-4">
            Showing {startIndex + 1}-
            {Math.min(endIndex, groupedCorrections.length)} of{" "}
            {groupedCorrections.length} item
            {groupedCorrections.length !== 1 ? "s" : ""}
          </div>

          {/* Submissions List */}
          <div className="mb-6">
            {loading ? (
              <div className="dashboard-surface p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(var(--color-primary))] mx-auto mb-4"></div>
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
              <div className="dashboard-inbox">
                {paginatedCorrections.map((item, index) => {
                  interface SessionUser {
                    isDeveloper?: boolean;
                  }
                  const isDeveloper =
                    (session?.user as SessionUser)?.isDeveloper === true;

                  if (Array.isArray(item)) {
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
                  }

                  return (
                    <CorrectionCard
                      key={item.id}
                      correction={item}
                      getFieldDisplayName={getFieldDisplayName}
                      onViewDetails={() => setSelectedCorrection(item)}
                      currentUserId={session?.user?.id}
                      isDeveloper={isDeveloper}
                    />
                  );
                })}
              </div>
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
            <CorrectionReviewModal
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
  onViewDetails: () => void;
  currentUserId?: string;
  isDeveloper?: boolean;
}

function formatCorrectionValue(
  value: string | number | boolean | string[] | null,
  isNewValue = false
) {
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
}

function CorrectionCard({
  correction,
  getFieldDisplayName,
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

  return (
    <div className="dashboard-inbox-row">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Link
              href={`/games/${correction.gameSlug}`}
              className="text-[rgb(var(--text-primary))] font-medium truncate hover:text-[rgb(var(--color-primary))]"
            >
              {correction.gameTitle}
            </Link>
            <StatusPill status={correction.status}>
              {getCorrectionStatusLabel(correction.status)}
            </StatusPill>
            <span className="status-pill status-pill-neutral inline-flex items-center gap-1">
              <FaEdit size={10} />
              {getFieldDisplayName(correction.field)}
            </span>
            {isSameAsCurrent && (
              <span
                className="status-pill status-pill-pending"
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
          <p className="text-sm text-[rgb(var(--text-secondary))] line-clamp-1">
            <span className="text-[rgb(var(--text-muted))]">
              {formatCorrectionValue(correction.oldValue)}
            </span>
            {" → "}
            <span className="text-[rgb(var(--color-primary))]">
              {formatCorrectionValue(correction.newValue, true)}
            </span>
          </p>
          {correction.reason && (
            <p className="text-xs text-[rgb(var(--text-muted))] line-clamp-1 mt-0.5">
              {correction.reason}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[rgb(var(--text-muted))]">
            <FaUser size={10} />
            <SubmitterHoverLink
              userId={correction.submittedBy}
              name={correction.submittedByName}
            />
            <span>·</span>
            <span>{formatReviewDateTime(correction.submittedAt)}</span>
          </div>
        </div>
        {correction.status === "pending" ? (
          isOwnSubmission ? (
            <div
              className="px-3 py-2 sm:py-1 min-h-[44px] sm:min-h-0 inline-flex items-center bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] text-sm rounded-lg whitespace-nowrap cursor-not-allowed border border-[rgb(var(--border-color))]"
              title="You cannot review your own submissions"
            >
              Yours
            </div>
          ) : (
            <button
              onClick={onViewDetails}
              className="px-3 py-2 sm:py-1 min-h-[44px] sm:min-h-0 bg-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary-hover))] text-white text-sm rounded-lg whitespace-nowrap touch-manipulation"
            >
              Review
            </button>
          )
        ) : (
          <button
            onClick={onViewDetails}
            className="px-3 py-2 sm:py-1 min-h-[44px] sm:min-h-0 text-[rgb(var(--color-primary))] text-sm whitespace-nowrap touch-manipulation"
          >
            View
          </button>
        )}
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
    <div className="dashboard-inbox-row">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Link
              href={`/games/${firstCorrection.gameSlug}`}
              className="text-[rgb(var(--text-primary))] font-medium truncate hover:text-[rgb(var(--color-primary))]"
            >
              {firstCorrection.gameTitle}
            </Link>
            <StatusPill status="pending" />
            <span className="status-pill status-pill-approved">
              Batch ({corrections.length})
            </span>
            {uniqueFields.map((field) => (
              <span
                key={field}
                className="status-pill status-pill-neutral inline-flex items-center gap-1"
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
                <DownloadLinkScanBadge
                  key={`vt-${c.id}`}
                  scan={c.virusTotalScan}
                />
              ))}
          </div>
          <p className="text-sm text-[rgb(var(--text-secondary))] line-clamp-2">
            {corrections
              .slice(0, 3)
              .map(
                (correction) =>
                  `${getFieldDisplayName(correction.field)}: ${formatCorrectionValue(correction.oldValue)} → ${formatCorrectionValue(correction.newValue, true)}`
              )
              .join(" · ")}
            {corrections.length > 3
              ? ` · +${corrections.length - 3} more`
              : ""}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[rgb(var(--text-muted))]">
            <FaUser size={10} />
            <SubmitterHoverLink
              userId={firstCorrection.submittedBy}
              name={firstCorrection.submittedByName}
            />
            <span>·</span>
            <span>{formatReviewDateTime(firstCorrection.submittedAt)}</span>
          </div>
        </div>
        {firstCorrection.status === "pending" &&
          (isOwnSubmission ? (
            <div
              className="px-3 py-2 sm:py-1 min-h-[44px] sm:min-h-0 inline-flex items-center bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] text-sm rounded-lg whitespace-nowrap cursor-not-allowed border border-[rgb(var(--border-color))]"
              title="You cannot review your own submissions"
            >
              Yours
            </div>
          ) : (
            <button
              onClick={onReviewBatch}
              className="px-3 py-2 sm:py-1 min-h-[44px] sm:min-h-0 bg-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary-hover))] text-white text-sm rounded-lg whitespace-nowrap touch-manipulation"
            >
              Review
            </button>
          ))}
      </div>
    </div>
  );
}

function scanResultFromCorrection(
  url: string,
  correction: Pick<Correction, "virusTotalScan" | "autoVirusTotalUrl">
): VirusTotalScanResult | null {
  return scanResultFromSaved(
    url,
    correction.virusTotalScan,
    correction.autoVirusTotalUrl
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

function CorrectionReviewModal({
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

  const isDownloadField =
    (correction.field === "downloadLink" ||
      correction.field === "communityAlternativeDownloadLink") &&
    typeof correction.newValue === "string" &&
    /^https?:\/\//i.test(correction.newValue);

  return (
    <>
      <ReviewModal
        isOpen
        onClose={requestClose}
        closeOnEscape={!showDiscardConfirm}
        title={correction.gameTitle}
        titleId="review-modal-title"
        status={correction.status}
        submittedBy={
          <SubmitterHoverLink
            userId={correction.submittedBy}
            name={correction.submittedByName}
            className="text-[rgb(var(--text-secondary))]"
          />
        }
        submittedAt={correction.submittedAt}
        descriptionId="review-modal-description"
        notes={
          correction.status === "pending" ? (
            <>
              {error ? (
                <p className="text-sm text-[rgb(var(--color-danger))]">
                  {error}
                </p>
              ) : null}
              <label
                htmlFor="correction-review-notes"
                className="text-xs font-medium text-[rgb(var(--text-secondary))]"
              >
                Review notes{" "}
                <span className="text-[rgb(var(--text-muted))]">
                  (required to reject)
                </span>
              </label>
              <textarea
                id="correction-review-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add notes about your decision"
                className="w-full p-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[rgb(var(--color-primary))] focus:outline-none text-sm"
                rows={4}
              />
            </>
          ) : (
            <div className="text-sm space-y-1">
              <p className="text-[rgb(var(--text-muted))]">
                Reviewed by {correction.reviewedByName}
              </p>
              {correction.reviewedAt ? (
                <p className="text-xs text-[rgb(var(--text-muted))]">
                  {formatReviewDateTime(correction.reviewedAt)}
                </p>
              ) : null}
              {correction.reviewNotes ? (
                <p className="text-[rgb(var(--text-secondary))]">
                  {correction.reviewNotes}
                </p>
              ) : null}
            </div>
          )
        }
        actions={
          correction.status === "pending" ? (
            <>
              {!showModify ? (
                <ReviewGhostButton onClick={() => setShowModify(true)}>
                  Modify value
                </ReviewGhostButton>
              ) : null}
              <ReviewApproveButton
                onClick={showModify ? handleModify : handleApprove}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Processing…"
                  : showModify
                    ? "Approve edited"
                    : "Approve"}
              </ReviewApproveButton>
              <ReviewRejectButton
                onClick={handleReject}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing…" : "Reject"}
              </ReviewRejectButton>
            </>
          ) : (
            <ReviewGhostButton onClick={requestClose}>Close</ReviewGhostButton>
          )
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium text-[rgb(var(--text-primary))]">
              {getFieldDisplayName(correction.field)}
            </h3>
            {isSameAsCurrent ? (
              <StatusPill status="neutral" label="Unchanged" />
            ) : null}
            {staleBase ? (
              <StatusPill status="pending" label="Live value changed" />
            ) : null}
          </div>
          {isSameAsCurrent ? (
            <p className="text-sm text-[rgb(var(--text-secondary))]">
              Proposed value matches current after normalizing spaces and case.
            </p>
          ) : null}
          {staleBase ? (
            <p className="text-sm text-[rgb(var(--text-secondary))]">
              The live page value for this field has changed since this
              correction was submitted.
            </p>
          ) : null}

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

          {isDownloadField ? (
            <DownloadLinkReview url={correction.newValue as string}>
              <VirusTotalScanPanel
                url={correction.newValue as string}
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
            </DownloadLinkReview>
          ) : null}

          {correction.reason ? (
            <div className="review-field">
              <h3 className="text-sm font-medium text-[rgb(var(--text-primary))] mb-2">
                Reason
              </h3>
              <p className="text-sm text-[rgb(var(--text-secondary))] whitespace-pre-wrap">
                {correction.reason}
              </p>
            </div>
          ) : null}

          {showModify ? (
            <div className="review-field">
              <label
                htmlFor="correction-modified-value"
                className="text-sm font-medium text-[rgb(var(--text-primary))] mb-2 block"
              >
                Modified value
              </label>
              <textarea
                id="correction-modified-value"
                value={modifiedValue}
                onChange={(e) => setModifiedValue(e.target.value)}
                className="w-full p-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[rgb(var(--color-primary))] focus:outline-none font-mono text-sm"
                rows={6}
              />
            </div>
          ) : null}
        </div>
      </ReviewModal>
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
    </>
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
    <>
      <ReviewModal
        isOpen
        onClose={requestClose}
        closeOnEscape={!showDiscardConfirm}
        title={firstCorrection.gameTitle}
        submittedBy={
          <>
            {corrections.length} correction
            {corrections.length > 1 ? "s" : ""} from{" "}
            <SubmitterHoverLink
              userId={firstCorrection.submittedBy}
              name={firstCorrection.submittedByName}
              className="text-[rgb(var(--text-secondary))]"
            />
          </>
        }
        submittedAt={firstCorrection.submittedAt}
        maxWidthClass="max-w-6xl"
        notes={
          <>
            {error ? (
              <p className="text-sm text-[rgb(var(--color-danger))]">{error}</p>
            ) : null}
            {partialResultMessage ? (
              <p className="text-sm text-[rgb(var(--text-secondary))]">
                {partialResultMessage}
              </p>
            ) : null}
            <label
              htmlFor="batch-review-notes"
              className="text-xs font-medium text-[rgb(var(--text-secondary))]"
            >
              Batch notes{" "}
              <span className="text-[rgb(var(--text-muted))]">(optional)</span>
            </label>
            <textarea
              id="batch-review-notes"
              value={batchNotes}
              onChange={(e) => setBatchNotes(e.target.value)}
              placeholder="Applies to every item unless an item has its own notes"
              className="w-full px-3 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[rgb(var(--color-primary))] focus:outline-none resize-none text-sm"
              rows={4}
            />
            {!allReviewed ? (
              <p className="text-xs text-[rgb(var(--text-muted))]">
                Choose approve, reject, or modify on each item to submit.
              </p>
            ) : null}
          </>
        }
        actions={
          <>
            {allReviewed ? (
              <ReviewApproveButton
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting…" : "Submit all reviews"}
              </ReviewApproveButton>
            ) : null}
            <ReviewGhostButton onClick={requestClose} disabled={isSubmitting}>
              Close
            </ReviewGhostButton>
          </>
        }
      >
        <div className="space-y-6">
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
                        type="button"
                        onClick={() =>
                          updateReviewState(correction.id, {
                            action:
                              state.action === "approve"
                                ? "pending"
                                : "approve",
                          })
                        }
                        className={`review-btn flex-1 !w-auto min-w-[6.5rem] ${
                          state.action === "approve"
                            ? "review-btn-primary"
                            : "review-btn-ghost"
                        }`}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateReviewState(correction.id, {
                            action:
                              state.action === "reject" ? "pending" : "reject",
                          })
                        }
                        className={`review-btn flex-1 !w-auto min-w-[6.5rem] ${
                          state.action === "reject"
                            ? "review-btn-danger"
                            : "review-btn-ghost"
                        }`}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (state.action === "modify") {
                            updateReviewState(correction.id, {
                              action: "pending",
                              modifiedValue: undefined,
                            });
                          } else {
                            updateReviewState(correction.id, {
                              action: "modify",
                            });
                          }
                        }}
                        className={`review-btn flex-1 !w-auto min-w-[6.5rem] ${
                          state.action === "modify"
                            ? "review-btn-primary"
                            : "review-btn-ghost"
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
                        <DownloadLinkReview url={correction.newValue}>
                          <VirusTotalScanPanel
                            url={correction.newValue}
                            correctionId={correction.id}
                            csrfToken={csrfToken}
                            scanningUrl={scanningUrl}
                            setScanningUrl={setScanningUrl}
                            scanResult={
                              scanResultsByCorrection.get(correction.id) ||
                              null
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
                        </DownloadLinkReview>
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
              <ReviewApproveButton
                onClick={() => setAllActions("approve")}
                disabled={isSubmitting}
                className="sm:flex-1"
              >
                {isSubmitting ? "Processing…" : "Approve all"}
              </ReviewApproveButton>
              <ReviewRejectButton
                onClick={() => setAllActions("reject")}
                disabled={isSubmitting}
                className="sm:flex-1"
              >
                {isSubmitting ? "Processing…" : "Reject all"}
              </ReviewRejectButton>
            </div>
          </div>
        </div>
      </ReviewModal>
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
    </>
  );
}
