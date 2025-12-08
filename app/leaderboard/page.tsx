"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import DashboardLayout from "@/components/DashboardLayout";
import { safeLog } from "@/lib/security";
import { useDebounce } from "@/hooks/useDebounce";
import { getAvatarUrl } from "@/lib/image-utils";
import {
  FaTrophy,
  FaMedal,
  FaSearch,
  FaUser,
  FaCheckCircle,
  FaSortAmountDown,
  FaSortAmountUp,
  FaChartLine,
  FaUsers,
  FaUserShield,
  FaUserCheck,
  FaTimes,
} from "react-icons/fa";

interface LeaderboardUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: "user" | "reviewer" | "admin";
  status: "active" | "suspended"; // Only active and suspended users shown
  submissionsCount: number;
  approvedCount: number;
  rejectedCount: number;
  reviewedCount: number;
  approvalRate: number;
  createdAt: Date;
  lastLoginAt: Date;
  rank: number; // Rank based on current filter (all users or role-specific)
}

type SortField = "rank" | "name" | "submissions" | "approved" | "approvalRate";
type SortOrder = "asc" | "desc";

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<LeaderboardUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("approvalRate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
  
  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setSortField("approvalRate");
    setSortOrder("desc");
  };

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  // Fetch leaderboard data and assign ranks
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch("/api/leaderboard");
        if (response.ok) {
          const data = await response.json();
          
          // Sort by approval rate (desc), then submission count (desc) to assign ranks
          const sortedData = [...data].sort((a, b) => {
            const rateDiff = b.approvalRate - a.approvalRate;
            if (Math.abs(rateDiff) > 0.01) {
              return rateDiff;
            }
            return b.submissionsCount - a.submissionsCount;
          });
          
          // Assign ranks based on sorted order
          const rankedData = sortedData.map((user, index) => ({
            ...user,
            rank: index + 1,
          }));
          
          setUsers(rankedData);
          setFilteredUsers(rankedData);
        } else if (response.status === 403) {
          // Not reviewer or admin - will be handled by DashboardLayout
          safeLog.error("Access denied");
        }
      } catch (error) {
        safeLog.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  // Recalculate ranks when role filter changes, then apply search and sort
  useEffect(() => {
    let filtered = [...users];

    // Apply role filter first
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
      
      // Recalculate ranks for the filtered group
      const sortedForRanking = [...filtered].sort((a, b) => {
        const rateDiff = b.approvalRate - a.approvalRate;
        if (Math.abs(rateDiff) > 0.01) {
          return rateDiff;
        }
        return b.submissionsCount - a.submissionsCount;
      });
      
      // Assign new ranks based on filtered group
      filtered = sortedForRanking.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
    }
    // If role filter is "all", use original ranks from users array

    // Apply search filter (ranks stay the same) - using debounced value
    if (debouncedSearchQuery) {
      filtered = filtered.filter((user) =>
        user.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    }

    // Apply sorting (but keep rank from role filter)
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "rank":
          comparison = a.rank - b.rank;
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "submissions":
          comparison = b.submissionsCount - a.submissionsCount;
          break;
        case "approved":
          comparison = b.approvedCount - a.approvedCount;
          break;
        case "approvalRate":
          comparison = b.approvalRate - a.approvalRate;
          break;
      }

      return sortOrder === "asc" ? -comparison : comparison;
    });

    setFilteredUsers(filtered);
  }, [users, roleFilter, debouncedSearchQuery, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder(field === "rank" ? "asc" : "desc");
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <FaTrophy className="text-yellow-400" size={20} />;
    if (rank === 2) return <FaMedal className="text-gray-400" size={20} />;
    if (rank === 3) return <FaMedal className="text-orange-400" size={20} />;
    return null;
  };

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return "bg-yellow-400/20 text-yellow-400 border-yellow-400/40";
    if (rank === 2) return "bg-gray-400/20 text-gray-400 border-gray-400/40";
    if (rank === 3) return "bg-orange-400/20 text-orange-400 border-orange-400/40";
    return "bg-gray-700/20 text-gray-400 border-gray-700/40";
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <FaUserShield className="text-red-500" size={16} />;
      case "reviewer":
        return <FaUserCheck className="text-blue-500" size={16} />;
      default:
        return <FaUser className="text-gray-500" size={16} />;
    }
  };

  const SortableHeader = ({
    field,
    label,
    className = "",
  }: {
    field: SortField;
    label: string;
    className?: string;
  }) => {
    const isActive = sortField === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className={`flex items-center gap-2 hover:text-[rgb(var(--text-primary))] transition-colors ${className} ${
          isActive ? "text-[rgb(var(--text-primary))]" : "text-[rgb(var(--text-secondary))]"
        }`}
      >
        <span>{label}</span>
        {isActive ? (
          sortOrder === "desc" ? (
            <FaSortAmountDown size={12} />
          ) : (
            <FaSortAmountUp size={12} />
          )
        ) : (
          <FaSortAmountDown size={12} className="opacity-30" />
        )}
      </button>
    );
  };

  if (loading) {
    return (
      <DashboardLayout requireRole="reviewer">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#107c10] mx-auto mb-4"></div>
              <p className="text-[rgb(var(--text-secondary))]">Loading leaderboard...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout requireRole="reviewer">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          {/* Admin Testing Banner */}
          <div className="mb-4 sm:mb-6 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-500/30 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <span className="text-yellow-600 dark:text-yellow-400 text-sm">⚠️</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-yellow-800 dark:text-yellow-400 font-semibold text-sm sm:text-base mb-1">
                  Testing Mode - Reviewers & Admins Only
                </h3>
                <p className="text-yellow-700 dark:text-yellow-200/80 text-xs sm:text-sm">
                  This leaderboard is currently in testing and only visible to reviewers and administrators. 
                  Regular users cannot access this page.
                </p>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <Link
              href="/dashboard"
              className="text-[#107c10] hover:underline text-xs sm:text-sm mb-2 inline-block"
            >
              ← Back to Dashboard
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <FaTrophy className="text-yellow-400 text-2xl sm:text-3xl" />
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[rgb(var(--text-primary))]">
                Community Leaderboard
              </h1>
            </div>
            <p className="text-[rgb(var(--text-secondary))] text-xs sm:text-sm md:text-base">
              Top contributors ranked by approval rate and submission count
            </p>
          </div>

          {/* Search and Filters */}
          <div className="bg-[rgb(var(--bg-card))] rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-[rgb(var(--border-color))]">
            {/* Search Bar */}
            <div className="relative mb-3 sm:mb-4">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[rgb(var(--text-muted))]" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none text-sm sm:text-base"
              />
              {(searchQuery || roleFilter !== "all") && (
                <button
                  onClick={clearFilters}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors p-2 touch-manipulation"
                  title="Clear filters"
                  aria-label="Clear filters"
                >
                  <FaTimes size={16} />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="flex-1 px-3 sm:px-4 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none text-sm sm:text-base"
              >
                <option value="all">All Roles</option>
                <option value="user">Users</option>
                <option value="reviewer">Reviewers</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            {/* Total Contributors - Full width on small/medium, part of grid on large */}
            <div className="md:hidden bg-[rgb(var(--bg-card))] rounded-lg p-3 sm:p-4 border border-[rgb(var(--border-color))]">
              <div className="flex items-center gap-2 text-[rgb(var(--text-secondary))] text-xs sm:text-sm mb-1">
                <FaUsers size={14} />
                <span>Total Contributors</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-[rgb(var(--text-primary))]">{users.length}</p>
            </div>

            {/* Total Submissions and Approved - Same row on small/medium */}
            <div className="grid grid-cols-2 md:hidden gap-3 sm:gap-4">
              <div className="bg-[rgb(var(--bg-card))] rounded-lg p-3 sm:p-4 border border-[rgb(var(--border-color))]">
                <div className="flex items-center gap-2 text-[rgb(var(--text-secondary))] text-xs sm:text-sm mb-1">
                  <FaChartLine size={14} />
                  <span>Total Submissions</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-[rgb(var(--text-primary))]">
                  {users.reduce((sum, user) => sum + user.submissionsCount, 0)}
                </p>
              </div>

              <div className="bg-[rgb(var(--bg-card))] rounded-lg p-3 sm:p-4 border border-[rgb(var(--border-color))]">
                <div className="flex items-center gap-2 text-green-500 text-xs sm:text-sm mb-1">
                  <FaCheckCircle size={14} />
                  <span>Approved</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-green-500">
                  {users.reduce((sum, user) => sum + user.approvedCount, 0)}
                </p>
              </div>
            </div>

            {/* Desktop layout - 3 columns */}
            <div className="hidden md:grid md:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-[rgb(var(--bg-card))] rounded-lg p-3 sm:p-4 border border-[rgb(var(--border-color))]">
                <div className="flex items-center gap-2 text-[rgb(var(--text-secondary))] text-xs sm:text-sm mb-1">
                  <FaUsers size={14} />
                  <span>Total Contributors</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-[rgb(var(--text-primary))]">{users.length}</p>
              </div>

              <div className="bg-[rgb(var(--bg-card))] rounded-lg p-3 sm:p-4 border border-[rgb(var(--border-color))]">
                <div className="flex items-center gap-2 text-[rgb(var(--text-secondary))] text-xs sm:text-sm mb-1">
                  <FaChartLine size={14} />
                  <span>Total Submissions</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-[rgb(var(--text-primary))]">
                  {users.reduce((sum, user) => sum + user.submissionsCount, 0)}
                </p>
              </div>

              <div className="bg-[rgb(var(--bg-card))] rounded-lg p-3 sm:p-4 border border-[rgb(var(--border-color))]">
                <div className="flex items-center gap-2 text-green-500 text-xs sm:text-sm mb-1">
                  <FaCheckCircle size={14} />
                  <span>Approved</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-green-500">
                  {users.reduce((sum, user) => sum + user.approvedCount, 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-[rgb(var(--text-secondary))] text-xs sm:text-sm mb-3 sm:mb-4">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} contributors
            {filteredUsers.length !== users.length && ` (filtered from ${users.length} total)`}
          </div>

          {/* Desktop Table (hidden on mobile) */}
          <div className="hidden lg:block bg-[rgb(var(--bg-card))] rounded-xl border border-[rgb(var(--border-color))] overflow-hidden shadow-2xl">
            {/* Table Header */}
            <div className="grid grid-cols-10 gap-4 px-6 py-4 border-b border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] text-xs font-semibold uppercase tracking-wider">
              <div className="col-span-1 flex items-center justify-center">
                <SortableHeader field="rank" label="Rank" className="justify-center" />
              </div>
              <div className="col-span-3 flex items-center">
                <SortableHeader field="name" label="User" />
              </div>
              <div className="col-span-2 flex items-center justify-center">
                <SortableHeader field="submissions" label="Submissions" className="justify-center" />
              </div>
              <div className="col-span-2 flex items-center justify-center">
                <SortableHeader field="approved" label="Approved" className="justify-center" />
              </div>
              <div className="col-span-2 flex items-center justify-center">
                <SortableHeader field="approvalRate" label="Approval Rate" className="justify-center" />
              </div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-[rgb(var(--border-color))]">
              {paginatedUsers.length === 0 ? (
                <div className="p-12 text-center text-[rgb(var(--text-secondary))]">
                  <FaUsers size={48} className="mx-auto mb-4 text-[rgb(var(--text-muted))]" />
                  <p className="text-lg">No contributors found</p>
                  <p className="text-sm text-[rgb(var(--text-muted))] mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                paginatedUsers.map((user) => {
                  return (
                    <div
                      key={user.id}
                      className="grid grid-cols-10 gap-4 px-6 py-4 hover:bg-[rgb(var(--bg-card-alt))] transition-all duration-200 group"
                    >
                      {/* Rank */}
                      <div className="col-span-1 flex items-center justify-center">
                        <div className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-md border font-bold ${getRankBadgeClass(user.rank)}`}>
                          {getRankIcon(user.rank)}
                          <span>#{user.rank}</span>
                        </div>
                      </div>

                      {/* User Info */}
                      <div className="col-span-3 flex items-center gap-3">
                        {user.avatar ? (
                          <div className="relative w-10 h-10 flex-shrink-0">
                            <Image
                              src={getAvatarUrl(user.avatar) || user.avatar}
                              alt={user.name}
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-full ring-2 ring-gray-700/50 group-hover:ring-[#107c10]/30 transition-all object-cover"
                              unoptimized
                              onError={(e) => {
                                // Fallback to initials if image fails to load
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                                if (target.parentElement) {
                                  const fallback = target.parentElement.querySelector(".avatar-fallback") as HTMLElement;
                                  if (fallback) {
                                    fallback.style.display = "flex";
                                  }
                                }
                              }}
                            />
                            <div
                              className="avatar-fallback w-10 h-10 rounded-full bg-gradient-to-br from-[#107c10] to-[#0d6b0d] flex items-center justify-center text-white font-bold text-sm ring-2 ring-gray-700/50 group-hover:ring-[#107c10]/30 transition-all"
                              style={{ display: "none", position: "absolute", top: 0, left: 0 }}
                            >
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#107c10] to-[#0d6b0d] flex items-center justify-center text-white font-bold text-sm ring-2 ring-gray-700/50 group-hover:ring-[#107c10]/30 transition-all flex-shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <Link
                            href={`/profile/${user.id}`}
                            className="text-[rgb(var(--text-primary))] font-semibold text-sm hover:text-[#107c10] transition-colors truncate"
                          >
                            {user.name}
                          </Link>
                          {getRoleIcon(user.role)}
                        </div>
                      </div>

                      {/* Submissions */}
                      <div className="col-span-2 flex items-center justify-center">
                        <span className="text-base font-bold text-[rgb(var(--text-primary))] bg-[#107c10]/10 px-4 py-1.5 rounded-md">
                          {user.submissionsCount}
                        </span>
                      </div>

                      {/* Approved */}
                      <div className="col-span-2 flex items-center justify-center">
                        <span className="text-base font-bold text-green-500">
                          {user.approvedCount}
                        </span>
                      </div>

                      {/* Approval Rate */}
                      <div className="col-span-2 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-lg font-bold text-[rgb(var(--text-primary))] mb-1">
                            {user.approvalRate.toFixed(1)}%
                          </div>
                          <div className="w-24 bg-[rgb(var(--bg-card-alt))] rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                user.approvalRate >= 75
                                  ? "bg-green-500"
                                  : user.approvalRate >= 50
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${user.approvalRate}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {paginatedUsers.length === 0 ? (
              <div className="bg-[rgb(var(--bg-card))] rounded-lg p-8 text-center text-[rgb(var(--text-secondary))] border border-[rgb(var(--border-color))]">
                <FaUsers size={48} className="mx-auto mb-4 text-[rgb(var(--text-muted))]" />
                <p className="text-base">No contributors found</p>
                <p className="text-sm text-[rgb(var(--text-muted))] mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              paginatedUsers.map((user) => {
                return (
                  <div
                    key={user.id}
                    className="bg-[rgb(var(--bg-card))] rounded-lg border border-[rgb(var(--border-color))] p-4 space-y-3"
                  >
                    {/* Header Row - Rank badge on the right */}
                    <div className="flex items-center justify-end">
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border font-bold text-sm ${getRankBadgeClass(user.rank)}`}>
                        {getRankIcon(user.rank)}
                        <span>#{user.rank}</span>
                      </div>
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <div className="relative w-12 h-12 flex-shrink-0">
                          <Image
                            src={getAvatarUrl(user.avatar) || user.avatar}
                            alt={user.name}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-full ring-2 ring-gray-700 object-cover"
                            unoptimized
                            onError={(e) => {
                              // Fallback to initials if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              if (target.parentElement) {
                                const fallback = target.parentElement.querySelector(".avatar-fallback") as HTMLElement;
                                if (fallback) {
                                  fallback.style.display = "flex";
                                }
                              }
                            }}
                          />
                          <div
                            className="avatar-fallback w-12 h-12 rounded-full bg-gradient-to-br from-[#107c10] to-[#0d6b0d] flex items-center justify-center text-white font-bold text-lg ring-2 ring-gray-700"
                            style={{ display: "none", position: "absolute", top: 0, left: 0 }}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#107c10] to-[#0d6b0d] flex items-center justify-center text-white font-bold text-lg ring-2 ring-gray-700 flex-shrink-0">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <Link
                          href={`/profile/${user.id}`}
                          className="text-[rgb(var(--text-primary))] font-semibold text-base hover:text-[#107c10] transition-colors truncate"
                        >
                          {user.name}
                        </Link>
                        {getRoleIcon(user.role)}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[rgb(var(--border-color))]">
                      <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3">
                        <div className="flex items-center gap-2 text-[rgb(var(--text-secondary))] text-xs mb-1">
                          <FaUser size={10} />
                          <span>Submissions</span>
                        </div>
                        <p className="text-lg font-bold text-[rgb(var(--text-primary))]">{user.submissionsCount}</p>
                      </div>

                      <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3">
                        <div className="flex items-center gap-2 text-[rgb(var(--text-secondary))] text-xs mb-1">
                          <FaCheckCircle size={10} className="text-green-500" />
                          <span>Approved</span>
                        </div>
                        <p className="text-lg font-bold text-green-500">{user.approvedCount}</p>
                      </div>

                      <div className="bg-[rgb(var(--bg-card-alt))] rounded-lg p-3 col-span-2">
                        <div className="text-[rgb(var(--text-secondary))] text-xs mb-1">Approval Rate</div>
                        <p className="text-lg font-bold text-[rgb(var(--text-primary))] mb-1">{user.approvalRate.toFixed(1)}%</p>
                        <div className="w-full bg-[rgb(var(--bg-card-alt))] rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              user.approvalRate >= 75
                                ? "bg-green-500"
                                : user.approvalRate >= 50
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${user.approvalRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination - Only show if more than 100 entries */}
          {filteredUsers.length > 100 && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              <div className="text-sm text-[rgb(var(--text-secondary))]">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:border-[#107c10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Previous page"
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
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:border-[#107c10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

