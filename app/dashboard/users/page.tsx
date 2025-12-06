"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import ConfirmDialog from "@/components/ConfirmDialog";
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
import { safeLog } from "@/lib/security";
import { useToast } from "@/components/ui/toast-context";
import { useCSRF } from "@/hooks/useCSRF";
import { useDebounce } from "@/hooks/useDebounce";

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
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const { csrfToken } = useCSRF();
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
  const [suspendReason, setSuspendReason] = useState<string>("");
  const [roleChangeReason, setRoleChangeReason] = useState<string>("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmDialogProps, setConfirmDialogProps] = useState<{
    title: string;
    message: string;
    variant: "danger" | "warning" | "info";
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to show confirmation dialog
  const showConfirmation = (
    title: string,
    message: string,
    variant: "danger" | "warning" | "info",
    onConfirm: () => void
  ) => {
    setConfirmDialogProps({ title, message, variant });
    setConfirmAction(() => onConfirm);
    setShowConfirmDialog(true);
  };

  // Fetch users from API
  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        const response = await fetch("/api/users");
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        } else {
          safeLog.error("Failed to fetch users");
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        showToast("Failed to load users. Please try again.", 5000, "error");
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [showToast]);

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  // Filter and sort users
  useEffect(() => {
    let filtered = [...users];

    // Show/hide deleted users - handle this FIRST to avoid conflicts with other filters
    if (!showDeletedUsers) {
      // Hide deleted users and apply other filters
      filtered = filtered.filter((u) => u.status !== "deleted");

      // Search filter (using debounced value)
      if (debouncedSearchQuery) {
        filtered = filtered.filter(
          (u) =>
            u.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
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

      // Still allow search on deleted users (using debounced value)
      if (debouncedSearchQuery) {
        filtered = filtered.filter(
          (u) =>
            u.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
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
    debouncedSearchQuery,
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

  const handleSort = useCallback((column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  }, [sortBy, sortOrder]);

  const getProviderIcon = (provider: string): React.ReactElement | null => {
    switch (provider) {
      case "google":
        return <FaGoogle className="text-red-500" size={16} />;
      case "github":
        return <FaGithub className="text-[rgb(var(--text-secondary))]" size={16} />;
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
      safeLog.error("Failed to copy:", err);
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
        return <FaUser className="text-[rgb(var(--text-muted))]" size={16} />;
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
      showToast(
        `Cannot restore this account. Grace period (30 days) has expired. Deleted ${daysSinceDeletion} days ago. Contact a developer for admin override.`,
        6000,
        "error"
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
          "X-CSRF-Token": csrfToken || "",
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
      safeLog.error("Error restoring user:", error);
      
      // Refresh UI
      if (pathname === "/dashboard/users") {
        router.refresh();
      }
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to restore user account",
        5000,
        "error"
      );
    }
  };

  const handleRoleChange = async (newRole: string) => {
    if (!selectedUser) return;

    // Check if demoting (user < reviewer < admin)
    const roleHierarchy = { user: 0, reviewer: 1, admin: 2 };
    const currentRoleLevel = roleHierarchy[selectedUser.role as keyof typeof roleHierarchy] ?? 0;
    const newRoleLevel = roleHierarchy[newRole as keyof typeof roleHierarchy] ?? 0;
    const isDemoting = newRoleLevel < currentRoleLevel;

    // Require reason if demoting
    if (isDemoting && !roleChangeReason.trim()) {
      showToast("Please provide a reason for demoting this user.", 4000, "error");
      return;
    }

    // Show confirmation for role changes
    const roleNames: Record<string, string> = { user: "User", reviewer: "Reviewer", admin: "Admin" };
    const action = isDemoting ? "demote" : "promote";
    showConfirmation(
      `Confirm Role Change`,
      `Are you sure you want to ${action} ${selectedUser.name} from ${roleNames[selectedUser.role]} to ${roleNames[newRole]}?${isDemoting ? " This action requires a reason." : ""}`,
      isDemoting ? "warning" : "info",
      async () => {
        setShowConfirmDialog(false);
        await executeRoleChange(newRole);
      }
    );
  };

  const executeRoleChange = async (newRole: string) => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        body: JSON.stringify({ 
          role: newRole,
          moderationReason: roleChangeReason.trim() || undefined,
        }),
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

      // Refresh UI
      if (pathname === "/dashboard/users") {
        router.refresh();
      }

      // If updating the current user's role, show a message that they need to refresh
      if (selectedUser.id === session?.user?.id) {
        showToast(
          "Your role has been updated. Please refresh the page to see the changes.",
          5000,
          "success"
        );
      } else {
        showToast(`User role updated to ${newRole}`, 3000, "success");
      }

      setShowRoleModal(false);
      setSelectedUser(null);
      setRoleChangeReason("");
    } catch (error) {
      safeLog.error("Error updating user role:", error);
      showToast(
        error instanceof Error ? error.message : "Failed to update user role",
        5000,
        "error"
      );
    }
  };

  const handleSuspend = async (days: number | null) => {
    if (!selectedUser) return;

    // Require reason for all moderation actions except restore
    if (days !== -1 && !suspendReason.trim()) {
      showToast("Please provide a reason for this moderation action.", 4000, "error");
      return;
    }

    try {
      // Handle restore to active
      if (days === -1) {
        const response = await fetch(`/api/users/${selectedUser.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken || "",
          },
          body: JSON.stringify({
            status: "active",
            moderationReason: suspendReason.trim() || undefined,
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
        setSuspendReason("");

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
            "X-CSRF-Token": csrfToken || "",
          },
          body: JSON.stringify({
            status: "restricted",
            role: "user", // Downgrade to regular user for permanent restrictions
            moderationReason: suspendReason.trim(),
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
        setSuspendReason("");

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
        moderationReason: string;
      } = {
        status: newStatus,
        moderationReason: suspendReason.trim(),
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
          "X-CSRF-Token": csrfToken || "",
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
      setSuspendDays(7);
      setSuspendReason(""); // Reset to default

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
      safeLog.error("Error updating user status:", error);
      
      // Refresh UI
      if (pathname === "/dashboard/users") {
        router.refresh();
      }
      showToast(
        error instanceof Error ? error.message : "Failed to update user status",
        5000,
        "error"
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
    title,
  }: {
    column: string;
    label: string;
    className?: string;
    title?: string;
  }) => {
    const isActive = sortBy === column;
    return (
      <button
        onClick={() => handleSort(column)}
        className={`flex items-center gap-2 hover:text-[rgb(var(--text-primary))] transition-colors ${className} ${
          isActive ? "text-[rgb(var(--text-primary))]" : "text-[rgb(var(--text-secondary))]"
        }`}
        title={title || `Sort by ${label}`}
        aria-label={`Sort by ${label}`}
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
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[rgb(var(--text-primary))] mb-1 sm:mb-2">
              User Management
            </h1>
            <p className="text-[rgb(var(--text-secondary))] text-xs sm:text-sm md:text-base">
              Manage user roles, permissions, and access
            </p>
          </div>

          {/* Search and Controls */}
          <div className="bg-[rgb(var(--bg-card))] rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            {/* Search Bar */}
            <div className="relative mb-3 sm:mb-4">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[rgb(var(--text-muted))]" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none text-sm sm:text-base"
              />
            </div>

            {/* Filter Toggle (Mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden w-full flex items-center justify-center gap-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] py-2.5 rounded-lg border border-[rgb(var(--border-color))] mb-3 text-sm"
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
                    : "bg-[rgb(var(--bg-card-alt))] border-[rgb(var(--border-color))] text-[rgb(var(--text-primary))] hover:border-[#107c10]"
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
                className="w-full md:w-auto px-3 sm:px-4 py-2 pr-10 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none text-sm sm:text-base"
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
                className="w-full md:w-auto px-3 sm:px-4 py-2 pr-10 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none text-sm sm:text-base"
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
          <div className="text-[rgb(var(--text-secondary))] text-xs sm:text-sm mb-3 sm:mb-4">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)}{" "}
            of {filteredUsers.length} users
          </div>

          {/* Users Table - Desktop (XL screens only) */}
          <div className="hidden xl:block bg-[rgb(var(--bg-card))] rounded-xl border border-[rgb(var(--border-color))] overflow-hidden shadow-2xl">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] text-xs font-semibold uppercase tracking-wider">
              <div className="col-span-2 flex items-center">
                <SortableHeader column="name" label="User" />
              </div>
              <div className="col-span-2 flex items-center">
                <span className="text-[rgb(var(--text-secondary))]">Provider ID</span>
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
              {loading ? (
                <div className="p-12 text-center text-[rgb(var(--text-secondary))]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#107c10] mx-auto mb-4"></div>
                  <p>Loading users...</p>
                </div>
              ) : paginatedUsers.length === 0 ? (
                <div className="p-12 text-center text-[rgb(var(--text-secondary))]">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[rgb(var(--bg-card-alt))] mb-4">
                    <FaUsers size={28} className="text-[rgb(var(--text-muted))]" />
                  </div>
                  <p className="text-lg font-medium">No users found</p>
                  <p className="text-sm text-[rgb(var(--text-muted))] mt-1">
                    Try adjusting your filters
                  </p>
                </div>
              ) : (
                paginatedUsers.map((user) => {
                  // Calculate approval rate excluding pending submissions
                  // Only count approved + rejected in denominator
                  const reviewedCount = user.approvedCount + user.rejectedCount;
                  const approvalRate =
                    reviewedCount > 0
                      ? ((user.approvedCount / reviewedCount) * 100).toFixed(1)
                      : "0.0";

                  return (
                    <div
                      key={user.id}
                      className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-[rgb(var(--bg-card-alt))] transition-all duration-200 group"
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
                            loading="lazy"
                            unoptimized
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#107c10] to-[#0d6b0d] flex items-center justify-center text-white font-bold text-base ring-2 ring-[rgb(var(--border-color))] group-hover:ring-[#107c10]/30 transition-all">
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
                                    className="text-[rgb(var(--text-primary))] font-semibold truncate text-sm block"
                                    title={
                                      user.archivedName
                                        ? `Original name: ${user.archivedName}`
                                        : undefined
                                    }
                                  >
                                    {user.archivedName || user.name}
                                  </span>
                                  <span className="text-xs text-[rgb(var(--text-muted))] truncate block">
                                    (Deleted Account)
                                  </span>
                                </div>
                              ) : (
                                <Link
                                  href={`/profile/${user.id}`}
                                  className="text-[rgb(var(--text-primary))] font-semibold truncate text-sm hover:text-[#107c10] transition-colors block"
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
                                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] text-xs rounded whitespace-nowrap opacity-0 group-hover/icon:opacity-100 transition-opacity pointer-events-none z-10 border border-[rgb(var(--border-color))] shadow-lg">
                                  Admin
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Provider ID */}
                      <div className="col-span-2 flex items-center text-sm group/provider-id">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-mono text-xs text-[rgb(var(--text-secondary))] transition-all duration-200 blur-[3px] group-hover/provider-id:blur-none cursor-default" title={user.providerInfo?.providerAccountId || user.id}>
                            {user.providerInfo?.providerAccountId || user.id}
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                user.providerInfo?.providerAccountId || user.id,
                                user.id
                              )
                            }
                            className="relative flex-shrink-0 text-[rgb(var(--text-secondary))] hover:text-[#107c10] transition-colors p-1 group/copy"
                            title="Copy to clipboard"
                          >
                            {copiedId === user.id ? (
                              <span className="text-green-400 text-xs">✓</span>
                            ) : (
                              <FaCopy size={12} />
                            )}
                            <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1 bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] text-xs rounded whitespace-nowrap opacity-0 group-hover/copy:opacity-100 transition-opacity pointer-events-none z-10 border border-[rgb(var(--border-color))] shadow-lg">
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
                              ? "bg-red-500/20 dark:bg-red-900/20 text-red-600 dark:text-red-300 border-red-500/50 dark:border-red-500/40"
                              : user.role === "reviewer"
                              ? "bg-blue-500/20 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 border-blue-500/50 dark:border-blue-500/40"
                              : "bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] border-[rgb(var(--border-color))]"
                          }`}
                        >
                          {getRoleIcon(user.role)}
                          <span className="capitalize">{user.role}</span>
                        </span>
                      </div>

                      {/* Status - Only show if not active */}
                      <div className="col-span-1 flex items-center justify-center">
                        {user.status === "active" ? (
                          <span className="px-3 py-1.5 rounded-md text-xs font-medium bg-green-500/20 dark:bg-green-900/20 text-green-600 dark:text-green-300 border border-green-500/50 dark:border-green-500/40">
                            Active
                          </span>
                        ) : user.status === "suspended" ? (
                          <span className="px-3 py-1.5 rounded-md text-xs font-medium bg-yellow-500/20 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-300 border border-yellow-500/50 dark:border-yellow-500/40">
                            Suspended
                          </span>
                        ) : user.status === "restricted" ? (
                          <span className="px-3 py-1.5 rounded-md text-xs font-medium bg-orange-500/20 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300 border border-orange-500/50 dark:border-orange-500/40">
                            Restricted
                          </span>
                        ) : user.status === "blocked" ? (
                          <span className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-500/20 dark:bg-red-900/20 text-red-600 dark:text-red-300 border border-red-500/50 dark:border-red-500/40">
                            Blocked
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 rounded-md text-xs font-medium bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] border border-[rgb(var(--border-color))]">
                            {user.status.charAt(0).toUpperCase() +
                              user.status.slice(1)}
                          </span>
                        )}
                      </div>

                      {/* Provider */}
                      <div className="col-span-1 flex items-center justify-center">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[rgb(var(--bg-card-alt))]">
                          {getProviderIcon(user.provider)}
                          <span className="text-xs text-[rgb(var(--text-secondary))] font-medium">
                            {getProviderName(user.provider)}
                          </span>
                        </div>
                      </div>

                      {/* Last Active */}
                      <div className="col-span-2 flex items-center justify-center text-sm text-[rgb(var(--text-secondary))] font-medium">
                        <span
                          title={formatFullDateTime(user.lastLoginAt)}
                          className="cursor-help"
                        >
                          {formatRelativeTime(user.lastLoginAt)}
                        </span>
                      </div>

                      {/* Submissions */}
                      <div className="col-span-1 flex items-center justify-center">
                        <span className="text-sm font-semibold text-[rgb(var(--text-primary))] px-3 py-1 rounded-md bg-[#107c10]/10">
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
                            aria-label={`Actions for ${user.name}`}
                            aria-expanded={openMenuId === user.id}
                            aria-haspopup="true"
                            onKeyDown={(e) => {
                              if (e.key === "Escape" && openMenuId === user.id) {
                                setOpenMenuId(null);
                              }
                            }}
                          >
                            <FaEllipsisV className="text-[rgb(var(--text-secondary))] group-hover:text-[rgb(var(--text-primary))]" />
                          </button>
                        )}

                        {/* Dropdown Menu */}
                        {openMenuId === user.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 mt-2 w-64 bg-[rgb(var(--bg-card))] border border-[rgb(var(--border-color))] rounded-lg shadow-xl z-20">
                              <div className="py-1">
                                {/* Restore Account - Only for deleted users */}
                                {user.status === "deleted" && (
                                  <button
                                    onClick={() => {
                                      handleRestoreUserClick(user);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-green-500 hover:bg-[rgb(var(--bg-card-alt))] flex items-center gap-2"
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
                                          className="w-full px-4 py-2 text-left text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-card-alt))] flex items-center gap-2"
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
                                        className="w-full px-4 py-2 text-left text-yellow-500 hover:bg-[rgb(var(--bg-card-alt))] flex items-center gap-2"
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
            {loading ? (
              <div className="bg-[rgb(var(--bg-card))] rounded-lg p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#107c10] mx-auto mb-4"></div>
                <p className="text-[rgb(var(--text-secondary))]">Loading users...</p>
              </div>
            ) : paginatedUsers.length === 0 ? (
              <div className="bg-[rgb(var(--bg-card))] rounded-lg p-8 text-center text-[rgb(var(--text-secondary))]">
                No users found
              </div>
            ) : (
              paginatedUsers.map((user) => {
                // Calculate approval rate excluding pending submissions
                // Only count approved + rejected in denominator
                const reviewedCount = user.approvedCount + user.rejectedCount;
                const approvalRate =
                  reviewedCount > 0
                    ? ((user.approvedCount / reviewedCount) * 100).toFixed(1)
                    : "0.0";

                return (
                  <div
                    key={user.id}
                    className="bg-[rgb(var(--bg-card))] rounded-lg border border-[rgb(var(--border-color))] p-4 space-y-3"
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
                              loading="lazy"
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
                                    className="text-[rgb(var(--text-primary))] font-semibold truncate text-base block"
                                    title={
                                      user.archivedName
                                        ? `Original name: ${user.archivedName}`
                                        : undefined
                                    }
                                  >
                                    {user.archivedName || user.name}
                                  </span>
                                  <span className="text-xs text-[rgb(var(--text-muted))] truncate block">
                                    (Deleted Account)
                                  </span>
                                </div>
                              ) : (
                                <Link
                                  href={`/profile/${user.id}`}
                                  className="text-[rgb(var(--text-primary))] font-semibold truncate text-base hover:text-[#107c10] transition-colors block"
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
                                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-[rgb(var(--border-color))] shadow-lg">
                                  Admin
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm group/provider-id">
                            <span className="truncate font-mono text-xs text-[rgb(var(--text-secondary))] transition-all duration-200 blur-[3px] group-hover/provider-id:blur-none cursor-default" title={user.providerInfo?.providerAccountId || user.id}>
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
                              className="relative flex-shrink-0 text-[rgb(var(--text-secondary))] hover:text-[#107c10] transition-colors p-1 group/copy"
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
                            className="p-2.5 hover:bg-[rgb(var(--bg-card))] rounded-lg transition-colors touch-manipulation"
                            aria-label="User actions"
                          >
                            <FaEllipsisV className="text-[rgb(var(--text-secondary))]" size={18} />
                          </button>
                        )}

                        {/* Dropdown Menu */}
                        {openMenuId === user.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 mt-2 w-64 bg-[rgb(var(--bg-card))] border border-[rgb(var(--border-color))] rounded-lg shadow-xl z-20">
                              <div className="py-1">
                                {/* Restore Account - Only for deleted users */}
                                {user.status === "deleted" && (
                                  <button
                                    onClick={() => {
                                      handleRestoreUserClick(user);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-4 py-3 text-left text-green-500 hover:bg-[rgb(var(--bg-card-alt))] flex items-center gap-2 text-sm touch-manipulation"
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
                                          className="w-full px-4 py-3 text-left text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-card-alt))] flex items-center gap-2 text-sm touch-manipulation"
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
                                        className="w-full px-4 py-3 text-left text-yellow-600 dark:text-yellow-400 hover:bg-[rgb(var(--bg-card-alt))] flex items-center gap-2 text-sm touch-manipulation"
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
                            ? "bg-red-500/20 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-500/50 dark:border-red-500/30"
                            : user.role === "reviewer"
                            ? "bg-blue-500/20 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-500/50 dark:border-blue-500/30"
                            : "bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] border-[rgb(var(--border-color))]"
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
                              ? "bg-yellow-500/20 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                              : "bg-red-500/20 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                          }`}
                        >
                          {user.status}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))]">
                        {getProviderIcon(user.provider)}
                        <span>{getProviderName(user.provider)}</span>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[rgb(var(--border-color))]">
                      <div>
                        <div className="flex items-center gap-1.5 text-[rgb(var(--text-muted))] text-xs mb-1">
                          <FaCalendarAlt size={10} />
                          <span>Last Active</span>
                        </div>
                        <p
                          className="text-[rgb(var(--text-primary))] text-sm font-medium cursor-help"
                          title={formatFullDateTime(user.lastLoginAt)}
                        >
                          {formatRelativeTime(user.lastLoginAt)}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-[rgb(var(--text-muted))] text-xs mb-1">
                          <FaChartBar size={10} />
                          <span>Submissions</span>
                        </div>
                        <p className="text-[rgb(var(--text-primary))] text-sm font-medium">
                          {user.submissionsCount}
                        </p>
                      </div>
                      <div>
                        <div className="text-[rgb(var(--text-muted))] text-xs mb-1">
                          Approved
                        </div>
                        <p className="text-green-600 dark:text-green-400 text-sm font-medium">
                          {user.approvedCount}
                        </p>
                      </div>
                      <div>
                        <div className="text-[rgb(var(--text-muted))] text-xs mb-1">
                          Approval Rate
                        </div>
                        <p className="text-[rgb(var(--text-primary))] text-sm font-medium">
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
                className="p-2.5 sm:p-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:border-[#107c10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                aria-label="Previous page"
                aria-disabled={currentPage === 1}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft" && currentPage > 1) {
                    setCurrentPage((p) => p - 1);
                  }
                }}
              >
                <FaChevronLeft size={14} />
              </button>
              <span className="text-[rgb(var(--text-secondary))] text-xs sm:text-sm px-3 sm:px-4" aria-live="polite" aria-atomic="true">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2.5 sm:p-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] hover:border-[#107c10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                aria-label="Next page"
                aria-disabled={currentPage === totalPages}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" && currentPage < totalPages) {
                    setCurrentPage((p) => p + 1);
                  }
                }}
              >
                <FaChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Change Role Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/75 p-4">
          <div className="bg-[rgb(var(--bg-card))] rounded-lg max-w-md w-full p-4 sm:p-6 border border-[rgb(var(--border-color))] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-[rgb(var(--text-primary))]">
                Change Role
              </h3>
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                  setRoleChangeReason("");
                }}
                className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] p-1 touch-manipulation"
                aria-label="Close"
              >
                <FaTimes size={20} />
              </button>
            </div>
            <p className="text-[rgb(var(--text-secondary))] mb-4 sm:mb-6 text-sm sm:text-base">
              Change role for{" "}
              <strong className="text-[rgb(var(--text-primary))]">{selectedUser.name}</strong>
            </p>
            <div className="space-y-2 mb-4 sm:mb-6">
              {(["user", "reviewer", "admin"] as const).map((role) => {
                const isAdminRole = role === "admin";
                const canSelectAdmin = canPromoteToAdmin();
                const isDisabled = isAdminRole && !canSelectAdmin;

                return (
                  <label
                    key={role}
                    className={`flex items-center gap-3 p-3 bg-[rgb(var(--bg-card-alt))] rounded-lg transition-colors touch-manipulation ${
                      isDisabled
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer hover:bg-[rgb(var(--bg-card))]"
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
                      <span className="text-[rgb(var(--text-primary))] capitalize text-sm sm:text-base">
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
            
            {/* Reason Field - Only required when demoting */}
            {(() => {
              const roleHierarchy = { user: 0, reviewer: 1, admin: 2 };
              const currentRoleLevel = roleHierarchy[selectedUser.role as keyof typeof roleHierarchy] ?? 0;
              const selectedRoleLevel = roleHierarchy[selectedUser.role as keyof typeof roleHierarchy] ?? 0;
              const isDemoting = selectedRoleLevel < currentRoleLevel;
              
              return (
                <div className="mb-4 sm:mb-6">
                  <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                    Reason {isDemoting && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    value={roleChangeReason}
                    onChange={(e) => setRoleChangeReason(e.target.value)}
                    placeholder={isDemoting ? "Enter reason for demoting this user..." : "Optional reason for role change..."}
                    rows={3}
                    className="w-full px-4 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none resize-none"
                    required={isDemoting}
                  />
                  {isDemoting && (
                    <p className="text-xs text-red-400 mt-1">
                      A reason is required when demoting a user.
                    </p>
                  )}
                </div>
              );
            })()}
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                  setRoleChangeReason("");
                }}
                className="flex-1 px-4 py-2.5 sm:py-2 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] rounded-lg transition-colors text-sm sm:text-base touch-manipulation border border-[rgb(var(--border-color))]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/75 p-4">
          <div className="bg-[rgb(var(--bg-card))] rounded-lg max-w-lg w-full border border-[rgb(var(--border-color))]">
            {/* Header */}
            <div className="p-6 border-b border-[rgb(var(--border-color))]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/20 dark:bg-yellow-900/30 rounded-lg">
                    <FaUserShield className="text-yellow-600 dark:text-yellow-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[rgb(var(--text-primary))]">
                      Suspend or Block User
                    </h3>
                    <p className="text-sm text-[rgb(var(--text-secondary))] mt-0.5">
                      Temporarily or permanently restrict{" "}
                      <span className="text-[rgb(var(--text-primary))] font-medium">
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
                    setSuspendReason("");
                  }}
                  className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
                >
                  <FaTimes size={20} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Duration Options */}
              <div className="space-y-2">
                <label className="text-sm text-[rgb(var(--text-secondary))] block mb-3">
                  Select suspension duration:
                </label>

                {/* Option to set as Active (for non-active users) */}
                {(selectedUser.status === "suspended" ||
                  selectedUser.status === "restricted" ||
                  selectedUser.status === "blocked") && (
                  <label className="flex items-center justify-between p-4 bg-green-500/20 dark:bg-green-900/20 rounded-lg cursor-pointer hover:bg-green-500/30 dark:hover:bg-green-900/30 border border-green-500/50 dark:border-green-500/30 hover:border-green-500/70 dark:hover:border-green-500/50 transition-all group">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="suspendDuration"
                        checked={suspendDays === -1}
                        onChange={() => setSuspendDays(-1)}
                        className="text-green-500 w-4 h-4"
                      />
                      <span className="text-green-600 dark:text-green-300 font-medium">
                        Restore to Active
                      </span>
                    </div>
                    <span className="text-xs text-green-600/70 dark:text-green-400/70 group-hover:text-green-600 dark:group-hover:text-green-400">
                      Remove all restrictions
                    </span>
                  </label>
                )}

                <label className="flex items-center justify-between p-4 bg-[rgb(var(--bg-card-alt))] rounded-lg cursor-pointer hover:bg-[rgb(var(--bg-card))] border border-transparent hover:border-[#107c10]/50 transition-all group">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="suspendDuration"
                      checked={suspendDays === 3}
                      onChange={() => setSuspendDays(3)}
                      className="text-[#107c10] w-4 h-4"
                    />
                    <span className="text-[rgb(var(--text-primary))] font-medium">3 Days</span>
                  </div>
                  <span className="text-xs text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--text-secondary))]">
                    Short suspension
                  </span>
                </label>

                <label className="flex items-center justify-between p-4 bg-[rgb(var(--bg-card-alt))] rounded-lg cursor-pointer hover:bg-[rgb(var(--bg-card))] border border-transparent hover:border-[#107c10]/50 transition-all group">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="suspendDuration"
                      checked={suspendDays === 7}
                      onChange={() => setSuspendDays(7)}
                      className="text-[#107c10] w-4 h-4"
                    />
                    <span className="text-[rgb(var(--text-primary))] font-medium">7 Days</span>
                  </div>
                  <span className="text-xs text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--text-secondary))]">
                    Standard suspension
                  </span>
                </label>

                <label className="flex items-center justify-between p-4 bg-[rgb(var(--bg-card-alt))] rounded-lg cursor-pointer hover:bg-[rgb(var(--bg-card))] border border-transparent hover:border-[#107c10]/50 transition-all group">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="suspendDuration"
                      checked={suspendDays === 30}
                      onChange={() => setSuspendDays(30)}
                      className="text-[#107c10] w-4 h-4"
                    />
                    <span className="text-[rgb(var(--text-primary))] font-medium">30 Days</span>
                  </div>
                  <span className="text-xs text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--text-secondary))]">
                    Extended suspension
                  </span>
                </label>

                <label className="flex items-center justify-between p-4 bg-orange-500/20 dark:bg-orange-900/20 rounded-lg cursor-pointer hover:bg-orange-500/30 dark:hover:bg-orange-900/30 border border-orange-500/50 dark:border-orange-500/30 hover:border-orange-500/70 dark:hover:border-orange-500/50 transition-all group">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="suspendDuration"
                      checked={suspendDays === -2}
                      onChange={() => setSuspendDays(-2)}
                      className="text-orange-500 w-4 h-4"
                    />
                    <span className="text-orange-600 dark:text-orange-300 font-medium">
                      Permanent Restriction
                    </span>
                  </div>
                  <span className="text-xs text-orange-600/70 dark:text-orange-400/70 group-hover:text-orange-600 dark:group-hover:text-orange-400">
                    Can sign in
                  </span>
                </label>

                <label className="flex items-center justify-between p-4 bg-red-500/20 dark:bg-red-900/20 rounded-lg cursor-pointer hover:bg-red-500/30 dark:hover:bg-red-900/30 border border-red-500/50 dark:border-red-500/30 hover:border-red-500/70 dark:hover:border-red-500/50 transition-all group">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="suspendDuration"
                      checked={suspendDays === 0}
                      onChange={() => setSuspendDays(0)}
                      className="text-red-500 w-4 h-4"
                    />
                    <span className="text-red-600 dark:text-red-300 font-medium">
                      Permanent Ban
                    </span>
                  </div>
                  <span className="text-xs text-red-600/70 dark:text-red-400/70 group-hover:text-red-600 dark:group-hover:text-red-400">
                    Cannot sign in
                  </span>
                </label>
              </div>

              {/* Reason Field */}
              <div>
                <label className="block text-sm font-medium text-[rgb(var(--text-secondary))] mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Enter reason for this moderation action..."
                  rows={3}
                  className="w-full px-4 py-2 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[#107c10] focus:outline-none resize-none"
                  required
                />
                <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">
                  A reason is required for all moderation actions.
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-500/20 dark:bg-blue-900/20 border border-blue-500/50 dark:border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-600 dark:text-blue-300">
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
            <div className="p-6 border-t border-[rgb(var(--border-color))] flex gap-3">
              <button
                onClick={() => {
                  setShowSuspendModal(false);
                  setSelectedUser(null);
                  setSuspendDays(7);
                  setSuspendReason("");
                }}
                className="flex-1 px-4 py-2.5 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] rounded-lg transition-colors font-medium border border-[rgb(var(--border-color))]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (suspendDays === -1) {
                    // Restore to active - less destructive, no confirmation needed
                    handleSuspend(-1);
                  } else if (suspendDays === -2) {
                    // Permanent restriction - show confirmation
                    showConfirmation(
                      "Confirm Permanent Restriction",
                      `Are you sure you want to permanently restrict ${selectedUser.name}? They will be able to sign in but cannot submit corrections.`,
                      "warning",
                      () => {
                        setShowSuspendModal(false);
                        handleSuspend(-2);
                      }
                    );
                  } else if (suspendDays === 0) {
                    // Permanent ban - show confirmation
                    showConfirmation(
                      "Confirm Permanent Ban",
                      `Are you sure you want to permanently ban ${selectedUser.name}? They will be unable to sign in and their provider will be added to the ban list. This action cannot be easily undone.`,
                      "danger",
                      () => {
                        setShowSuspendModal(false);
                        handleSuspend(null);
                      }
                    );
                  } else {
                    // Temporary suspension - show confirmation
                    showConfirmation(
                      "Confirm Suspension",
                      `Are you sure you want to suspend ${selectedUser.name} for ${suspendDays} day${suspendDays !== 1 ? "s" : ""}?`,
                      "warning",
                      () => {
                        setShowSuspendModal(false);
                        handleSuspend(suspendDays);
                      }
                    );
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/75 p-4">
          <div className="bg-[rgb(var(--bg-card))] rounded-lg max-w-md w-full border border-[rgb(var(--border-color))]">
            {/* Header */}
            <div className="p-6 border-b border-[rgb(var(--border-color))]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 dark:bg-green-900/30 rounded-lg">
                    <FaTrashRestore className="text-green-600 dark:text-green-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[rgb(var(--text-primary))]">
                      Restore Account
                    </h3>
                    <p className="text-sm text-[rgb(var(--text-secondary))] mt-0.5">
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
                  className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
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
                    <div className="bg-yellow-500/20 dark:bg-yellow-900/20 border border-yellow-500/50 dark:border-yellow-500/30 rounded-lg p-4">
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        <strong>⚠️ Developer Override Required</strong>
                      </p>
                      <p className="text-sm text-yellow-700/90 dark:text-yellow-200 mt-2">
                        This account was deleted {daysSinceDeletion} days ago
                        (beyond the 30-day grace period).
                      </p>
                      <p className="text-sm text-yellow-700/90 dark:text-yellow-200 mt-1">
                        Restoring this account requires developer override.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="bg-blue-500/20 dark:bg-blue-900/20 border border-blue-500/50 dark:border-blue-500/30 rounded-lg p-4">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      This will restore the account and allow the user to sign
                      in again.
                    </p>
                    <p className="text-sm text-blue-700/90 dark:text-blue-200 mt-2">
                      All their corrections and audit logs will be restored with
                      their original name.
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[rgb(var(--border-color))] flex gap-3">
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  setUserToRestore(null);
                }}
                className="flex-1 px-4 py-2.5 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] rounded-lg transition-colors font-medium border border-[rgb(var(--border-color))]"
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

      {/* Confirmation Dialog */}
      {showConfirmDialog && confirmDialogProps && confirmAction && (
        <ConfirmDialog
          isOpen={showConfirmDialog}
          title={confirmDialogProps.title}
          message={confirmDialogProps.message}
          variant={confirmDialogProps.variant}
          onConfirm={() => {
            confirmAction();
            setShowConfirmDialog(false);
            setConfirmAction(null);
            setConfirmDialogProps(null);
          }}
          onCancel={() => {
            setShowConfirmDialog(false);
            setConfirmAction(null);
            setConfirmDialogProps(null);
          }}
        />
      )}
    </DashboardLayout>
  );
}
