"use client";

import { useState, useEffect, useMemo } from "react";
import {
  FaSearch,
  FaFilter,
  FaHistory,
  FaSortAmountDown,
  FaSortAmountUp,
  FaUserShield,
  FaUserCheck,
  FaUser,
  FaGamepad,
  FaSort,
  FaSortDown,
  FaSortUp,
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
import { safeLog } from "@/lib/security";
import { useDebounce } from "@/hooks/useDebounce";

interface AuditLog {
  id: string;
  gameId: string;
  gameSlug: string;
  gameTitle: string;
  field: string;
  oldValue: string | number | boolean | string[] | null;
  newValue: string | number | boolean | string[] | null;
  changedBy: string;
  changedByName: string;
  changedByRole: "user" | "reviewer" | "admin";
  changedAt: Date;
  correctionId?: string;
  notes?: string;
  submittedBy?: string;
  submittedByName?: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [fieldFilter, setFieldFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  // Role filter options: unique changedByRole values from loaded logs (admin, reviewer, user order)
  const roleOrder = ["admin", "reviewer", "user"];
  const roleFilterOptions = useMemo(() => {
    const seen = new Set<string>();
    logs.forEach((log) => {
      if (log.changedByRole) seen.add(log.changedByRole);
    });
    return Array.from(seen).sort(
      (a, b) => roleOrder.indexOf(a) - roleOrder.indexOf(b) || a.localeCompare(b)
    );
  }, [logs]);

  // Field filter options: unique fields from loaded logs, sorted (so filter stays in sync with data)
  const fieldFilterOptions = useMemo(() => {
    const seen = new Set<string>();
    logs.forEach((log) => {
      if (log.field) seen.add(log.field);
    });
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [logs]);

  const getRoleDisplayName = (role: string) =>
    role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

  // Reset role/field filter if selected value no longer exists in loaded data
  useEffect(() => {
    if (
      roleFilter !== "all" &&
      roleFilterOptions.length > 0 &&
      !roleFilterOptions.includes(roleFilter)
    ) {
      setRoleFilter("all");
    }
  }, [roleFilter, roleFilterOptions]);

  useEffect(() => {
    if (
      fieldFilter !== "all" &&
      fieldFilterOptions.length > 0 &&
      !fieldFilterOptions.includes(fieldFilter)
    ) {
      setFieldFilter("all");
    }
  }, [fieldFilter, fieldFilterOptions]);

  // Fetch real audit logs from API
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/audit-logs");
        if (response.ok) {
          const data = await response.json();
          setLogs(data.logs || []);
          setFilteredLogs(data.logs || []);
        } else {
          safeLog.error("Failed to fetch audit logs");
        }
      } catch (error) {
        safeLog.error("Error fetching audit logs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  // Filter and sort logs
  useEffect(() => {
    let filtered = [...logs];

    // Search filter (using debounced value)
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.gameTitle.toLowerCase().includes(q) ||
          log.changedByName.toLowerCase().includes(q) ||
          (log.submittedByName &&
            log.submittedByName.toLowerCase().includes(q)) ||
          log.field.toLowerCase().includes(q) ||
          (log.notes && log.notes.toLowerCase().includes(q))
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((log) => log.changedByRole === roleFilter);
    }

    // Field filter
    if (fieldFilter !== "all") {
      filtered = filtered.filter((log) => log.field === fieldFilter);
    }

    // Sort by selected column
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "game":
          comparison = a.gameTitle.localeCompare(b.gameTitle);
          break;
        case "field":
          comparison = a.field.localeCompare(b.field);
          break;
        case "submittedBy":
          const submittedA = a.submittedByName || "";
          const submittedB = b.submittedByName || "";
          comparison = submittedA.localeCompare(submittedB);
          break;
        case "approvedBy":
          comparison = a.changedByName.localeCompare(b.changedByName);
          break;
        case "date":
        default: {
          const timeA = new Date(a.changedAt).getTime();
          const timeB = new Date(b.changedAt).getTime();
          // asc = oldest first (smaller time first), desc = newest first (larger time first)
          return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
        }
      }

      return sortOrder === "asc" ? -comparison : comparison;
    });

    setFilteredLogs(filtered);
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [logs, debouncedSearchQuery, roleFilter, fieldFilter, sortBy, sortOrder]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <FaUserShield className="text-red-500" size={14} />;
      case "reviewer":
        return <FaUserCheck className="text-blue-500" size={14} />;
      default:
        return <FaUser className="text-[rgb(var(--text-muted))]" size={14} />;
    }
  };

  const formatValue = (value: string | number | boolean | string[] | null) => {
    if (value === null || value === undefined) return "N/A";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(date).toLocaleDateString(undefined, {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  return (
    <DashboardLayout requireRole="admin">
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
              Audit Log
            </h1>
            <p className="text-[rgb(var(--text-secondary))] text-sm md:text-base">
              Complete history of all changes made to game information
            </p>
          </div>

          {/* Search and Controls */}
          <div className="bg-[rgb(var(--bg-card))] rounded-lg p-4 mb-6">
            {/* Search Bar and Clear Filters - Large Screens */}
            <div className="hidden lg:flex gap-3 mb-4">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[rgb(var(--text-muted))]" />
                <input
                  type="text"
                  placeholder="Search by game, user, field, or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none"
                />
              </div>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setRoleFilter("all");
                  setFieldFilter("all");
                }}
                className="px-4 py-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:border-[#107c10] transition-colors whitespace-nowrap"
              >
                Clear Filters
              </button>
            </div>

            {/* Search Bar - Mobile/Tablet */}
            <div className="lg:hidden relative mb-4">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[rgb(var(--text-muted))]" />
              <input
                type="text"
                placeholder="Search by game, user, field, or notes..."
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
            <div className={`${showFilters ? "block" : "hidden"} md:block`}>
              {/* Filters Row - Large Screens */}
              <div className="hidden lg:flex items-center gap-3 mb-3">
                <span className="text-[rgb(var(--text-muted))] text-sm whitespace-nowrap">
                  Approved by
                </span>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger
                    className="min-w-[130px]"
                    aria-label="Filter by who approved"
                  >
                    <SelectValue placeholder="All approvers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All approvers</SelectItem>
                    {roleFilterOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {getRoleDisplayName(role)}s
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={fieldFilter} onValueChange={setFieldFilter}>
                  <SelectTrigger className="min-w-[130px]">
                    <SelectValue placeholder="All Fields" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Fields</SelectItem>
                    {fieldFilterOptions.map((field) => (
                      <SelectItem key={field} value={field}>
                        {getFieldDisplayName(field)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <button
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
                  className="ml-auto px-4 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:border-[#107c10] transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {sortOrder === "desc" ? (
                    <>
                      <FaSortAmountDown size={14} />
                      <span className="text-sm">Newest First</span>
                    </>
                  ) : (
                    <>
                      <FaSortAmountUp size={14} />
                      <span className="text-sm">Oldest First</span>
                    </>
                  )}
                </button>
              </div>

              {/* Filters - Mobile/Tablet */}
              <div className="lg:hidden space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[rgb(var(--text-muted))] text-sm block">
                      Approved by
                    </label>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger
                        className="w-full"
                        aria-label="Filter by who approved"
                      >
                        <SelectValue placeholder="All approvers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All approvers</SelectItem>
                        {roleFilterOptions.map((role) => (
                          <SelectItem key={role} value={role}>
                            {getRoleDisplayName(role)}s
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Select value={fieldFilter} onValueChange={setFieldFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Fields" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Fields</SelectItem>
                      {fieldFilterOptions.map((field) => (
                        <SelectItem key={field} value={field}>
                          {getFieldDisplayName(field)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() =>
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                    }
                    className="w-full sm:flex-1 px-4 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:border-[#107c10] transition-colors flex items-center justify-center gap-2"
                  >
                    {sortOrder === "desc" ? (
                      <>
                        <FaSortAmountDown size={14} />
                        <span className="text-sm">Newest First</span>
                      </>
                    ) : (
                      <>
                        <FaSortAmountUp size={14} />
                        <span className="text-sm">Oldest First</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setRoleFilter("all");
                      setFieldFilter("all");
                    }}
                    className="w-full sm:flex-1 px-4 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:border-[#107c10] transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-[rgb(var(--text-secondary))] text-sm mb-4">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)}{" "}
            of {filteredLogs.length} changes
            {filteredLogs.length !== logs.length &&
              ` (filtered from ${logs.length} total)`}
          </div>

          {/* Audit Log Table - Desktop */}
          <div className="hidden lg:block bg-[rgb(var(--bg-card))] rounded-lg border border-[rgb(var(--border-color))] overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#107c10] mx-auto mb-4"></div>
                <p className="text-[rgb(var(--text-secondary))]">Loading audit logs...</p>
              </div>
            ) : paginatedLogs.length === 0 ? (
              <div className="p-8 text-center">
                <FaHistory className="mx-auto text-[rgb(var(--text-muted))] mb-4" size={48} />
                <p className="text-[rgb(var(--text-secondary))]">
                  {logs.length > 0 && (debouncedSearchQuery || roleFilter !== "all" || fieldFilter !== "all")
                    ? "No logs match the current filters. Try clearing filters or changing search."
                    : "No audit logs found"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] text-xs uppercase">
                    <tr>
                      <th
                        className="px-4 py-3 text-left cursor-pointer hover:bg-[rgb(var(--bg-card))] transition-colors select-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (sortBy === "game") {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          } else {
                            setSortBy("game");
                            setSortOrder("asc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          Game
                          {sortBy === "game" ? (
                            sortOrder === "asc" ? (
                              <FaSortUp size={12} />
                            ) : (
                              <FaSortDown size={12} />
                            )
                          ) : (
                            <FaSort size={12} className="opacity-50" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left cursor-pointer hover:bg-[rgb(var(--bg-card))] transition-colors select-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (sortBy === "field") {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          } else {
                            setSortBy("field");
                            setSortOrder("asc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          Field
                          {sortBy === "field" ? (
                            sortOrder === "asc" ? (
                              <FaSortUp size={12} />
                            ) : (
                              <FaSortDown size={12} />
                            )
                          ) : (
                            <FaSort size={12} className="opacity-50" />
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left">Change</th>
                      <th
                        className="px-4 py-3 text-left cursor-pointer hover:bg-[rgb(var(--bg-card))] transition-colors select-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (sortBy === "submittedBy") {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          } else {
                            setSortBy("submittedBy");
                            setSortOrder("asc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          Submitted By
                          {sortBy === "submittedBy" ? (
                            sortOrder === "asc" ? (
                              <FaSortUp size={12} />
                            ) : (
                              <FaSortDown size={12} />
                            )
                          ) : (
                            <FaSort size={12} className="opacity-50" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left cursor-pointer hover:bg-[rgb(var(--bg-card))] transition-colors select-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (sortBy === "approvedBy") {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          } else {
                            setSortBy("approvedBy");
                            setSortOrder("asc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          Approved By
                          {sortBy === "approvedBy" ? (
                            sortOrder === "asc" ? (
                              <FaSortUp size={12} />
                            ) : (
                              <FaSortDown size={12} />
                            )
                          ) : (
                            <FaSort size={12} className="opacity-50" />
                          )}
                        </div>
                      </th>
                      <th
                        className="px-4 py-3 text-left cursor-pointer hover:bg-[rgb(var(--bg-card))] transition-colors select-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (sortBy === "date") {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          } else {
                            setSortBy("date");
                            setSortOrder("desc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          Date
                          {sortBy === "date" ? (
                            sortOrder === "asc" ? (
                              <FaSortUp size={12} />
                            ) : (
                              <FaSortDown size={12} />
                            )
                          ) : (
                            <FaSort size={12} className="opacity-50" />
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {paginatedLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-[rgb(var(--bg-card-alt))] transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FaGamepad
                              className="text-[#107c10] flex-shrink-0"
                              size={12}
                            />
                            <span className="text-[rgb(var(--text-primary))] text-sm truncate max-w-[150px]">
                              {log.gameTitle}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
                            {getFieldDisplayName(log.field)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-[rgb(var(--text-muted))] truncate max-w-[100px]">
                              {formatValue(log.oldValue)}
                            </span>
                            <span className="text-[rgb(var(--text-muted))]">→</span>
                            <span className="text-[#107c10] truncate max-w-[100px]">
                              {formatValue(log.newValue)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {log.submittedBy && log.submittedByName ? (
                            <Link
                              href={`/profile/${log.submittedBy}`}
                              className="text-[#107c10] hover:text-[#0d6b0d] hover:underline text-sm"
                            >
                              {log.submittedByName}
                            </Link>
                          ) : (
                            <span className="text-[rgb(var(--text-secondary))] text-sm">
                              {log.submittedByName || "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getRoleIcon(log.changedByRole)}
                            <span className="text-[rgb(var(--text-primary))] text-sm">
                              {log.changedByName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[rgb(var(--text-secondary))] text-xs whitespace-nowrap">
                            {formatDate(log.changedAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-[#107c10] hover:text-[#0d6b0d] text-xs"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Audit Log List - Mobile/Tablet */}
          <div className="lg:hidden space-y-3 mb-6">
            {loading ? (
              <div className="bg-[rgb(var(--bg-card))] rounded-lg p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#107c10] mx-auto mb-4"></div>
                <p className="text-[rgb(var(--text-secondary))]">Loading audit logs...</p>
              </div>
            ) : paginatedLogs.length === 0 ? (
              <div className="bg-[rgb(var(--bg-card))] rounded-lg p-8 text-center">
                <FaHistory className="mx-auto text-[rgb(var(--text-muted))] mb-4" size={48} />
                <p className="text-[rgb(var(--text-secondary))]">
                  {logs.length > 0 && (debouncedSearchQuery || roleFilter !== "all" || fieldFilter !== "all")
                    ? "No logs match the current filters. Try clearing filters or changing search."
                    : "No audit logs found"}
                </p>
              </div>
            ) : (
              paginatedLogs.map((log) => (
                <AuditLogCard
                  key={log.id}
                  log={log}
                  getRoleIcon={getRoleIcon}
                  getFieldDisplayName={getFieldDisplayName}
                  onViewDetails={() => setSelectedLog(log)}
                />
              ))
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

          {/* Detail Modal */}
          {selectedLog && (
            <AuditDetailModal
              log={selectedLog}
              onClose={() => setSelectedLog(null)}
              getRoleIcon={getRoleIcon}
              getFieldDisplayName={getFieldDisplayName}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

// Audit Log Card Component
interface AuditLogCardProps {
  log: AuditLog;
  getRoleIcon: (role: string) => React.ReactElement;
  getFieldDisplayName: (field: string) => string;
  onViewDetails: () => void;
}

function AuditLogCard({
  log,
  getRoleIcon,
  getFieldDisplayName,
  onViewDetails,
}: AuditLogCardProps) {
  const formatValue = (value: string | number | boolean | string[] | null) => {
    if (value === null || value === undefined) return "N/A";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(date).toLocaleDateString(undefined, {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="bg-[rgb(var(--bg-card))] rounded border border-[rgb(var(--border-color))] hover:border-[rgb(var(--border-hover))] transition-colors">
      <div className="p-2.5 sm:p-3">
        {/* Ultra-compact single line layout */}
        <div className="flex items-center gap-2 text-xs">
          {/* Game + Field */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <FaGamepad className="text-[#107c10] flex-shrink-0" size={12} />
            <span className="text-[rgb(var(--text-primary))] font-medium truncate">
              {log.gameTitle}
            </span>
            <span className="text-[rgb(var(--text-muted))] hidden sm:inline">·</span>
            <span className="text-blue-600 dark:text-blue-500 truncate hidden sm:inline">
              {getFieldDisplayName(log.field)}
            </span>
          </div>

          {/* Value change - desktop */}
          <div className="hidden md:flex items-center gap-1.5 text-xs min-w-0 flex-shrink">
            <span className="text-[rgb(var(--text-muted))] truncate max-w-[120px]">
              {formatValue(log.oldValue)}
            </span>
            <span className="text-[rgb(var(--text-muted))]">→</span>
            <span className="text-[#107c10] truncate max-w-[120px]">
              {formatValue(log.newValue)}
            </span>
          </div>

          {/* User + Time */}
          <div className="flex items-center gap-1.5 text-[rgb(var(--text-muted))] whitespace-nowrap text-xs">
            {log.submittedByName && (
              <>
                {log.submittedBy ? (
                  <Link
                    href={`/profile/${log.submittedBy}`}
                    className="hidden lg:inline truncate max-w-[80px] text-[#107c10] hover:text-[#0d6b0d] hover:underline"
                    title={`Submitted by ${log.submittedByName}`}
                  >
                    {log.submittedByName}
                  </Link>
                ) : (
                  <span
                    className="hidden lg:inline truncate max-w-[80px]"
                    title={`Submitted by ${log.submittedByName}`}
                  >
                    {log.submittedByName}
                  </span>
                )}
                <span className="hidden lg:inline">→</span>
              </>
            )}
            {getRoleIcon(log.changedByRole)}
            <span
              className="hidden lg:inline truncate max-w-[80px]"
              title={`Approved by ${log.changedByName}`}
            >
              {log.changedByName}
            </span>
            <span className="hidden sm:inline">·</span>
            <span>{formatDate(log.changedAt)}</span>
          </div>

          {/* Details button */}
          <button
            onClick={onViewDetails}
            className="text-[#107c10] hover:text-[#0d6b0d] text-xs flex-shrink-0"
          >
            Details
          </button>
        </div>

        {/* Mobile: Field and value change */}
        <div className="sm:hidden mt-1.5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-blue-600 dark:text-blue-400">
              {getFieldDisplayName(log.field)}:
            </span>
            <span className="text-[rgb(var(--text-muted))] truncate">
              {formatValue(log.oldValue)}
            </span>
            <span className="text-[rgb(var(--text-muted))]">→</span>
            <span className="text-[#107c10] truncate">
              {formatValue(log.newValue)}
            </span>
          </div>
          {log.submittedByName && (
            <div className="flex items-center gap-1.5 text-xs text-[rgb(var(--text-muted))]">
              {log.submittedBy ? (
                <Link
                  href={`/profile/${log.submittedBy}`}
                  className="text-[#107c10] hover:text-[#0d6b0d] hover:underline"
                >
                  {log.submittedByName}
                </Link>
              ) : (
                <span>{log.submittedByName}</span>
              )}
              <span>→</span>
              {getRoleIcon(log.changedByRole)}
              <span>{log.changedByName}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Detail Modal Component
interface AuditDetailModalProps {
  log: AuditLog;
  onClose: () => void;
  getRoleIcon: (role: string) => React.ReactElement;
  getFieldDisplayName: (field: string) => string;
}

function AuditDetailModal({
  log,
  onClose,
  getRoleIcon,
  getFieldDisplayName,
}: AuditDetailModalProps) {
  const formatValueForDisplay = (value: string | number | boolean | string[] | null) => {
    if (value === null || value === undefined) return "—";
    if (Array.isArray(value)) {
      if (value.length === 0) return "—";
      // Array of strings (e.g. instructions): show as numbered list
      if (value.every((item) => typeof item === "string")) {
        return value as string[];
      }
      return JSON.stringify(value, null, 2);
    }
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  const renderValue = (value: string | number | boolean | string[] | null, isNew = false) => {
    const formatted = formatValueForDisplay(value);
    const textClass = isNew
      ? "text-[#107c10] text-sm"
      : "text-[rgb(var(--text-secondary))] text-sm";
    if (Array.isArray(formatted)) {
      return (
        <ol className={`list-decimal list-inside space-y-2 ${textClass}`}>
          {formatted.map((line, i) => (
            <li key={i} className="pl-1">
              {line}
            </li>
          ))}
        </ol>
      );
    }
    if (formatted === "—") {
      return <span className={`${textClass} italic`}>{formatted}</span>;
    }
    return (
      <pre className={`${textClass} whitespace-pre-wrap break-words`}>{formatted}</pre>
    );
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
        <div className="sticky top-0 bg-[rgb(var(--bg-card))] border-b border-[rgb(var(--border-color))] p-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-[rgb(var(--text-primary))] mb-1">
              Change Details
            </h2>
            <p className="text-[rgb(var(--text-secondary))] text-sm">{log.gameTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Field Changed */}
          <div>
            <h3 className="text-sm text-[rgb(var(--text-muted))] mb-2">Field Changed</h3>
            <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3">
              <p className="text-[rgb(var(--text-primary))]">{getFieldDisplayName(log.field)}</p>
            </div>
          </div>

          {/* Old Value */}
          <div>
            <h3 className="text-sm text-[rgb(var(--text-muted))] mb-2">Previous Value</h3>
            <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3 max-h-[40vh] overflow-y-auto">
              {renderValue(log.oldValue, false)}
            </div>
          </div>

          {/* New Value */}
          <div>
            <h3 className="text-sm text-[rgb(var(--text-muted))] mb-2">New Value</h3>
            <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3 border-l-4 border-[#107c10] max-h-[40vh] overflow-y-auto">
              {renderValue(log.newValue, true)}
            </div>
          </div>

          {/* Submitter */}
          {log.submittedByName && (
            <div>
              <h3 className="text-sm text-[rgb(var(--text-muted))] mb-2">Submitted By</h3>
              <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3">
                {log.submittedBy ? (
                  <Link
                    href={`/profile/${log.submittedBy}`}
                    className="text-[#107c10] hover:text-[#0d6b0d] hover:underline"
                  >
                    {log.submittedByName}
                  </Link>
                ) : (
                  <span className="text-[rgb(var(--text-primary))]">{log.submittedByName}</span>
                )}
              </div>
            </div>
          )}

          {/* Approved/Reviewed By */}
          <div>
            <h3 className="text-sm text-[rgb(var(--text-muted))] mb-2">Approved By</h3>
            <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3 flex items-center gap-2">
              {getRoleIcon(log.changedByRole)}
              {log.changedBy ? (
                <Link
                  href={`/profile/${log.changedBy}`}
                  className="text-[#107c10] hover:text-[#0d6b0d] hover:underline"
                >
                  {log.changedByName}
                </Link>
              ) : (
                <span className="text-[rgb(var(--text-primary))]">{log.changedByName}</span>
              )}
              <span className="text-[rgb(var(--text-muted))] text-sm">
                ({log.changedByRole})
              </span>
            </div>
          </div>

          {/* Date */}
          <div>
            <h3 className="text-sm text-[rgb(var(--text-muted))] mb-2">Changed At</h3>
            <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3">
              <p className="text-[rgb(var(--text-primary))]">
                {new Date(log.changedAt).toLocaleString(undefined, {
                  month: "2-digit",
                  day: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          {/* Notes */}
          {log.notes && (
            <div>
              <h3 className="text-sm text-[rgb(var(--text-muted))] mb-2">Notes</h3>
              <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3">
                <p className="text-[rgb(var(--text-secondary))] text-sm">{log.notes}</p>
              </div>
            </div>
          )}

          {/* Correction ID */}
          {log.correctionId && (
            <div>
              <h3 className="text-sm text-[rgb(var(--text-muted))] mb-2">Correction ID</h3>
              <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3">
                <code className="text-[rgb(var(--text-secondary))] text-sm">
                  {log.correctionId}
                </code>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[rgb(var(--bg-card))] border-t border-[rgb(var(--border-color))] p-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-[#107c10] hover:bg-[#0d6b0d] text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
