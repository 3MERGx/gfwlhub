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
  FaQuestionCircle,
} from "react-icons/fa";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardStatCard from "@/components/dashboard/DashboardStatCard";
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
  pendingGameSubmissions: number;
  pendingFaqSubmissions: number;
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
          safeLog.log("User doesn't have permission to view stats");
          setStats(null);
        } else {
          safeLog.error("Failed to fetch stats");
          setStats({
            totalUsers: 0,
            activeUsers: 0,
            suspendedUsers: 0,
            blockedUsers: 0,
            totalSubmissions: 0,
            pendingSubmissions: 0,
            approvedSubmissions: 0,
            rejectedSubmissions: 0,
            pendingGameSubmissions: 0,
            pendingFaqSubmissions: 0,
            totalChanges: 0,
          });
        }
      } catch (error) {
        safeLog.error("Error fetching stats:", error);
        setStats({
          totalUsers: 0,
          activeUsers: 0,
          suspendedUsers: 0,
          blockedUsers: 0,
          totalSubmissions: 0,
          pendingSubmissions: 0,
          approvedSubmissions: 0,
          rejectedSubmissions: 0,
          pendingGameSubmissions: 0,
          pendingFaqSubmissions: 0,
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
          <DashboardPageHeader
            title="Dashboard"
            subtitle="Review queues and site management"
          />

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-8">
            <DashboardStatCard
              href="/dashboard/submissions"
              emphasize={(stats?.pendingSubmissions ?? 0) > 0}
              title="Pending corrections"
              value={stats?.pendingSubmissions}
              loaded={stats !== null}
              subtitle={
                stats
                  ? `${stats.totalSubmissions} total in queue`
                  : "Loading corrections"
              }
              icon={<FaClock className="text-sm sm:text-base" />}
            />

            <DashboardStatCard
              href="/dashboard/game-submissions"
              emphasize={(stats?.pendingGameSubmissions ?? 0) > 0}
              title="Pending games"
              value={stats?.pendingGameSubmissions}
              loaded={stats !== null}
              subtitle="Open game submissions"
              icon={<FaGamepad className="text-sm sm:text-base" />}
            />

            <DashboardStatCard
              href="/dashboard/faq-submissions"
              emphasize={(stats?.pendingFaqSubmissions ?? 0) > 0}
              title="Pending FAQ"
              value={stats?.pendingFaqSubmissions}
              loaded={stats !== null}
              subtitle="Open FAQ submissions"
              icon={<FaQuestionCircle className="text-sm sm:text-base" />}
            />

            <DashboardStatCard
              title="Approved"
              value={stats?.approvedSubmissions}
              loaded={stats !== null}
              subtitle={
                stats
                  ? `${stats.totalChanges} total changes`
                  : "Loading approved count"
              }
              icon={<FaCheckCircle className="text-sm sm:text-base" />}
            />

            <DashboardStatCard
              title="Rejected"
              value={stats?.rejectedSubmissions}
              loaded={stats !== null}
              subtitle="Not applied to live pages"
              icon={<FaTimesCircle className="text-sm sm:text-base" />}
            />

            {isAdmin && (
              <DashboardStatCard
                href="/dashboard/users"
                title="Users"
                value={stats?.totalUsers}
                loaded={stats !== null}
                subtitle={
                  stats
                    ? `${stats.activeUsers} active, ${stats.suspendedUsers} suspended`
                    : "Loading user counts"
                }
                icon={<FaUsers className="text-sm sm:text-base" />}
              />
            )}
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link
              href="/leaderboard"
              className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--color-primary))]"
            >
              <FaTrophy className="inline mr-1.5 mb-0.5" size={12} />
              Leaderboard
            </Link>
            {isAdmin && (
              <>
                <Link
                  href="/dashboard/games"
                  className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--color-primary))]"
                >
                  <FaGamepad className="inline mr-1.5 mb-0.5" size={12} />
                  Manage games
                </Link>
                <Link
                  href="/dashboard/audit"
                  className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--color-primary))]"
                >
                  <FaChartBar className="inline mr-1.5 mb-0.5" size={12} />
                  Audit log
                </Link>
                <Link
                  href="/dashboard/moderation"
                  className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--color-primary))]"
                >
                  Moderation log
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
