"use client";

import { useState, useEffect } from "react";
import {
  FaUsers,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaChartBar,
} from "react-icons/fa";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import { useSession } from "next-auth/react";

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
          console.log("User doesn't have permission to view stats");
          setStats(null);
        } else {
          console.error("Failed to fetch stats");
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
        console.error("Error fetching stats:", error);
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
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2">Dashboard</h1>
            <p className="text-gray-400 text-sm sm:text-base">
              Manage crowdsourced contributions and users
            </p>
          </div>

          {/* Statistics Grid */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8`}>
            {/* Total Users - Admin Only */}
            {isAdmin && (
              <div className="bg-[#2d2d2d] p-4 sm:p-5 md:p-6 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-400 text-xs sm:text-sm font-medium">
                    Total Users
                  </h3>
                  <FaUsers className="text-blue-500" size={20} />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  {stats?.totalUsers || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.activeUsers || 0} active, {stats?.suspendedUsers || 0}{" "}
                  suspended
                </p>
              </div>
            )}

            {/* Pending Submissions */}
            <div className="bg-[#2d2d2d] p-4 sm:p-5 md:p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-400 text-xs sm:text-sm font-medium">
                  Pending Review
                </h3>
                <FaClock className="text-yellow-500" size={20} />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {stats?.pendingSubmissions || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.totalSubmissions || 0} total submissions
              </p>
            </div>

            {/* Approved Submissions */}
            <div className="bg-[#2d2d2d] p-4 sm:p-5 md:p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-400 text-xs sm:text-sm font-medium">Approved</h3>
                <FaCheckCircle className="text-green-500" size={20} />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {stats?.approvedSubmissions || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.totalChanges || 0} total changes made
              </p>
            </div>

            {/* Rejected Submissions */}
            <div className="bg-[#2d2d2d] p-4 sm:p-5 md:p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-400 text-xs sm:text-sm font-medium">Rejected</h3>
                <FaTimesCircle className="text-red-500" size={20} />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {stats?.rejectedSubmissions || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Quality control maintained
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? "lg:grid-cols-3" : "lg:grid-cols-1"} gap-3 sm:gap-4 md:gap-6`}>
            {/* Review Submissions */}
            <Link
              href="/dashboard/submissions"
              className="bg-[#2d2d2d] p-4 sm:p-5 md:p-6 rounded-lg border border-gray-700 hover:border-[#107c10] transition-colors group flex flex-col touch-manipulation"
            >
              <div className="flex items-center mb-3 md:mb-4">
                <FaClock className="text-yellow-500 mr-3" size={20} />
                <h3 className="text-white font-semibold text-base md:text-lg">
                  Review Submissions
                </h3>
              </div>
              <p className="text-gray-400 text-sm mb-3 md:mb-4">
                Review and approve pending game information corrections
              </p>
              <div className="text-[#107c10] text-sm font-medium group-hover:underline mt-auto">
                View {stats?.pendingSubmissions || 0} pending →
              </div>
            </Link>

            {/* Manage Users - Admin Only */}
            {isAdmin && (
              <Link
                href="/dashboard/users"
                className="bg-[#2d2d2d] p-4 sm:p-5 md:p-6 rounded-lg border border-gray-700 hover:border-[#107c10] transition-colors group flex flex-col touch-manipulation"
              >
                <div className="flex items-center mb-3 md:mb-4">
                  <FaUsers className="text-blue-500 mr-3" size={20} />
                  <h3 className="text-white font-semibold text-base md:text-lg">
                    Manage Users
                  </h3>
                </div>
                <p className="text-gray-400 text-sm mb-3 md:mb-4">
                  View users, change roles, and manage permissions
                </p>
                <div className="text-[#107c10] text-sm font-medium group-hover:underline mt-auto">
                  Manage {stats?.totalUsers || 0} users →
                </div>
              </Link>
            )}

            {/* View Audit Log - Admin Only */}
            {isAdmin && (
              <Link
                href="/dashboard/audit"
                className="bg-[#2d2d2d] p-4 sm:p-5 md:p-6 rounded-lg border border-gray-700 hover:border-[#107c10] transition-colors group flex flex-col touch-manipulation"
              >
                <div className="flex items-center mb-3 md:mb-4">
                  <FaChartBar className="text-purple-500 mr-3" size={20} />
                  <h3 className="text-white font-semibold text-base md:text-lg">Audit Log</h3>
                </div>
                <p className="text-gray-400 text-sm mb-3 md:mb-4">
                  View complete history of all changes made to games
                </p>
                <div className="text-[#107c10] text-sm font-medium group-hover:underline mt-auto">
                  View {stats?.totalChanges || 0} changes →
                </div>
              </Link>
            )}
          </div>

          {/* Info Box */}
          <div className="mt-4 sm:mt-6 md:mt-8 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 sm:p-5 md:p-6">
            <h3 className="text-white font-semibold mb-2 text-sm sm:text-base">
              Crowdsourcing System
            </h3>
            <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
              {isAdmin
                ? "This system allows community members to submit corrections to game information. As an admin, you can review submissions, manage user permissions, and maintain the quality of information on GFWL Hub."
                : "This system allows community members to submit corrections to game information. As a reviewer, you can review and approve submissions to maintain the quality of information on GFWL Hub."}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
