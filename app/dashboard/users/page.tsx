"use client";

import { useState, useEffect } from "react";
import {
  FaGoogle,
  FaGithub,
  FaDiscord,
  FaSearch,
  FaFilter,
  FaEllipsisV,
  FaUserShield,
  FaUserCheck,
  FaUser,
  FaUsers,
  FaClock,
  FaSortAmountDown,
  FaSortAmountUp,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaCalendarAlt,
  FaChartBar,
  FaTrashRestore,
  FaCopy,
} from "react-icons/fa";
import Link from "next/link";
import Image from "next/image";
import DashboardLayout from "@/components/DashboardLayout";
import { useSession } from "next-auth/react";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "user" | "reviewer" | "admin";
  status: "active" | "suspended" | "restricted" | "blocked" | "deleted";
  provider: "github" | "discord" | "google";
  lastLoginAt: Date;
  submissionsCount: number;
  approvedCount: number;
  rejectedCount: number;
  suspendedUntil?: Date;
  deletedAt?: Date;
  anonymizedAt?: Date;
  archivedName?: string; // Admin-only: original name before deletion
  providerInfo?: {
    provider: string;
    providerAccountId: string;
  };
}

const ITEMS_PER_PAGE = 20;

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("lastActive");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeletedUsers, setShowDeletedUsers] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [suspendDays, setSuspendDays] = useState<number>(7);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [userToRestore, setUserToRestore] = useState<User | null>(null);

  // Fetch users from API
  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch("/api/users");
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        } else {
          console.error("Failed to fetch users");
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    }
    fetchUsers();
  }, []);

  // Filter and sort users
  useEffect(() => {
    let filtered = [...users];

    // Show/hide deleted users - handle this FIRST to avoid conflicts with other filters
    if (!showDeletedUsers) {
      // Hide deleted users and apply other filters
      filtered = filtered.filter((u) => u.status !== "deleted");

      // Search filter
      if (searchQuery) {
        filtered = filtered.filter(
          (u) =>
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Role filter
      if (roleFilter !== "all") {
        filtered = filtered.filter((u) => u.role === roleFilter);
      }

      // Status filter
      if (statusFilter !== "all") {
        filtered = filtered.filter((u) => u.status === statusFilter);
      }
    } else {
      // When showing deleted users, show ONLY deleted users (ignore other filters)
      filtered = filtered.filter((u) => u.status === "deleted");

      // Still allow search on deleted users
      if (searchQuery) {
        filtered = filtered.filter(
          (u) =>
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "email":
          comparison = a.email.localeCompare(b.email);
          break;
        case "role":
          comparison = a.role.localeCompare(b.role);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "provider":
          comparison = a.provider.localeCompare(b.provider);
          break;
        case "lastActive":
          comparison =
            new Date(b.lastLoginAt).getTime() -
            new Date(a.lastLoginAt).getTime();
          break;
        case "submissions":
          comparison = b.submissionsCount - a.submissionsCount;
          break;
        case "approvalRate":
          const aRate =
            a.submissionsCount > 0 ? a.approvedCount / a.submissionsCount : 0;
          const bRate =
            b.submissionsCount > 0 ? b.approvedCount / b.submissionsCount : 0;
          comparison = bRate - aRate;
          break;
      }
      return sortOrder === "asc" ? -comparison : comparison;
    });

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [
    users,
    searchQuery,
    roleFilter,
    statusFilter,
    sortBy,
    sortOrder,
    showDeletedUsers,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const getProviderIcon = (provider: string): React.ReactElement | null => {
    switch (provider) {
      case "google":
        return <FaGoogle className="text-red-500" size={16} />;
      case "github":
        return <FaGithub className="text-gray-400" size={16} />;
      case "discord":
        return <FaDiscord className="text-[#5865F2]" size={16} />;
      default:
        return null;
    }
  };

  const getProviderName = (provider: string): string => {
    switch (provider) {
      case "google":
        return "Google";
      case "github":
        return "GitHub";
      case "discord":
        return "Discord";
      default:
        return provider;
    }
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Online Now";
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;

    // More than 24 hours - show date
    return new Date(date).toLocaleDateString();
  };

  const formatFullDateTime = (date: Date): string => {
    return new Date(date).toLocaleString();
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  interface SessionUser {
    isDeveloper?: boolean;
  }
  const isDeveloper = () => {
    // Check from session (set server-side in auth-config.ts)
    return (session?.user as SessionUser)?.isDeveloper === true;
  };

  const canPromoteToAdmin = () => {
    return isDeveloper();
  };

  const getRoleIcon = (role: string): React.ReactElement => {
    switch (role) {
      case "admin":
        return <FaUserShield className="text-red-500" size={16} />;
      case "reviewer":
        return <FaUserCheck className="text-blue-500" size={16} />;
      default:
        return <FaUser className="text-gray-500" size={16} />;
    }
  };

  const handleRestoreUserClick = (user: User) => {
    // Check if beyond grace period
    const deletedAt = user.deletedAt ? new Date(user.deletedAt) : new Date();
    const now = new Date();
    const daysSinceDeletion = Math.floor(
      (now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const beyondGracePeriod = daysSinceDeletion > 30;

    if (beyondGracePeriod && !isDeveloper()) {
      alert(
        `Cannot restore this account. Grace period (30 days) has expired.\n\n` +
          `Deleted ${daysSinceDeletion} days ago. Contact a developer for admin override.`
      );
      return;
    }

    setUserToRestore(user);
    setShowRestoreModal(true);
  };

  const handleRestoreUser = async () => {
    if (!userToRestore) return;

    const user = userToRestore;
    const deletedAt = user.deletedAt ? new Date(user.deletedAt) : new Date();
    const now = new Date();
    const daysSinceDeletion = Math.floor(
      (now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    const beyondGracePeriod = daysSinceDeletion > 30;

    try {
      const response = await fetch(`/api/users/${user.id}/restore`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminOverride: beyondGracePeriod,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to restore user");
      }

      // Refresh users list
      const usersResponse = await fetch("/api/users");
      if (usersResponse.ok) {
        const data = await usersResponse.json();
        setUsers(data);
      }

      const result = await response.json();
      const successMsg = result.overrideUsed
        ? `${
            user.archivedName || user.name
          }'s account has been restored (admin override used).`
        : `${user.archivedName || user.name}'s account has been restored.`;

      setShowRestoreModal(false);
      setUserToRestore(null);
      setSuccessMessage(successMsg);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (error) {
      console.error("Error restoring user:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to restore user account"
      );
    }
  };

  const handleRoleChange = async (newRole: string) => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user role");
      }

      // Refresh the user list
      const usersResponse = await fetch("/api/users");
      if (usersResponse.ok) {
        const data = await usersResponse.json();
        setUsers(data);
        setFilteredUsers(data);
      }

      // If updating the current user's role, show a message that they need to refresh
      if (selectedUser.id === session?.user?.id) {
        alert(
          "Your role has been updated. Please refresh the page to see the changes."
        );
      }

      setShowRoleModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error updating user role:", error);
      alert(
        error instanceof Error ? error.message : "Failed to update user role"
      );
    }
  };

  const handleSuspend = async (days: number | null) => {
    if (!selectedUser) return;

    try {
      // Handle restore to active
      if (days === -1) {
        const response = await fetch(`/api/users/${selectedUser.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "active",
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to restore user");
        }

        // Refresh the user list
        const usersResponse = await fetch("/api/users");
        if (usersResponse.ok) {
          const data = await usersResponse.json();
          setUsers(data);
        }

        setShowSuspendModal(false);
        setSelectedUser(null);
        setSuspendDays(7);

        setSuccessMessage(
          `${selectedUser.name} has been restored to active status.`
        );
        setTimeout(() => setSuccessMessage(null), 3000);
        return;
      }

      // Handle permanent restriction (can sign in, can't submit)
      if (days === -2) {
        const response = await fetch(`/api/users/${selectedUser.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "restricted",
            role: "user", // Downgrade to regular user for permanent restrictions
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to restrict user");
        }

        // Refresh the user list
        const usersResponse = await fetch("/api/users");
        if (usersResponse.ok) {
          const data = await usersResponse.json();
          setUsers(data);
        }

        setShowSuspendModal(false);
        setSelectedUser(null);
        setSuspendDays(7);

        setSuccessMessage(
          `${selectedUser.name} has been permanently restricted from submissions and their role has been set to User.`
        );
        setTimeout(() => setSuccessMessage(null), 3000);
        return;
      }

      const newStatus = days === null ? "blocked" : "suspended";
      const suspendedUntil =
        days !== null && days > 0
          ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
          : undefined;

      // For permanent bans, also downgrade role to user
      const updateBody: {
        status: string;
        suspendedUntil?: string;
        role?: string;
      } = {
        status: newStatus,
      };

      if (suspendedUntil) {
        updateBody.suspendedUntil = suspendedUntil;
      }

      // Permanent ban - downgrade to user
      if (days === null) {
        updateBody.role = "user";
      }

      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user status");
      }

      // Refresh the user list to show updated status
      const usersResponse = await fetch("/api/users");
      if (usersResponse.ok) {
        const data = await usersResponse.json();
        setUsers(data);
      }

      setShowSuspendModal(false);
      setSelectedUser(null);
      setSuspendDays(7); // Reset to default

      if (days === null) {
        setSuccessMessage(
          `${selectedUser.name} has been permanently banned and their role has been set to User.`
        );
      } else {
        setSuccessMessage(
          `${selectedUser.name} has been suspended for ${days} day${
            days !== 1 ? "s" : ""
          }.`
        );
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("Error updating user status:", error);
      alert(
        error instanceof Error ? error.message : "Failed to update user status"
      );
    }
  };

  const isCurrentUser = (userId: string) => {
    return session?.user?.id === userId;
  };

  const canChangeRole = (user: User) => {
    // Check if current user is admin and not trying to change their own role
    const userRole = session?.user?.role;
    const isAdmin =
      userRole === "admin" ||
      (typeof userRole === "string" && userRole.toLowerCase() === "admin");

    if (!isAdmin || isCurrentUser(user.id)) {
      return false;
    }

    // Only developers can change admin roles
    // Regular admins can only change user/reviewer roles
    if (user.role === "admin") {
      return isDeveloper();
    }

    // Admins can change user/reviewer roles
    return true;
  };

  const SortableHeader = ({
    column,
    label,
    className = "",
  }: {
    column: string;
    label: string;
    className?: string;
  }) => {
    const isActive = sortBy === column;
    return (
      <button
        onClick={() => handleSort(column)}
        className={`flex items-center gap-2 hover:text-white transition-colors ${className} ${
          isActive ? "text-white" : "text-gray-400"
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

  return (
    <DashboardLayout requireRole="admin">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <Link
              href="/dashboard"
              className="text-[#107c10] hover:underline text-xs sm:text-sm mb-2 inline-block"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2">
              User Management
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm md:text-base">
              Manage user roles, permissions, and access
            </p>
          </div>

          {/* Search and Controls */}
          <div className="bg-[#2d2d2d] rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            {/* Search Bar */}
            <div className="relative mb-3 sm:mb-4">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none text-sm sm:text-base"
              />
            </div>

            {/* Filter Toggle (Mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden w-full flex items-center justify-center gap-2 bg-[#1a1a1a] text-white py-2.5 rounded-lg border border-gray-700 mb-3 text-sm"
            >
              <FaFilter size={14} />
              <span>Filters & Sort</span>
            </button>

            {/* Filters and Sort */}
            <div
              className={`${
                showFilters ? "block" : "hidden"
              } md:flex md:flex-wrap md:items-center space-y-2 sm:space-y-3 md:space-y-0 md:gap-3`}
            >
              {/* Show Deleted Users Toggle */}
              <button
                onClick={() => setShowDeletedUsers(!showDeletedUsers)}
                className={`w-full md:w-auto px-4 py-2 rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                  showDeletedUsers
                    ? "bg-red-900/30 border-red-500/50 text-red-300"
                    : "bg-[#1a1a1a] border-gray-700 text-white hover:border-[#107c10]"
                }`}
              >
                <FaTrashRestore size={14} />
                <span className="text-sm">
                  {showDeletedUsers ? "Hide Deleted" : "Show Deleted"}
                </span>
              </button>
              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full md:w-auto px-3 sm:px-4 py-2 pr-10 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none text-sm sm:text-base"
                style={{ paddingRight: "2.75rem" }}
                disabled={showDeletedUsers}
              >
                <option value="all">All Roles</option>
                <option value="user">Users</option>
                <option value="reviewer">Reviewers</option>
                <option value="admin">Admins</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full md:w-auto px-3 sm:px-4 py-2 pr-10 bg-[#1a1a1a] text-white rounded-lg border border-gray-700 focus:border-[#107c10] focus:outline-none text-sm sm:text-base"
                style={{ paddingRight: "2.75rem" }}
                disabled={showDeletedUsers}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-gray-400 text-xs sm:text-sm mb-3 sm:mb-4">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)}{" "}
            of {filteredUsers.length} users
          </div>

          {/* Users Table - Desktop (XL screens only) */}
          <div className="hidden xl:block bg-[#1e1e1e] rounded-xl border border-gray-700/50 overflow-hidden shadow-2xl">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-700/50 bg-gradient-to-r from-[#1a1a1a] to-[#151515] text-gray-300 text-xs font-semibold uppercase tracking-wider">
              <div className="col-span-2 flex items-center">
                <SortableHeader column="name" label="User" />
              </div>
              <div className="col-span-2 flex items-center">
                <span className="text-gray-400">Provider ID</span>
              </div>
              <div className="col-span-1 flex items-center justify-center">
                <SortableHeader
                  column="role"
                  label="Role"
                  className="justify-center"
                />
              </div>
              <div className="col-span-1 flex items-center justify-center">
                <SortableHeader
                  column="status"
                  label="Status"
                  className="justify-center"
                />
              </div>
              <div className="col-span-1 flex items-center justify-center">
                <SortableHeader
                  column="provider"
                  label="Provider"
                  className="justify-center"
                />
              </div>
              <div className="col-span-2 flex items-center justify-center">
                <SortableHeader
                  column="lastActive"
                  label="Last Login"
                  className="justify-center"
                />
              </div>
              <div className="col-span-1 flex items-center justify-center">
                <SortableHeader
                  column="submissions"
                  label="Submissions"
                  className="justify-center"
                />
              </div>
              <div className="col-span-1 flex items-center justify-center">
                <SortableHeader
                  column="approvalRate"
                  label="Approval"
                  className="justify-center"
                />
              </div>
              <div className="col-span-1 flex items-center justify-center">
                Actions
              </div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-gray-700/30">
              {paginatedUsers.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-800/50 mb-4">
                    <FaUsers size={28} className="text-gray-600" />
                  </div>
                  <p className="text-lg font-medium">No users found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Try adjusting your filters
                  </p>
                </div>
              ) : (
                paginatedUsers.map((user) => {
                  const approvalRate =
                    user.submissionsCount > 0
                      ? (
                          (user.approvedCount / user.submissionsCount) *
                          100
                        ).toFixed(1)
                      : "0.0";

                  return (
                    <div
                      key={user.id}
                      className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-[#252525] transition-all duration-200 group"
                    >
                      {/* User Info */}
                      <div className="col-span-2 flex items-center gap-3">
                        {user.avatar ? (
                          <Image
                            src={user.avatar}
                            alt={user.name}
                            width={44}
                            height={44}
                            className="w-11 h-11 rounded-full ring-2 ring-gray-700/50 group-hover:ring-[#107c10]/30 transition-all object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#107c10] to-[#0d6b0d] flex items-center justify-center text-white font-bold text-base ring-2 ring-gray-700/50 group-hover:ring-[#107c10]/30 transition-all">
                            {(user.status === "deleted" && user.archivedName
                              ? user.archivedName
                              : user.name
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              {user.status === "deleted" ? (
                                <div>
                                  <span
                                    className="text-white font-semibold truncate text-sm block"
                                    title={
                                      user.archivedName
                                        ? `Original name: ${user.archivedName}`
                                        : undefined
                                    }
                                  >
                                    {user.archivedName || user.name}
                                  </span>
                                  <span className="text-xs text-gray-500 truncate block">
                                    (Deleted Account)
                                  </span>
                                </div>
                              ) : (
                                <Link
                                  href={`/profile/${user.id}`}
                                  className="text-white font-semibold truncate text-sm hover:text-[#107c10] transition-colors block"
                                >
                                  {user.name}
                                </Link>
                              )}
                            </div>
                            {user.role === "admin" && (
                              <div className="relative group/icon">
                                <FaUserShield
                                  className="text-red-400"
                                  size={14}
                                />
                                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/icon:opacity-100 transition-opacity pointer-events-none z-10">
                                  Admin
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Provider ID */}
                      <div className="col-span-2 flex items-center text-sm">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-mono text-xs text-gray-400">
                            {user.providerInfo?.providerAccountId || user.id}
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                user.providerInfo?.providerAccountId || user.id,
                                user.id
                              )
                            }
                            className="relative flex-shrink-0 text-gray-400 hover:text-[#107c10] transition-colors p-1 group/copy"
                            title="Copy to clipboard"
                          >
                            {copiedId === user.id ? (
                              <span className="text-green-400 text-xs">✓</span>
                            ) : (
                              <FaCopy size={12} />
                            )}
                            <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/copy:opacity-100 transition-opacity pointer-events-none z-10">
                              Copy ID
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Role - Badge */}
                      <div className="col-span-1 flex items-center justify-center">
                        <span
                          className={`px-3 py-1.5 rounded-md text-xs font-medium border flex items-center gap-1.5 ${
                            user.role === "admin"
                              ? "bg-red-900/20 text-red-300 border-red-500/40"
                              : user.role === "reviewer"
                              ? "bg-blue-900/20 text-blue-300 border-blue-500/40"
                              : "bg-gray-700/20 text-gray-300 border-gray-600/40"
                          }`}
                        >
                          {getRoleIcon(user.role)}
                          <span className="capitalize">{user.role}</span>
                        </span>
                      </div>

                      {/* Status - Only show if not active */}
                      <div className="col-span-1 flex items-center justify-center">
                        {user.status === "active" ? (
                          <span className="px-3 py-1.5 rounded-md text-xs font-medium bg-green-900/20 text-green-300 border border-green-500/40">
                            Active
                          </span>
                        ) : user.status === "suspended" ? (
                          <span className="px-3 py-1.5 rounded-md text-xs font-medium bg-yellow-900/20 text-yellow-300 border border-yellow-500/40">
                            Suspended
                          </span>
                        ) : user.status === "restricted" ? (
                          <span className="px-3 py-1.5 rounded-md text-xs font-medium bg-orange-900/20 text-orange-300 border border-orange-500/40">
                            Restricted
                          </span>
                        ) : user.status === "blocked" ? (
                          <span className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-900/20 text-red-300 border border-red-500/40">
                            Blocked
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 rounded-md text-xs font-medium bg-gray-900/20 text-gray-300 border border-gray-500/40">
                            {user.status.charAt(0).toUpperCase() +
                              user.status.slice(1)}
                          </span>
                        )}
                      </div>

                      {/* Provider */}
                      <div className="col-span-1 flex items-center justify-center">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-gray-800/40">
                          {getProviderIcon(user.provider)}
                          <span className="text-xs text-gray-300 font-medium">
                            {getProviderName(user.provider)}
                          </span>
                        </div>
                      </div>

                      {/* Last Active */}
                      <div className="col-span-2 flex items-center justify-center text-sm text-gray-300 font-medium">
                        <span
                          title={formatFullDateTime(user.lastLoginAt)}
                          className="cursor-help"
                        >
                          {formatRelativeTime(user.lastLoginAt)}
                        </span>
                      </div>

                      {/* Submissions */}
                      <div className="col-span-1 flex items-center justify-center">
                        <span className="text-sm font-semibold text-white px-3 py-1 rounded-md bg-[#107c10]/10">
                          {user.submissionsCount}
                        </span>
                      </div>

                      {/* Approval Rate */}
                      <div className="col-span-1 flex items-center justify-center">
                        <div className="flex flex-col items-center">
                          <span
                            className={`text-sm font-bold ${
                              parseFloat(approvalRate) >= 75
                                ? "text-green-400"
                                : parseFloat(approvalRate) >= 50
                                ? "text-yellow-400"
                                : "text-red-400"
                            }`}
                          >
                            {approvalRate}%
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="col-span-1 flex items-center justify-center relative">
                        {!isCurrentUser(user.id) && (
                          <button
                            onClick={() =>
                              setOpenMenuId(
                                openMenuId === user.id ? null : user.id
                              )
                            }
                            className="p-2.5 hover:bg-[#107c10]/20 rounded-lg transition-all border border-transparent hover:border-[#107c10]/30"
                            aria-label="User actions"
                          >
                            <FaEllipsisV className="text-gray-400 group-hover:text-gray-300" />
                          </button>
                        )}

                        {/* Dropdown Menu */}
                        {openMenuId === user.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 mt-2 w-64 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl z-20">
                              <div className="py-1">
                                {/* Restore Account - Only for deleted users */}
                                {user.status === "deleted" && (
                                  <button
                                    onClick={() => {
                                      handleRestoreUserClick(user);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-green-400 hover:bg-[#2d2d2d] flex items-center gap-2"
                                  >
                                    <FaTrashRestore size={12} />
                                    Restore Account
                                  </button>
                                )}

                                {/* Moderation options - Only for non-deleted, non-self users */}
                                {user.status !== "deleted" &&
                                  !isCurrentUser(user.id) && (
                                    <>
                                      {canChangeRole(user) && (
                                        <button
                                          onClick={() => {
                                            setSelectedUser(user);
                                            setShowRoleModal(true);
                                            setOpenMenuId(null);
                                          }}
                                          className="w-full px-4 py-2 text-left text-white hover:bg-[#2d2d2d] flex items-center gap-2"
                                        >
                                          Change Permissions
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          setSelectedUser(user);
                                          // Set initial state based on current status
                                          if (user.status === "blocked") {
                                            setSuspendDays(0); // Blocked
                                          } else if (
                                            user.status === "restricted"
                                          ) {
                                            setSuspendDays(-2); // Restricted
                                          } else if (
                                            user.status === "suspended"
                                          ) {
                                            setSuspendDays(7); // Default to 7 days for updates
                                          } else {
                                            setSuspendDays(7); // Default
                                          }
                                          setShowSuspendModal(true);
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full px-4 py-2 text-left text-yellow-400 hover:bg-[#2d2d2d] flex items-center gap-2"
                                      >
                                        <FaClock size={12} />
                                        {user.status === "suspended"
                                          ? "Update Suspension"
                                          : user.status === "restricted"
                                          ? "Update Restrictions"
                                          : user.status === "blocked"
                                          ? "Unblock User"
                                          : "Moderation"}
                                      </button>
                                    </>
                                  )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Mobile/Tablet Card View (XL screens use table) */}
          <div className="xl:hidden space-y-3">
            {paginatedUsers.length === 0 ? (
              <div className="bg-[#2d2d2d] rounded-lg p-8 text-center text-gray-400">
                No users found
              </div>
            ) : (
              paginatedUsers.map((user) => {
                const approvalRate =
                  user.submissionsCount > 0
                    ? (
                        (user.approvedCount / user.submissionsCount) *
                        100
                      ).toFixed(1)
                    : "0.0";

                return (
                  <div
                    key={user.id}
                    className="bg-[#2d2d2d] rounded-lg border border-gray-700 p-4 space-y-3"
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Avatar - Hidden on small screens */}
                        <div className="hidden sm:block flex-shrink-0">
                          {user.avatar ? (
                            <Image
                              src={user.avatar}
                              alt={user.name}
                              width={48}
                              height={48}
                              className="w-12 h-12 rounded-full"
                              unoptimized
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-[#107c10] flex items-center justify-center text-white font-bold">
                              {(user.status === "deleted" && user.archivedName
                                ? user.archivedName
                                : user.name
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex-1 min-w-0">
                              {user.status === "deleted" ? (
                                <div>
                                  <span
                                    className="text-white font-semibold truncate text-base block"
                                    title={
                                      user.archivedName
                                        ? `Original name: ${user.archivedName}`
                                        : undefined
                                    }
                                  >
                                    {user.archivedName || user.name}
                                  </span>
                                  <span className="text-xs text-gray-500 truncate block">
                                    (Deleted Account)
                                  </span>
                                </div>
                              ) : (
                                <Link
                                  href={`/profile/${user.id}`}
                                  className="text-white font-semibold truncate text-base hover:text-[#107c10] transition-colors block"
                                >
                                  {user.name}
                                </Link>
                              )}
                            </div>
                            {user.role === "admin" && (
                              <div className="relative group">
                                <FaUserShield
                                  className="text-red-500"
                                  size={16}
                                />
                                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                  Admin
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="truncate font-mono text-xs text-gray-400">
                              {user.providerInfo?.providerAccountId || user.id}
                            </span>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  user.providerInfo?.providerAccountId ||
                                    user.id,
                                  user.id
                                )
                              }
                              className="relative flex-shrink-0 text-gray-400 hover:text-[#107c10] transition-colors p-1 group/copy"
                              title="Copy to clipboard"
                            >
                              {copiedId === user.id ? (
                                <span className="text-green-400 text-xs">
                                  ✓
                                </span>
                              ) : (
                                <FaCopy size={10} />
                              )}
                              <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/copy:opacity-100 transition-opacity pointer-events-none z-10">
                                Copy ID
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                      {/* Actions Button */}
                      <div className="relative flex-shrink-0">
                        {!isCurrentUser(user.id) && (
                          <button
                            onClick={() =>
                              setOpenMenuId(
                                openMenuId === user.id ? null : user.id
                              )
                            }
                            className="p-2.5 hover:bg-[#3d3d3d] rounded-lg transition-colors touch-manipulation"
                            aria-label="User actions"
                          >
                            <FaEllipsisV className="text-gray-400" size={18} />
                          </button>
                        )}

                        {/* Dropdown Menu */}
                        {openMenuId === user.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 mt-2 w-64 bg-[#1a1a1a] border border-gray-700 rounded-lg shadow-xl z-20">
                              <div className="py-1">
                                {/* Restore Account - Only for deleted users */}
                                {user.status === "deleted" && (
                                  <button
                                    onClick={() => {
                                      handleRestoreUserClick(user);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-4 py-3 text-left text-green-400 hover:bg-[#2d2d2d] flex items-center gap-2 text-sm touch-manipulation"
                                  >
                                    <FaTrashRestore size={14} />
                                    Restore Account
                                  </button>
                                )}

                                {/* Moderation options - Only for non-deleted, non-self users */}
                                {user.status !== "deleted" &&
                                  !isCurrentUser(user.id) && (
                                    <>
                                      {canChangeRole(user) && (
                                        <button
                                          onClick={() => {
                                            setSelectedUser(user);
                                            setShowRoleModal(true);
                                            setOpenMenuId(null);
                                          }}
                                          className="w-full px-4 py-3 text-left text-white hover:bg-[#2d2d2d] flex items-center gap-2 text-sm touch-manipulation"
                                        >
                                          Change Permissions
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          setSelectedUser(user);
                                          // Set initial state based on current status
                                          if (user.status === "blocked") {
                                            setSuspendDays(0); // Blocked
                                          } else if (
                                            user.status === "restricted"
                                          ) {
                                            setSuspendDays(-2); // Restricted
                                          } else if (
                                            user.status === "suspended"
                                          ) {
                                            setSuspendDays(7); // Default to 7 days for updates
                                          } else {
                                            setSuspendDays(7); // Default
                                          }
                                          setShowSuspendModal(true);
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full px-4 py-3 text-left text-yellow-400 hover:bg-[#2d2d2d] flex items-center gap-2 text-sm touch-manipulation"
                                      >
                                        <FaClock size={14} />
                                        {user.status === "suspended"
                                          ? "Update Suspension"
                                          : user.status === "restricted"
                                          ? "Update Restrictions"
                                          : user.status === "blocked"
                                          ? "Unblock User"
                                          : "Moderation"}
                                      </button>
                                    </>
                                  )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Badges Row */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-1.5 rounded-md text-xs border flex items-center gap-1.5 ${
                          user.role === "admin"
                            ? "bg-red-900/30 text-red-400 border-red-500/30"
                            : user.role === "reviewer"
                            ? "bg-blue-900/30 text-blue-400 border-blue-500/30"
                            : "bg-gray-700/30 text-gray-400 border-gray-600/30"
                        }`}
                      >
                        {getRoleIcon(user.role)}
                        <span className="capitalize font-medium">
                          {user.role}
                        </span>
                      </span>
                      {/* Status - Only show if not active */}
                      {user.status !== "active" && (
                        <span
                          className={`px-2.5 py-1.5 rounded-md text-xs ${
                            user.status === "suspended"
                              ? "bg-yellow-900/30 text-yellow-400"
                              : "bg-red-900/30 text-red-400"
                          }`}
                        >
                          {user.status}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-gray-700/30 text-gray-300">
                        {getProviderIcon(user.provider)}
                        <span>{getProviderName(user.provider)}</span>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-700">
                      <div>
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                          <FaCalendarAlt size={10} />
                          <span>Last Active</span>
                        </div>
                        <p
                          className="text-white text-sm font-medium cursor-help"
                          title={formatFullDateTime(user.lastLoginAt)}
                        >
                          {formatRelativeTime(user.lastLoginAt)}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                          <FaChartBar size={10} />
                          <span>Submissions</span>
                        </div>
                        <p className="text-white text-sm font-medium">
                          {user.submissionsCount}
                        </p>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs mb-1">
                          Approved
                        </div>
                        <p className="text-green-400 text-sm font-medium">
                          {user.approvedCount}
                        </p>
                      </div>
                      <div>
                        <div className="text-gray-400 text-xs mb-1">
                          Approval Rate
                        </div>
                        <p className="text-white text-sm font-medium">
                          {approvalRate}%
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 sm:mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2.5 sm:p-2 bg-[#2d2d2d] text-white rounded-lg border border-gray-700 hover:border-[#107c10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                aria-label="Previous page"
              >
                <FaChevronLeft size={14} />
              </button>
              <span className="text-gray-400 text-xs sm:text-sm px-3 sm:px-4">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2.5 sm:p-2 bg-[#2d2d2d] text-white rounded-lg border border-gray-700 hover:border-[#107c10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                aria-label="Next page"
              >
                <FaChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Change Role Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="bg-[#2d2d2d] rounded-lg max-w-md w-full p-4 sm:p-6 border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Change Role
              </h3>
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-400 hover:text-white p-1 touch-manipulation"
                aria-label="Close"
              >
                <FaTimes size={20} />
              </button>
            </div>
            <p className="text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base">
              Change role for{" "}
              <strong className="text-white">{selectedUser.name}</strong>
            </p>
            <div className="space-y-2 mb-4 sm:mb-6">
              {(["user", "reviewer", "admin"] as const).map((role) => {
                const isAdminRole = role === "admin";
                const canSelectAdmin = canPromoteToAdmin();
                const isDisabled = isAdminRole && !canSelectAdmin;

                return (
                  <label
                    key={role}
                    className={`flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg transition-colors touch-manipulation ${
                      isDisabled
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer hover:bg-[#252525]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={selectedUser.role === role}
                      disabled={isDisabled}
                      onChange={() => {
                        if (!isDisabled) {
                          setSelectedUser({ ...selectedUser, role });
                        }
                      }}
                      className="text-[#107c10]"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      {getRoleIcon(role)}
                      <span className="text-white capitalize text-sm sm:text-base">
                        {role}
                      </span>
                      {isAdminRole && !canSelectAdmin && (
                        <span className="text-xs text-yellow-500 ml-auto">
                          Owner Only
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2.5 sm:py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm sm:text-base touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRoleChange(selectedUser.role)}
                className="flex-1 px-4 py-2.5 sm:py-2 bg-[#107c10] hover:bg-[#0d6b0d] text-white rounded-lg transition-colors text-sm sm:text-base touch-manipulation"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend/Block Modal */}
      {showSuspendModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="bg-[#2d2d2d] rounded-lg max-w-lg w-full border border-gray-700">
            {/* Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-900/30 rounded-lg">
                    <FaUserShield className="text-yellow-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Suspend or Block User
                    </h3>
                    <p className="text-sm text-gray-400 mt-0.5">
                      Temporarily or permanently restrict{" "}
                      <span className="text-white font-medium">
                        {selectedUser.name}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowSuspendModal(false);
                    setSelectedUser(null);
                    setSuspendDays(7);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FaTimes size={20} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Duration Options */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400 block mb-3">
                  Select suspension duration:
                </label>

                {/* Option to set as Active (for non-active users) */}
                {(selectedUser.status === "suspended" ||
                  selectedUser.status === "restricted" ||
                  selectedUser.status === "blocked") && (
                  <label className="flex items-center justify-between p-4 bg-green-900/20 rounded-lg cursor-pointer hover:bg-green-900/30 border border-green-500/30 hover:border-green-500/50 transition-all group">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="suspendDuration"
                        checked={suspendDays === -1}
                        onChange={() => setSuspendDays(-1)}
                        className="text-green-500 w-4 h-4"
                      />
                      <span className="text-green-300 font-medium">
                        Restore to Active
                      </span>
                    </div>
                    <span className="text-xs text-green-400/70 group-hover:text-green-400">
                      Remove all restrictions
                    </span>
                  </label>
                )}

                <label className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg cursor-pointer hover:bg-[#252525] border border-transparent hover:border-[#107c10]/50 transition-all group">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="suspendDuration"
                      checked={suspendDays === 3}
                      onChange={() => setSuspendDays(3)}
                      className="text-[#107c10] w-4 h-4"
                    />
                    <span className="text-white font-medium">3 Days</span>
                  </div>
                  <span className="text-xs text-gray-500 group-hover:text-gray-400">
                    Short suspension
                  </span>
                </label>

                <label className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg cursor-pointer hover:bg-[#252525] border border-transparent hover:border-[#107c10]/50 transition-all group">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="suspendDuration"
                      checked={suspendDays === 7}
                      onChange={() => setSuspendDays(7)}
                      className="text-[#107c10] w-4 h-4"
                    />
                    <span className="text-white font-medium">7 Days</span>
                  </div>
                  <span className="text-xs text-gray-500 group-hover:text-gray-400">
                    Standard suspension
                  </span>
                </label>

                <label className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg cursor-pointer hover:bg-[#252525] border border-transparent hover:border-[#107c10]/50 transition-all group">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="suspendDuration"
                      checked={suspendDays === 30}
                      onChange={() => setSuspendDays(30)}
                      className="text-[#107c10] w-4 h-4"
                    />
                    <span className="text-white font-medium">30 Days</span>
                  </div>
                  <span className="text-xs text-gray-500 group-hover:text-gray-400">
                    Extended suspension
                  </span>
                </label>

                <label className="flex items-center justify-between p-4 bg-orange-900/20 rounded-lg cursor-pointer hover:bg-orange-900/30 border border-orange-500/30 hover:border-orange-500/50 transition-all group">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="suspendDuration"
                      checked={suspendDays === -2}
                      onChange={() => setSuspendDays(-2)}
                      className="text-orange-500 w-4 h-4"
                    />
                    <span className="text-orange-300 font-medium">
                      Permanent Restriction
                    </span>
                  </div>
                  <span className="text-xs text-orange-400/70 group-hover:text-orange-400">
                    Can sign in
                  </span>
                </label>

                <label className="flex items-center justify-between p-4 bg-red-900/20 rounded-lg cursor-pointer hover:bg-red-900/30 border border-red-500/30 hover:border-red-500/50 transition-all group">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="suspendDuration"
                      checked={suspendDays === 0}
                      onChange={() => setSuspendDays(0)}
                      className="text-red-500 w-4 h-4"
                    />
                    <span className="text-red-300 font-medium">
                      Permanent Ban
                    </span>
                  </div>
                  <span className="text-xs text-red-400/70 group-hover:text-red-400">
                    Cannot sign in
                  </span>
                </label>
              </div>

              {/* Info Box */}
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  {suspendDays === -1 ? (
                    <>
                      <strong>Restore to Active:</strong> User will be able to
                      sign in and submit corrections normally.
                    </>
                  ) : suspendDays === -2 ? (
                    <>
                      <strong>Permanent Restriction:</strong> User can sign in
                      but cannot submit corrections (no expiration).
                    </>
                  ) : suspendDays === 0 ? (
                    <>
                      <strong>Permanent Ban:</strong> User will be unable to
                      sign in at all. Their provider will be added to the ban
                      list.
                    </>
                  ) : (
                    <>
                      <strong>Suspension:</strong> User can sign in but cannot
                      submit corrections for {suspendDays} day
                      {suspendDays !== 1 ? "s" : ""}.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setShowSuspendModal(false);
                  setSelectedUser(null);
                  setSuspendDays(7);
                }}
                className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (suspendDays === -1) {
                    // Restore to active
                    handleSuspend(-1);
                  } else if (suspendDays === -2) {
                    // Permanent restriction
                    handleSuspend(-2);
                  } else {
                    handleSuspend(suspendDays === 0 ? null : suspendDays);
                  }
                }}
                className={`flex-1 px-4 py-2.5 rounded-lg transition-colors font-medium ${
                  suspendDays === -1
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : suspendDays === -2
                    ? "bg-orange-600 hover:bg-orange-700 text-white"
                    : suspendDays === 0
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-yellow-600 hover:bg-yellow-700 text-white"
                }`}
              >
                {suspendDays === -1
                  ? "Restore User"
                  : suspendDays === -2
                  ? "Restrict User"
                  : suspendDays === 0
                  ? "Ban User"
                  : "Suspend User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Account Confirmation Modal */}
      {showRestoreModal && userToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
          <div className="bg-[#2d2d2d] rounded-lg max-w-md w-full border border-gray-700">
            {/* Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-900/30 rounded-lg">
                    <FaTrashRestore className="text-green-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      Restore Account
                    </h3>
                    <p className="text-sm text-gray-400 mt-0.5">
                      Restore {userToRestore.archivedName || userToRestore.name}
                      &apos;s account
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowRestoreModal(false);
                    setUserToRestore(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FaTimes size={20} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {(() => {
                const deletedAt = userToRestore.deletedAt
                  ? new Date(userToRestore.deletedAt)
                  : new Date();
                const now = new Date();
                const daysSinceDeletion = Math.floor(
                  (now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24)
                );
                const beyondGracePeriod = daysSinceDeletion > 30;

                if (beyondGracePeriod) {
                  return (
                    <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
                      <p className="text-sm text-yellow-300">
                        <strong>⚠️ Developer Override Required</strong>
                      </p>
                      <p className="text-sm text-yellow-200 mt-2">
                        This account was deleted {daysSinceDeletion} days ago
                        (beyond the 30-day grace period).
                      </p>
                      <p className="text-sm text-yellow-200 mt-1">
                        Restoring this account requires developer override.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-sm text-blue-300">
                      This will restore the account and allow the user to sign
                      in again.
                    </p>
                    <p className="text-sm text-blue-200 mt-2">
                      All their corrections and audit logs will be restored with
                      their original name.
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  setUserToRestore(null);
                }}
                className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRestoreUser}
                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
              >
                Restore Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message Toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <span className="text-2xl">✓</span>
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
