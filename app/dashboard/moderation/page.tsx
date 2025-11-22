"use client";

import { useState, useEffect } from "react";
import {
  FaSearch,
  FaFilter,
  FaUserShield,
  FaSortAmountDown,
  FaSortAmountUp,
  FaUser,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaSort,
  FaSortDown,
  FaSortUp,
} from "react-icons/fa";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

interface ModerationLog {
  id: string;
  moderatedUser: {
    id: string;
    name: string;
  };
  moderator: {
    id: string;
    name: string;
  };
  timestamp: Date;
  action: string;
  reason: string;
  previousRole?: string;
  newRole?: string;
  previousStatus?: string;
  newStatus?: string;
}

export default function ModerationPage() {
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ModerationLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ModerationLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch moderation logs from API
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch("/api/moderation-logs");
        if (response.ok) {
          const data = await response.json();
          setLogs(data.logs || []);
          setFilteredLogs(data.logs || []);
        }
      } catch (error) {
        console.error("Error fetching moderation logs:", error);
      }
    };

    fetchLogs();
  }, []);

  // Filter and sort logs
  useEffect(() => {
    let filtered = [...logs];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (log) =>
          log.moderatedUser.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          log.moderator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.reason.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Action filter
    if (actionFilter !== "all") {
      filtered = filtered.filter((log) => {
        if (actionFilter === "role_change") {
          // Check if action contains "role" or if newRole/previousRole exist
          return (
            log.action.toLowerCase().includes("role") ||
            (log.previousRole !== undefined && log.newRole !== undefined)
          );
        }
        if (actionFilter === "status_change") {
          // Check if action contains "status" or if newStatus/previousStatus exist
          return (
            log.action.toLowerCase().includes("status") ||
            (log.previousStatus !== undefined && log.newStatus !== undefined)
          );
        }
        return log.action.toLowerCase().includes(actionFilter.toLowerCase());
      });
    }

    // Sort by selected column
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "user":
          comparison = a.moderatedUser.name.localeCompare(b.moderatedUser.name);
          break;
        case "action":
          comparison = a.action.localeCompare(b.action);
          break;
        case "moderator":
          comparison = a.moderator.name.localeCompare(b.moderator.name);
          break;
        case "date":
        default:
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          comparison = timeA - timeB;
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });

    setFilteredLogs(filtered);
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [logs, searchQuery, actionFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    // Use browser's locale and timezone automatically
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadgeColor = (status?: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-500/50 dark:border-green-500/30";
      case "suspended":
        return "bg-yellow-500/20 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-yellow-500/50 dark:border-yellow-500/30";
      case "restricted":
        return "bg-orange-500/20 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-500/50 dark:border-orange-500/30";
      case "blocked":
        return "bg-red-500/20 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-500/50 dark:border-red-500/30";
      default:
        return "bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] border-[rgb(var(--border-color))]";
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-500/20 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-500/50 dark:border-purple-500/30";
      case "reviewer":
        return "bg-blue-500/20 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-500/50 dark:border-blue-500/30";
      case "user":
        return "bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] border-[rgb(var(--border-color))]";
      default:
        return "bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] border-[rgb(var(--border-color))]";
    }
  };

  return (
    <DashboardLayout requireRole="admin">
      <div className="min-h-screen bg-[rgb(var(--bg-dashboard))] text-[rgb(var(--text-primary))] p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors text-sm"
            >
              <FaChevronLeft size={12} />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Moderation Log</h1>
            <p className="text-gray-400">
              Complete history of all moderation actions taken on users
            </p>
          </div>

          {/* Filters Container */}
          <div className="bg-[rgb(var(--bg-card))] rounded-lg border border-[rgb(var(--border-color))] p-4 mb-6">
            {/* Search Bar and Clear Filters - Large Screens */}
            <div className="hidden lg:flex gap-3 mb-4">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[rgb(var(--text-muted))]" />
                <input
                  type="text"
                  placeholder="Search by user, moderator, action, or reason..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none"
                />
              </div>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActionFilter("all");
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
                placeholder="Search by user, moderator, action, or reason..."
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
              } md:block`}
            >
              {/* Filters Row - Large Screens */}
              <div className="hidden lg:flex items-center gap-3">
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="px-4 py-2 pr-10 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none"
                  style={{ paddingRight: "2.75rem" }}
                >
                  <option value="all">All Actions</option>
                  <option value="role_change">Role Changes</option>
                  <option value="status_change">Status Changes</option>
                  <option value="suspended">Suspensions</option>
                  <option value="blocked">Blocks</option>
                </select>

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
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full px-4 py-2 pr-10 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none"
                  style={{ paddingRight: "2.75rem" }}
                >
                  <option value="all">All Actions</option>
                  <option value="role_change">Role Changes</option>
                  <option value="status_change">Status Changes</option>
                  <option value="suspended">Suspensions</option>
                  <option value="blocked">Blocks</option>
                </select>

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
                      setActionFilter("all");
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
            of {filteredLogs.length} moderation actions
            {filteredLogs.length !== logs.length &&
              ` (filtered from ${logs.length} total)`}
          </div>

          {/* Moderation Log Table - Desktop */}
          <div className="hidden lg:block bg-[rgb(var(--bg-card))] rounded-lg border border-[rgb(var(--border-color))] overflow-hidden">
            {paginatedLogs.length === 0 ? (
              <div className="p-8 text-center">
                <FaUserShield className="mx-auto text-[rgb(var(--text-muted))] mb-4" size={48} />
                <p className="text-[rgb(var(--text-secondary))]">No moderation logs found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] text-xs uppercase">
                    <tr>
                      <th 
                        className="px-4 py-3 text-left w-[15%] cursor-pointer hover:bg-[rgb(var(--bg-card))] transition-colors select-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (sortBy === "user") {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          } else {
                            setSortBy("user");
                            setSortOrder("asc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          User
                          {sortBy === "user" ? (
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
                        className="px-4 py-3 text-left w-[15%] cursor-pointer hover:bg-[rgb(var(--bg-card))] transition-colors select-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (sortBy === "action") {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          } else {
                            setSortBy("action");
                            setSortOrder("asc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          Action
                          {sortBy === "action" ? (
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
                      <th className="px-4 py-3 text-left w-[15%]">Changes</th>
                      <th className="px-4 py-3 text-left w-[20%]">Reason</th>
                      <th 
                        className="px-4 py-3 text-left w-[15%] cursor-pointer hover:bg-[rgb(var(--bg-card))] transition-colors select-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (sortBy === "moderator") {
                            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                          } else {
                            setSortBy("moderator");
                            setSortOrder("asc");
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          Moderator
                          {sortBy === "moderator" ? (
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
                        className="px-4 py-3 text-left w-[20%] cursor-pointer hover:bg-[rgb(var(--bg-card))] transition-colors select-none"
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {paginatedLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-[rgb(var(--bg-card-alt))] transition-colors cursor-pointer"
                        onClick={() => setSelectedLog(log)}
                      >
                        <td className="px-4 py-3 w-[15%]">
                          <div className="flex items-center gap-2">
                            <FaUser
                              className="text-[#107c10] flex-shrink-0"
                              size={12}
                            />
                            <span className="text-[rgb(var(--text-primary))] text-sm truncate">
                              {log.moderatedUser.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 w-[15%]">
                          <span className="text-[rgb(var(--text-primary))] text-sm">{log.action}</span>
                        </td>
                        <td className="px-4 py-3 w-[15%]">
                          <div className="flex flex-wrap gap-2">
                            {log.previousRole && log.newRole && (
                              <div className="flex items-center gap-1">
                                <span
                                  className={`px-2 py-1 rounded text-xs border ${getRoleBadgeColor(
                                    log.previousRole
                                  )}`}
                                >
                                  {log.previousRole?.charAt(0).toUpperCase() + log.previousRole?.slice(1)}
                                </span>
                                <span className="text-[rgb(var(--text-muted))]">→</span>
                                <span
                                  className={`px-2 py-1 rounded text-xs border ${getRoleBadgeColor(
                                    log.newRole
                                  )}`}
                                >
                                  {log.newRole?.charAt(0).toUpperCase() + log.newRole?.slice(1)}
                                </span>
                              </div>
                            )}
                            {log.previousStatus && log.newStatus && (
                              <div className="flex items-center gap-1">
                                <span
                                  className={`px-2 py-1 rounded text-xs border ${getStatusBadgeColor(
                                    log.previousStatus
                                  )}`}
                                >
                                  {log.previousStatus?.charAt(0).toUpperCase() + log.previousStatus?.slice(1)}
                                </span>
                                <span className="text-[rgb(var(--text-muted))]">→</span>
                                <span
                                  className={`px-2 py-1 rounded text-xs border ${getStatusBadgeColor(
                                    log.newStatus
                                  )}`}
                                >
                                  {log.newStatus?.charAt(0).toUpperCase() + log.newStatus?.slice(1)}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 w-[20%]">
                          {log.reason.length > 60 ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[rgb(var(--text-secondary))] text-sm truncate max-w-[120px]">
                                {log.reason.substring(0, 60)}...
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLog(log);
                                }}
                                className="text-[#107c10] hover:text-[#0d6b0d] text-xs font-medium whitespace-nowrap flex-shrink-0"
                              >
                                View
                              </button>
                            </div>
                          ) : (
                            <span className="text-[rgb(var(--text-secondary))] text-sm truncate">
                              {log.reason}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 w-[15%]">
                          <span className="text-[rgb(var(--text-secondary))] text-sm truncate">
                            {log.moderator.name}
                          </span>
                        </td>
                        <td className="px-4 py-3 w-[20%]">
                          <div className="flex items-center gap-2 text-[rgb(var(--text-secondary))] text-sm">
                            <FaClock size={12} />
                            {formatDate(log.timestamp)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Moderation Log Cards - Mobile */}
          <div className="lg:hidden space-y-4">
            {paginatedLogs.length === 0 ? (
              <div className="bg-[rgb(var(--bg-card))] rounded-lg border border-[rgb(var(--border-color))] p-8 text-center">
                <FaUserShield className="mx-auto text-[rgb(var(--text-muted))] mb-4" size={48} />
                <p className="text-[rgb(var(--text-secondary))]">No moderation logs found</p>
              </div>
            ) : (
              paginatedLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-[rgb(var(--bg-card))] rounded-lg border border-[rgb(var(--border-color))] p-4 cursor-pointer hover:border-[#107c10] transition-colors"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FaUser className="text-[#107c10]" size={14} />
                      <span className="text-[rgb(var(--text-primary))] font-medium">
                        {log.moderatedUser.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[rgb(var(--text-secondary))] text-xs">
                      <FaClock size={10} />
                      {formatDate(log.timestamp)}
                    </div>
                  </div>
                  <div className="mb-2">
                    <span className="text-[rgb(var(--text-primary))] text-sm font-medium">
                      {log.action}
                    </span>
                  </div>
                  {(log.previousRole || log.previousStatus) && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {log.previousRole && log.newRole && (
                        <div className="flex items-center gap-1">
                          <span
                            className={`px-2 py-1 rounded text-xs border ${getRoleBadgeColor(
                              log.previousRole
                            )}`}
                          >
                            {log.previousRole?.charAt(0).toUpperCase() + log.previousRole?.slice(1)}
                          </span>
                          <span className="text-[rgb(var(--text-muted))]">→</span>
                          <span
                            className={`px-2 py-1 rounded text-xs border ${getRoleBadgeColor(
                              log.newRole
                            )}`}
                          >
                            {log.newRole?.charAt(0).toUpperCase() + log.newRole?.slice(1)}
                          </span>
                        </div>
                      )}
                      {log.previousStatus && log.newStatus && (
                        <div className="flex items-center gap-1">
                          <span
                            className={`px-2 py-1 rounded text-xs border ${getStatusBadgeColor(
                              log.previousStatus
                            )}`}
                          >
                            {log.previousStatus?.charAt(0).toUpperCase() + log.previousStatus?.slice(1)}
                          </span>
                          <span className="text-[rgb(var(--text-muted))]">→</span>
                          <span
                            className={`px-2 py-1 rounded text-xs border ${getStatusBadgeColor(
                              log.newStatus
                            )}`}
                          >
                            {log.newStatus?.charAt(0).toUpperCase() + log.newStatus?.slice(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mb-2">
                    <span className="text-[rgb(var(--text-secondary))] text-xs">Reason:</span>
                    {log.reason.length > 100 ? (
                      <div className="mt-1">
                        <p className="text-[rgb(var(--text-primary))] text-sm line-clamp-2">
                          {log.reason}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="text-[#107c10] hover:text-[#0d6b0d] text-xs font-medium mt-1"
                        >
                          View full reason
                        </button>
                      </div>
                    ) : (
                      <p className="text-[rgb(var(--text-primary))] text-sm mt-1">{log.reason}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-[rgb(var(--text-secondary))] text-xs">Moderator:</span>
                    <span className="text-[rgb(var(--text-primary))] text-sm ml-2">
                      {log.moderator.name}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-[rgb(var(--text-secondary))] text-sm">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:border-[#107c10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FaChevronLeft size={12} />
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (page) =>
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                    )
                    .map((page, index, array) => (
                      <div key={page} className="flex items-center gap-1">
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="text-[rgb(var(--text-muted))] px-2">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                            currentPage === page
                              ? "bg-[#107c10] text-white"
                              : "bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-card))] border border-[rgb(var(--border-color))]"
                          }`}
                        >
                          {page}
                        </button>
                      </div>
                    ))}
                </div>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:border-[#107c10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Next
                  <FaChevronRight size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Detail Modal */}
          {selectedLog && (
            <div
              className="fixed inset-0 bg-black/40 dark:bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedLog(null)}
            >
              <div
                className="bg-[rgb(var(--bg-card))] rounded-lg border border-[rgb(var(--border-color))] max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="sticky top-0 bg-[rgb(var(--bg-card))] border-b border-[rgb(var(--border-color))] p-6 flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-[rgb(var(--text-primary))] mb-1">
                      Moderation Details
                    </h2>
                    <p className="text-[rgb(var(--text-secondary))] text-sm">
                      {selectedLog.moderatedUser.name}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Changes */}
                  {(selectedLog.previousRole || selectedLog.previousStatus) && (
                    <div>
                      <h3 className="text-sm text-[rgb(var(--text-muted))] mb-2">Changes</h3>
                      <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3">
                        <div className="flex flex-wrap gap-2">
                          {selectedLog.previousRole && selectedLog.newRole && (
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-3 py-1 rounded text-sm border ${getRoleBadgeColor(
                                  selectedLog.previousRole
                                )}`}
                              >
                                Role: {selectedLog.previousRole?.charAt(0).toUpperCase() + selectedLog.previousRole?.slice(1)}
                              </span>
                              <span className="text-[rgb(var(--text-muted))]">→</span>
                              <span
                                className={`px-3 py-1 rounded text-sm border ${getRoleBadgeColor(
                                  selectedLog.newRole
                                )}`}
                              >
                                {selectedLog.newRole?.charAt(0).toUpperCase() + selectedLog.newRole?.slice(1)}
                              </span>
                            </div>
                          )}
                          {selectedLog.previousStatus && selectedLog.newStatus && (
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-3 py-1 rounded text-sm border ${getStatusBadgeColor(
                                  selectedLog.previousStatus
                                )}`}
                              >
                                Status: {selectedLog.previousStatus?.charAt(0).toUpperCase() + selectedLog.previousStatus?.slice(1)}
                              </span>
                              <span className="text-[rgb(var(--text-muted))]">→</span>
                              <span
                                className={`px-3 py-1 rounded text-sm border ${getStatusBadgeColor(
                                  selectedLog.newStatus
                                )}`}
                              >
                                {selectedLog.newStatus?.charAt(0).toUpperCase() + selectedLog.newStatus?.slice(1)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Reason */}
                  <div>
                    <h3 className="text-sm text-[rgb(var(--text-muted))] mb-2">Reason</h3>
                    <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3 border-l-4 border-[#107c10]">
                      <p className="text-[rgb(var(--text-primary))] whitespace-pre-wrap break-words">
                        {selectedLog.reason}
                      </p>
                    </div>
                  </div>
                  
                  {/* Moderator */}
                  <div>
                    <h3 className="text-sm text-[rgb(var(--text-muted))] mb-2">Moderator</h3>
                    <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3">
                      <p className="text-[rgb(var(--text-primary))]">{selectedLog.moderator.name}</p>
                    </div>
                  </div>
                  
                  {/* Date */}
                  <div>
                    <h3 className="text-sm text-[rgb(var(--text-muted))] mb-2">Date</h3>
                    <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3">
                      <p className="text-[rgb(var(--text-primary))]">{formatDate(selectedLog.timestamp)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

