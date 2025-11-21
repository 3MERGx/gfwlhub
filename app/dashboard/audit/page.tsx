"use client";

import { useState, useEffect } from "react";
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
} from "react-icons/fa";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

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

interface User {
  id: string;
  name: string;
  email: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [fieldFilter, setFieldFilter] = useState<string>("all");
  const [submitterFilter, setSubmitterFilter] = useState<string>("");
  const [reviewerFilter, setReviewerFilter] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  // User search state
  const [users, setUsers] = useState<User[]>([]);
  const [submitterSearchQuery, setSubmitterSearchQuery] = useState("");
  const [reviewerSearchQuery, setReviewerSearchQuery] = useState("");
  const [showSubmitterDropdown, setShowSubmitterDropdown] = useState(false);
  const [showReviewerDropdown, setShowReviewerDropdown] = useState(false);

  // Fetch real audit logs from API
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch("/api/audit-logs");
        if (response.ok) {
          const data = await response.json();
          setLogs(data.logs || []);
          setFilteredLogs(data.logs || []);
        }
      } catch (error) {
        console.error("Error fetching audit logs:", error);
      }
    };

    fetchLogs();
  }, []);

  // Fetch users for search
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/users");
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  // Filter and sort logs
  useEffect(() => {
    let filtered = [...logs];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (log) =>
          log.gameTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.changedByName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (log.submittedByName && log.submittedByName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          log.field.toLowerCase().includes(searchQuery.toLowerCase())
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

    // Submitter filter
    if (submitterFilter) {
      filtered = filtered.filter((log) => 
        log.submittedByName && log.submittedByName.toLowerCase().includes(submitterFilter.toLowerCase())
      );
    }

    // Reviewer filter
    if (reviewerFilter) {
      filtered = filtered.filter((log) => 
        log.changedByName && log.changedByName.toLowerCase().includes(reviewerFilter.toLowerCase())
      );
    }

    // Sort by date
    filtered.sort((a, b) => {
      const comparison =
        new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime();
      return sortOrder === "asc" ? -comparison : comparison;
    });

    setFilteredLogs(filtered);
  }, [logs, searchQuery, roleFilter, fieldFilter, submitterFilter, reviewerFilter, sortOrder]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <FaUserShield className="text-red-500" size={14} />;
      case "reviewer":
        return <FaUserCheck className="text-blue-500" size={14} />;
      default:
        return <FaUser className="text-gray-500" size={14} />;
    }
  };

  const getFieldDisplayName = (field: string) => {
    return field
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
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
    return new Date(date).toLocaleDateString();
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
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Audit Log
          </h1>
          <p className="text-gray-400 text-sm md:text-base">
            Complete history of all changes made to game information
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
            } md:block space-y-3 md:space-y-0 md:flex md:gap-3 md:items-center md:flex-wrap`}
          >
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full md:w-auto px-4 py-2 pr-10 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none"
              style={{ paddingRight: '2.75rem' }}
            >
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="reviewer">Reviewers</option>
              <option value="admin">Admins</option>
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
              <option value="activationType">Activation Type</option>
              <option value="status">Status</option>
            </select>

            {/* Submitter Search */}
            <div className="relative w-full md:w-auto">
              <input
                type="text"
                placeholder="Filter by submitter..."
                value={submitterSearchQuery}
                onChange={(e) => {
                  setSubmitterSearchQuery(e.target.value);
                  setShowSubmitterDropdown(true);
                }}
                onFocus={() => setShowSubmitterDropdown(true)}
                onBlur={() => setTimeout(() => setShowSubmitterDropdown(false), 200)}
                className="w-full md:w-48 px-4 py-2 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none"
              />
              {submitterFilter && (
                <button
                  onClick={() => {
                    setSubmitterFilter("");
                    setSubmitterSearchQuery("");
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  ×
                </button>
              )}
              {showSubmitterDropdown && submitterSearchQuery && (
                <div className="absolute z-10 w-full mt-1 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {users
                    .filter(user => 
                      user.name.toLowerCase().includes(submitterSearchQuery.toLowerCase()) ||
                      user.email.toLowerCase().includes(submitterSearchQuery.toLowerCase())
                    )
                    .slice(0, 10)
                    .map(user => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSubmitterFilter(user.name);
                          setSubmitterSearchQuery(user.name);
                          setShowSubmitterDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-white hover:bg-[#2d2d2d] transition-colors"
                      >
                        <div className="text-sm">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </button>
                    ))}
                  {users.filter(user => 
                    user.name.toLowerCase().includes(submitterSearchQuery.toLowerCase()) ||
                    user.email.toLowerCase().includes(submitterSearchQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="px-4 py-2 text-gray-500 text-sm">No users found</div>
                  )}
                </div>
              )}
            </div>

            {/* Reviewer Search */}
            <div className="relative w-full md:w-auto">
              <input
                type="text"
                placeholder="Filter by reviewer..."
                value={reviewerSearchQuery}
                onChange={(e) => {
                  setReviewerSearchQuery(e.target.value);
                  setShowReviewerDropdown(true);
                }}
                onFocus={() => setShowReviewerDropdown(true)}
                onBlur={() => setTimeout(() => setShowReviewerDropdown(false), 200)}
                className="w-full md:w-48 px-4 py-2 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none"
              />
              {reviewerFilter && (
                <button
                  onClick={() => {
                    setReviewerFilter("");
                    setReviewerSearchQuery("");
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  ×
                </button>
              )}
              {showReviewerDropdown && reviewerSearchQuery && (
                <div className="absolute z-10 w-full mt-1 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {users
                    .filter(user => 
                      user.name.toLowerCase().includes(reviewerSearchQuery.toLowerCase()) ||
                      user.email.toLowerCase().includes(reviewerSearchQuery.toLowerCase())
                    )
                    .slice(0, 10)
                    .map(user => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setReviewerFilter(user.name);
                          setReviewerSearchQuery(user.name);
                          setShowReviewerDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-white hover:bg-[#2d2d2d] transition-colors"
                      >
                        <div className="text-sm">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </button>
                    ))}
                  {users.filter(user => 
                    user.name.toLowerCase().includes(reviewerSearchQuery.toLowerCase()) ||
                    user.email.toLowerCase().includes(reviewerSearchQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="px-4 py-2 text-gray-500 text-sm">No users found</div>
                  )}
                </div>
              )}
            </div>

            {/* Sort Order */}
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="w-full md:w-auto px-4 py-2 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 hover:border-[#107c10] transition-colors flex items-center justify-center gap-2"
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
        </div>

        {/* Results Count */}
        <div className="text-gray-400 text-sm mb-4">
          Showing {filteredLogs.length} of {logs.length} changes
        </div>

        {/* Audit Log Table - Desktop */}
        <div className="hidden lg:block bg-[#2d2d2d] rounded-lg border border-gray-700 overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <FaHistory className="mx-auto text-gray-600 mb-4" size={48} />
              <p className="text-gray-400">No audit logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-[#1a1a1a] to-[#151515] text-gray-300 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Game</th>
                    <th className="px-4 py-3 text-left">Field</th>
                    <th className="px-4 py-3 text-left">Change</th>
                    <th className="px-4 py-3 text-left">Submitted By</th>
                    <th className="px-4 py-3 text-left">Approved By</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#252525] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FaGamepad className="text-[#107c10] flex-shrink-0" size={12} />
                          <span className="text-white text-sm truncate max-w-[150px]">{log.gameTitle}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded text-xs bg-blue-900/30 text-blue-400 border border-blue-500/30">
                          {getFieldDisplayName(log.field)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-gray-500 truncate max-w-[100px]">{formatValue(log.oldValue)}</span>
                          <span className="text-gray-600">→</span>
                          <span className="text-[#107c10] truncate max-w-[100px]">{formatValue(log.newValue)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-300 text-sm">{log.submittedByName || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(log.changedByRole)}
                          <span className="text-white text-sm">{log.changedByName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400 text-xs whitespace-nowrap">{formatDate(log.changedAt)}</span>
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
        <div className="lg:hidden space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="bg-[#2d2d2d] rounded-lg p-8 text-center">
              <FaHistory className="mx-auto text-gray-600 mb-4" size={48} />
              <p className="text-gray-400">No audit logs found</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
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
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="bg-[#2d2d2d] rounded border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="p-2.5 sm:p-3">
        {/* Ultra-compact single line layout */}
        <div className="flex items-center gap-2 text-xs">
          {/* Game + Field */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <FaGamepad className="text-[#107c10] flex-shrink-0" size={12} />
            <span className="text-white font-medium truncate">{log.gameTitle}</span>
            <span className="text-gray-600 hidden sm:inline">·</span>
            <span className="text-blue-400 truncate hidden sm:inline">{getFieldDisplayName(log.field)}</span>
          </div>
          
          {/* Value change - desktop */}
          <div className="hidden md:flex items-center gap-1.5 text-xs min-w-0 flex-shrink">
            <span className="text-gray-500 truncate max-w-[120px]">{formatValue(log.oldValue)}</span>
            <span className="text-gray-600">→</span>
            <span className="text-[#107c10] truncate max-w-[120px]">{formatValue(log.newValue)}</span>
          </div>

          {/* User + Time */}
          <div className="flex items-center gap-1.5 text-gray-500 whitespace-nowrap text-xs">
            {log.submittedByName && (
              <>
                <span className="hidden lg:inline truncate max-w-[80px]" title={`Submitted by ${log.submittedByName}`}>
                  {log.submittedByName}
                </span>
                <span className="hidden lg:inline">→</span>
              </>
            )}
            {getRoleIcon(log.changedByRole)}
            <span className="hidden lg:inline truncate max-w-[80px]" title={`Approved by ${log.changedByName}`}>
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
            <span className="text-blue-400">{getFieldDisplayName(log.field)}:</span>
            <span className="text-gray-500 truncate">{formatValue(log.oldValue)}</span>
            <span className="text-gray-600">→</span>
            <span className="text-[#107c10] truncate">{formatValue(log.newValue)}</span>
          </div>
          {log.submittedByName && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>{log.submittedByName}</span>
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
  const formatValue = (value: string | number | boolean | string[] | null) => {
    if (value === null || value === undefined) return "N/A";
    if (Array.isArray(value)) return JSON.stringify(value, null, 2);
    return String(value);
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
        <div className="sticky top-0 bg-[#2d2d2d] border-b border-gray-700 p-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">
              Change Details
            </h2>
            <p className="text-gray-400 text-sm">{log.gameTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Field Changed */}
          <div>
            <h3 className="text-sm text-gray-500 mb-2">Field Changed</h3>
            <div className="bg-[#1a1a1a] rounded-lg p-3">
              <p className="text-white">{getFieldDisplayName(log.field)}</p>
            </div>
          </div>

          {/* Old Value */}
          <div>
            <h3 className="text-sm text-gray-500 mb-2">Previous Value</h3>
            <div className="bg-[#1a1a1a] rounded-lg p-3">
              <pre className="text-gray-400 text-sm whitespace-pre-wrap break-all">
                {formatValue(log.oldValue)}
              </pre>
            </div>
          </div>

          {/* New Value */}
          <div>
            <h3 className="text-sm text-gray-500 mb-2">New Value</h3>
            <div className="bg-[#1a1a1a] rounded-lg p-3 border-l-4 border-[#107c10]">
              <pre className="text-[#107c10] text-sm whitespace-pre-wrap break-all">
                {formatValue(log.newValue)}
              </pre>
            </div>
          </div>

          {/* Submitter */}
          {log.submittedByName && (
            <div>
              <h3 className="text-sm text-gray-500 mb-2">Submitted By</h3>
              <div className="bg-[#1a1a1a] rounded-lg p-3">
                <span className="text-white">{log.submittedByName}</span>
              </div>
            </div>
          )}

          {/* Approved/Reviewed By */}
          <div>
            <h3 className="text-sm text-gray-500 mb-2">Approved By</h3>
            <div className="bg-[#1a1a1a] rounded-lg p-3 flex items-center gap-2">
              {getRoleIcon(log.changedByRole)}
              <span className="text-white">{log.changedByName}</span>
              <span className="text-gray-500 text-sm">
                ({log.changedByRole})
              </span>
            </div>
          </div>

          {/* Date */}
          <div>
            <h3 className="text-sm text-gray-500 mb-2">Changed At</h3>
            <div className="bg-[#1a1a1a] rounded-lg p-3">
              <p className="text-white">
                {new Date(log.changedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Notes */}
          {log.notes && (
            <div>
              <h3 className="text-sm text-gray-500 mb-2">Notes</h3>
              <div className="bg-[#1a1a1a] rounded-lg p-3">
                <p className="text-gray-400 text-sm">{log.notes}</p>
              </div>
            </div>
          )}

          {/* Correction ID */}
          {log.correctionId && (
            <div>
              <h3 className="text-sm text-gray-500 mb-2">Correction ID</h3>
              <div className="bg-[#1a1a1a] rounded-lg p-3">
                <code className="text-gray-400 text-sm">{log.correctionId}</code>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#2d2d2d] border-t border-gray-700 p-6">
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

