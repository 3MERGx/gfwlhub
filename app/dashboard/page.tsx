"use client";

import { useState, useEffect } from "react";
import {
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaChartBar,
  FaGamepad,
  FaTrophy,
  FaFlask,
  FaArrowRight,
} from "react-icons/fa";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useSession } from "next-auth/react";
import { safeLog } from "@/lib/security";

interface Stats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  blockedUsers: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  totalChanges: number;
}

export default function AdminPanel() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/dashboard/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else if (response.status === 403) {
          // User doesn't have permission - this is expected for regular users
          // Don't set error state, just leave stats as null
          safeLog.log("User doesn't have permission to view stats");
          setStats(null);
        } else {
          safeLog.error("Failed to fetch stats");
          // Set defaults on error
          setStats({
            totalUsers: 0,
            activeUsers: 0,
            suspendedUsers: 0,
            blockedUsers: 0,
            totalSubmissions: 0,
            pendingSubmissions: 0,
            approvedSubmissions: 0,
            rejectedSubmissions: 0,
            totalChanges: 0,
          });
        }
      } catch (error) {
        safeLog.error("Error fetching stats:", error);
        // Set defaults on error
        setStats({
          totalUsers: 0,
          activeUsers: 0,
          suspendedUsers: 0,
          blockedUsers: 0,
          totalSubmissions: 0,
          pendingSubmissions: 0,
          approvedSubmissions: 0,
          rejectedSubmissions: 0,
          totalChanges: 0,
        });
      }
    }
    fetchStats();
  }, []);

  return (
    <DashboardLayout requireRole="reviewer">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-4 sm:mb-6 md:mb-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[rgb(var(--text-primary))] mb-1 sm:mb-2">Dashboard</h1>
            <p className="text-[rgb(var(--text-secondary))] text-sm sm:text-base">
              Manage crowdsourced contributions and users
            </p>
          </div>

          {/* Statistics Grid */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-4 sm:gap-5 md:gap-6 mb-6 sm:mb-8 md:mb-10`}>
            {/* Total Users - Admin Only */}
            {isAdmin && (
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-5 sm:p-6 rounded-xl border border-blue-500/20 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[rgb(var(--text-secondary))] text-sm font-medium">
                    Total Users
                  </h3>
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <FaUsers className="text-blue-400" size={20} />
                  </div>
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-[rgb(var(--text-primary))] mb-2">
                  {stats?.totalUsers || 0}
                </p>
                <p className="text-xs text-[rgb(var(--text-secondary))]">
                  {stats?.activeUsers || 0} active, {stats?.suspendedUsers || 0} suspended
                </p>
              </div>
            )}

            {/* Pending Submissions */}
            <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 p-5 sm:p-6 rounded-xl border border-yellow-500/20 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[rgb(var(--text-secondary))] text-sm font-medium">
                  Pending Review
                </h3>
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <FaClock className="text-yellow-400" size={20} />
                </div>
              </div>
              <p className="text-3xl sm:text-4xl font-bold text-[rgb(var(--text-primary))] mb-2">
                {stats?.pendingSubmissions || 0}
              </p>
              <p className="text-xs text-[rgb(var(--text-secondary))]">
                {stats?.totalSubmissions || 0} total submissions
              </p>
            </div>

            {/* Approved Submissions */}
            <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 p-5 sm:p-6 rounded-xl border border-green-500/20 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[rgb(var(--text-secondary))] text-sm font-medium">Approved</h3>
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <FaCheckCircle className="text-green-400" size={20} />
                </div>
              </div>
              <p className="text-3xl sm:text-4xl font-bold text-[rgb(var(--text-primary))] mb-2">
                {stats?.approvedSubmissions || 0}
              </p>
              <p className="text-xs text-[rgb(var(--text-secondary))]">
                {stats?.totalChanges || 0} total changes made
              </p>
            </div>

            {/* Rejected Submissions */}
            <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 p-5 sm:p-6 rounded-xl border border-red-500/20 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[rgb(var(--text-secondary))] text-sm font-medium">Rejected</h3>
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <FaTimesCircle className="text-red-400" size={20} />
                </div>
              </div>
              <p className="text-3xl sm:text-4xl font-bold text-[rgb(var(--text-primary))] mb-2">
                {stats?.rejectedSubmissions || 0}
              </p>
              <p className="text-xs text-[rgb(var(--text-secondary))]">
                Quality control maintained
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? "lg:grid-cols-3" : "lg:grid-cols-2"} gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8`}>
            {/* Review Submissions */}
            <Link
              href="/dashboard/submissions"
              className="bg-gradient-to-br from-[rgb(var(--bg-card))] to-[rgb(var(--bg-card-alt))] p-5 sm:p-6 md:p-7 rounded-xl border border-[rgb(var(--border-color))] hover:border-[#107c10] hover:shadow-lg hover:shadow-[#107c10]/20 transition-all group flex flex-col touch-manipulation transform hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-yellow-500/10 rounded-lg">
                    <FaClock className="text-yellow-500" size={22} />
                  </div>
                  <h3 className="text-[rgb(var(--text-primary))] font-semibold text-lg md:text-xl">
                    Review Submissions
                  </h3>
                </div>
                <FaArrowRight className="text-[rgb(var(--text-muted))] group-hover:text-[#107c10] transition-colors" size={16} />
              </div>
              <p className="text-[rgb(var(--text-secondary))] text-sm mb-4 leading-relaxed">
                Review and approve pending game information corrections
              </p>
              <div className="mt-auto pt-4 border-t border-[rgb(var(--border-color))]">
                <div className="flex items-center justify-between">
                  <span className="text-[#107c10] text-sm font-medium">
                    {stats?.pendingSubmissions || 0} pending
                  </span>
                  <span className="text-[rgb(var(--text-muted))] text-xs">
                    {stats?.totalSubmissions || 0} total
                  </span>
                </div>
              </div>
            </Link>

            {/* Game Submissions - Reviewers and Admins */}
            <Link
              href="/dashboard/game-submissions"
              className="bg-gradient-to-br from-[rgb(var(--bg-card))] to-[rgb(var(--bg-card-alt))] p-5 sm:p-6 md:p-7 rounded-xl border border-[rgb(var(--border-color))] hover:border-[#107c10] hover:shadow-lg hover:shadow-[#107c10]/20 transition-all group flex flex-col touch-manipulation transform hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 rounded-lg">
                    <FaGamepad className="text-blue-500" size={22} />
                  </div>
                  <h3 className="text-[rgb(var(--text-primary))] font-semibold text-lg md:text-xl">
                    Game Submissions
                  </h3>
                </div>
                <FaArrowRight className="text-[rgb(var(--text-muted))] group-hover:text-[#107c10] transition-colors" size={16} />
              </div>
              <p className="text-[rgb(var(--text-secondary))] text-sm mb-4 leading-relaxed">
                Review new game submissions and publish them to the database
              </p>
              <div className="mt-auto pt-4 border-t border-[rgb(var(--border-color))]">
                <div className="flex items-center justify-between">
                  <span className="text-[#107c10] text-sm font-medium">
                    View submissions
                  </span>
                </div>
              </div>
            </Link>

            {/* Leaderboard - Reviewers and Admins */}
            <Link
              href="/leaderboard"
              className="bg-gradient-to-br from-[rgb(var(--bg-card))] to-[rgb(var(--bg-card-alt))] p-5 sm:p-6 md:p-7 rounded-xl border border-[rgb(var(--border-color))] hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/20 transition-all group flex flex-col touch-manipulation transform hover:scale-[1.02] relative overflow-hidden"
            >
              <div className="absolute top-2 right-2">
                <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-bold rounded px-2 py-1 uppercase flex items-center gap-1">
                  <FaFlask size={8} />
                  Beta
                </span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-yellow-500/10 rounded-lg">
                    <FaTrophy className="text-yellow-500" size={22} />
                  </div>
                  <h3 className="text-[rgb(var(--text-primary))] font-semibold text-lg md:text-xl">
                    Leaderboard
                  </h3>
                </div>
                <FaArrowRight className="text-[rgb(var(--text-muted))] group-hover:text-yellow-500 transition-colors" size={16} />
              </div>
              <p className="text-[rgb(var(--text-secondary))] text-sm mb-4 leading-relaxed">
                View top contributors ranked by approval rate and submissions
              </p>
              <div className="mt-auto pt-4 border-t border-[rgb(var(--border-color))]">
                <div className="flex items-center justify-between">
                  <span className="text-yellow-500 text-sm font-medium">
                    View rankings
                  </span>
                </div>
              </div>
            </Link>

            {/* Manage Users - Admin Only */}
            {isAdmin && (
              <Link
                href="/dashboard/users"
                className="bg-gradient-to-br from-[rgb(var(--bg-card))] to-[rgb(var(--bg-card-alt))] p-5 sm:p-6 md:p-7 rounded-xl border border-[rgb(var(--border-color))] hover:border-[#107c10] hover:shadow-lg hover:shadow-[#107c10]/20 transition-all group flex flex-col touch-manipulation transform hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 rounded-lg">
                      <FaUsers className="text-blue-500" size={22} />
                    </div>
                    <h3 className="text-[rgb(var(--text-primary))] font-semibold text-lg md:text-xl">
                      Manage Users
                    </h3>
                  </div>
                  <FaArrowRight className="text-[rgb(var(--text-muted))] group-hover:text-[#107c10] transition-colors" size={16} />
                </div>
                <p className="text-[rgb(var(--text-secondary))] text-sm mb-4 leading-relaxed">
                  View users, change roles, and manage permissions
                </p>
                <div className="mt-auto pt-4 border-t border-[rgb(var(--border-color))]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#107c10] text-sm font-medium">
                      {stats?.totalUsers || 0} users
                    </span>
                    <span className="text-[rgb(var(--text-muted))] text-xs">
                      {stats?.activeUsers || 0} active
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* Manage Games - Admin Only */}
            {isAdmin && (
              <Link
                href="/dashboard/games"
                className="bg-gradient-to-br from-[rgb(var(--bg-card))] to-[rgb(var(--bg-card-alt))] p-5 sm:p-6 md:p-7 rounded-xl border border-[rgb(var(--border-color))] hover:border-[#107c10] hover:shadow-lg hover:shadow-[#107c10]/20 transition-all group flex flex-col touch-manipulation transform hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-green-500/10 rounded-lg">
                      <FaGamepad className="text-green-500" size={22} />
                    </div>
                    <h3 className="text-[rgb(var(--text-primary))] font-semibold text-lg md:text-xl">
                      Manage Games
                    </h3>
                  </div>
                  <FaArrowRight className="text-[rgb(var(--text-muted))] group-hover:text-[#107c10] transition-colors" size={16} />
                </div>
                <p className="text-[rgb(var(--text-secondary))] text-sm mb-4 leading-relaxed">
                  Edit game information, manage features, and publish games
                </p>
                <div className="mt-auto pt-4 border-t border-[rgb(var(--border-color))]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#107c10] text-sm font-medium">
                      Manage games
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* View Audit Log - Admin Only */}
            {isAdmin && (
              <Link
                href="/dashboard/audit"
                className="bg-gradient-to-br from-[rgb(var(--bg-card))] to-[rgb(var(--bg-card-alt))] p-5 sm:p-6 md:p-7 rounded-xl border border-[rgb(var(--border-color))] hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20 transition-all group flex flex-col touch-manipulation transform hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-500/10 rounded-lg">
                      <FaChartBar className="text-purple-500" size={22} />
                    </div>
                    <h3 className="text-[rgb(var(--text-primary))] font-semibold text-lg md:text-xl">Audit Log</h3>
                  </div>
                  <FaArrowRight className="text-[rgb(var(--text-muted))] group-hover:text-purple-500 transition-colors" size={16} />
                </div>
                <p className="text-[rgb(var(--text-secondary))] text-sm mb-4 leading-relaxed">
                  View complete history of all changes made to games
                </p>
                <div className="mt-auto pt-4 border-t border-[rgb(var(--border-color))]">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-500 text-sm font-medium">
                      {stats?.totalChanges || 0} changes
                    </span>
                  </div>
                </div>
              </Link>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-500/30 rounded-xl p-5 sm:p-6 md:p-7 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg flex-shrink-0">
                <FaChartBar className="text-blue-400" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-[rgb(var(--text-primary))] font-semibold mb-2 text-base sm:text-lg">
                  Crowdsourcing System
                </h3>
                <p className="text-[rgb(var(--text-secondary))] text-sm sm:text-base leading-relaxed">
                  {isAdmin
                    ? "This system allows community members to submit corrections to game information. As an admin, you can review submissions, manage user permissions, and maintain the quality of information on GFWL Hub."
                    : "This system allows community members to submit corrections to game information. As a reviewer, you can review and approve submissions to maintain the quality of information on GFWL Hub."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
