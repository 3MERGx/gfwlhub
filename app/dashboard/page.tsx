"use client";

import { useState, useEffect, type ReactNode } from "react";
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
  FaQuestionCircle,
} from "react-icons/fa";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
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

function StatValue({
  value,
  loaded,
}: {
  value?: number;
  loaded: boolean;
}) {
  if (!loaded) {
    return (
      <span
        className="inline-block h-6 w-10 sm:h-7 sm:w-12 md:h-9 md:w-16 rounded bg-[rgb(var(--bg-card-alt))] animate-pulse"
        aria-hidden
      />
    );
  }
  return <>{value ?? 0}</>;
}

function StatCard({
  href,
  title,
  value,
  loaded,
  subtitle,
  icon,
  tone,
}: {
  href?: string;
  title: string;
  value?: number;
  loaded: boolean;
  subtitle: string;
  icon: ReactNode;
  tone: "blue" | "yellow" | "purple" | "green" | "red";
}) {
  const tones = {
    blue: {
      card: "from-blue-500/10 to-blue-600/5 border-blue-500/20 focus:ring-blue-500/40",
      icon: "bg-blue-500/20 text-blue-400",
    },
    yellow: {
      card: "from-yellow-500/10 to-yellow-600/5 border-yellow-500/20 focus:ring-yellow-500/40",
      icon: "bg-yellow-500/20 text-yellow-400",
    },
    purple: {
      card: "from-purple-500/10 to-purple-600/5 border-purple-500/20 focus:ring-purple-500/40",
      icon: "bg-purple-500/20 text-purple-400",
    },
    green: {
      card: "from-green-500/10 to-green-600/5 border-green-500/20",
      icon: "bg-green-500/20 text-green-400",
    },
    red: {
      card: "from-red-500/10 to-red-600/5 border-red-500/20",
      icon: "bg-red-500/20 text-red-400",
    },
  }[tone];

  const className = `bg-gradient-to-br ${tones.card} p-3 sm:p-4 md:p-5 lg:p-6 rounded-lg md:rounded-xl border shadow-md md:shadow-lg ${
    href ? "block focus:outline-none focus:ring-2" : ""
  }`;

  const content = (
    <>
      <div className="flex items-center justify-between mb-1.5 sm:mb-2 md:mb-3 gap-2">
        <h3 className="text-[rgb(var(--text-secondary))] text-[11px] sm:text-xs md:text-sm font-medium leading-tight">
          {title}
        </h3>
        <div className={`p-1 sm:p-1.5 md:p-2 rounded-md md:rounded-lg shrink-0 ${tones.icon}`}>
          {icon}
        </div>
      </div>
      <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-[rgb(var(--text-primary))] mb-0.5 sm:mb-1 md:mb-2">
        <StatValue value={value} loaded={loaded} />
      </p>
      <p className="text-[10px] sm:text-xs text-[rgb(var(--text-secondary))] leading-snug line-clamp-2">
        {subtitle}
      </p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
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
            pendingGameSubmissions: 0,
            pendingFaqSubmissions: 0,
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
            subtitle="Manage crowdsourced contributions and users"
          />

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 lg:gap-6 mb-5 sm:mb-6 md:mb-8 lg:mb-10">
            {isAdmin && (
              <StatCard
                tone="blue"
                title="Total Users"
                value={stats?.totalUsers}
                loaded={stats !== null}
                subtitle={
                  stats
                    ? `${stats.activeUsers} active, ${stats.suspendedUsers} suspended`
                    : "Loading user counts"
                }
                icon={<FaUsers className="text-sm sm:text-base md:text-xl" />}
              />
            )}

            <StatCard
              href="/dashboard/submissions"
              tone="yellow"
              title="Pending Corrections"
              value={stats?.pendingSubmissions}
              loaded={stats !== null}
              subtitle={
                stats
                  ? `${stats.totalSubmissions} total · Open corrections queue`
                  : "Loading corrections"
              }
              icon={<FaClock className="text-sm sm:text-base md:text-xl" />}
            />

            <StatCard
              href="/dashboard/game-submissions"
              tone="blue"
              title="Pending Game submissions"
              value={stats?.pendingGameSubmissions}
              loaded={stats !== null}
              subtitle="Open game submissions queue"
              icon={<FaGamepad className="text-sm sm:text-base md:text-xl" />}
            />

            <StatCard
              href="/dashboard/faq-submissions"
              tone="purple"
              title="Pending FAQ submissions"
              value={stats?.pendingFaqSubmissions}
              loaded={stats !== null}
              subtitle="Open FAQ submissions queue"
              icon={<FaQuestionCircle className="text-sm sm:text-base md:text-xl" />}
            />

            <StatCard
              tone="green"
              title="Approved"
              value={stats?.approvedSubmissions}
              loaded={stats !== null}
              subtitle={
                stats
                  ? `${stats.totalChanges} total changes made`
                  : "Loading approved count"
              }
              icon={<FaCheckCircle className="text-sm sm:text-base md:text-xl" />}
            />

            <StatCard
              tone="red"
              title="Rejected"
              value={stats?.rejectedSubmissions}
              loaded={stats !== null}
              subtitle="Quality control maintained"
              icon={<FaTimesCircle className="text-sm sm:text-base md:text-xl" />}
            />
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
                    Review corrections
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
                    {stats ? `${stats.pendingSubmissions} pending` : "Loading…"}
                  </span>
                  <span className="text-[rgb(var(--text-muted))] text-xs">
                    {stats ? `${stats.totalSubmissions} total` : ""}
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
                    {stats ? `${stats.pendingGameSubmissions} pending` : "Loading…"}
                  </span>
                </div>
              </div>
            </Link>

            <Link
              href="/dashboard/faq-submissions"
              className="bg-gradient-to-br from-[rgb(var(--bg-card))] to-[rgb(var(--bg-card-alt))] p-5 sm:p-6 md:p-7 rounded-xl border border-[rgb(var(--border-color))] hover:border-[#107c10] hover:shadow-lg hover:shadow-[#107c10]/20 transition-all group flex flex-col touch-manipulation transform hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/10 rounded-lg">
                    <FaQuestionCircle className="text-purple-500" size={22} />
                  </div>
                  <h3 className="text-[rgb(var(--text-primary))] font-semibold text-lg md:text-xl">
                    FAQ submissions
                  </h3>
                </div>
                <FaArrowRight className="text-[rgb(var(--text-muted))] group-hover:text-[#107c10] transition-colors" size={16} />
              </div>
              <p className="text-[rgb(var(--text-secondary))] text-sm mb-4 leading-relaxed">
                Review community-submitted FAQ questions and answers
              </p>
              <div className="mt-auto pt-4 border-t border-[rgb(var(--border-color))]">
                <div className="flex items-center justify-between">
                  <span className="text-[#107c10] text-sm font-medium">
                    {stats ? `${stats.pendingFaqSubmissions} pending` : "Loading…"}
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
                      {stats ? `${stats.totalUsers} users` : "Loading…"}
                    </span>
                    <span className="text-[rgb(var(--text-muted))] text-xs">
                      {stats ? `${stats.activeUsers} active` : ""}
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
                      {stats ? `${stats.totalChanges} changes` : "Loading…"}
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
