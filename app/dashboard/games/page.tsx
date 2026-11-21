"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { safeLog } from "@/lib/security";
import { useToast } from "@/components/ui/toast-context";
import { useCSRF } from "@/hooks/useCSRF";
import { usePusherChannel } from "@/hooks/usePusherChannel";
import { PUSHER_EVENTS } from "@/lib/pusher-client";
import Link from "next/link";
import {
  FaToggleOn,
  FaToggleOff,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardEmptyState from "@/components/dashboard/DashboardEmptyState";
import DashboardToolbar, {
  FilterChip,
} from "@/components/dashboard/DashboardToolbar";
import QueueCounts from "@/components/dashboard/QueueCounts";
import StatusPill from "@/components/dashboard/StatusPill";
import DisabledGamePrompt from "@/app/games/[slug]/DisabledGamePrompt";
import AddGameDetailsModal from "@/components/AddGameDetailsModal";
import { ListSkeleton } from "@/components/ui/loading-skeleton";

interface Game {
  id?: string;
  slug: string;
  title: string;
  status: "supported" | "testing" | "unsupported";
  activationType: string;
  featureEnabled: boolean;
  submissionCount?: number;
  // Game data fields for minimum check
  description?: string;
  releaseDate?: string;
  developer?: string;
  publisher?: string;
  genres?: string[];
  platforms?: string[];
  imageUrl?: string;
}

// Minimum required fields for a game to be enabled
const hasMinimumFields = (game: Game): boolean => {
  return !!(
    game.title &&
    game.imageUrl &&
    game.description &&
    game.releaseDate &&
    game.developer &&
    game.publisher &&
    game.genres &&
    game.genres.length > 0 &&
    game.platforms &&
    game.platforms.length > 0
  );
};

function GamesManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const { csrfToken } = useCSRF();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEnabledOnly, setShowEnabledOnly] = useState(false);
  const [showDisabledOnly, setShowDisabledOnly] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const gamesPerPage = 15;
  const [selectedDisabledGame, setSelectedDisabledGame] = useState<Game | null>(
    null
  );
  const [showAddDetailsModal, setShowAddDetailsModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetchGames();
    }
  }, [session]);

  const fetchGames = async () => {
    try {
      const response = await fetch(`/api/games/manage?_t=${Date.now()}`, {
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        setGames(data);
      }
    } catch (error) {
      safeLog.error("Error fetching games:", error);
    } finally {
      setLoading(false);
    }
  };

  usePusherChannel(PUSHER_EVENTS.GAMES_UPDATED, () => {
    fetchGames();
  });

  useEffect(() => {
    const onFocus = () => fetchGames();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const toggleFeatureEnabled = async (slug: string, currentValue: boolean) => {
    setUpdating(slug);
    try {
      const response = await fetch(`/api/games/${slug}/toggle-feature`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        body: JSON.stringify({ featureEnabled: !currentValue }),
      });

      if (response.ok) {
        // Update local state
        setGames(
          games.map((g) =>
            g.slug === slug ? { ...g, featureEnabled: !currentValue } : g
          )
        );
        showToast(`Game ${!currentValue ? "enabled" : "disabled"} successfully`, 3000, "success");
      } else {
        const errorData = await response.json();
        showToast(errorData.error || "Failed to update game", 5000, "error");
      }
      
      // Refresh UI
      if (pathname === "/dashboard/games") {
        router.refresh();
      }
    } catch (error) {
      safeLog.error("Error updating game:", error);
      showToast("Failed to update game", 5000, "error");
    } finally {
      setUpdating(null);
    }
  };

  const filteredGames = games.filter((game) => {
    const matchesSearch =
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.slug.toLowerCase().includes(searchQuery.toLowerCase());

    if (showEnabledOnly) return matchesSearch && game.featureEnabled;
    if (showDisabledOnly) return matchesSearch && !game.featureEnabled;

    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredGames.length / gamesPerPage);
  const indexOfLastGame = currentPage * gamesPerPage;
  const indexOfFirstGame = indexOfLastGame - gamesPerPage;
  const currentGames = filteredGames.slice(indexOfFirstGame, indexOfLastGame);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, showEnabledOnly, showDisabledOnly]);

  if (loading || status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="h-8 w-64 bg-[rgb(var(--bg-card-alt))] rounded animate-pulse mb-2" />
            <div className="h-4 w-96 bg-[rgb(var(--bg-card-alt))] rounded animate-pulse" />
          </div>
          <ListSkeleton items={5} />
        </div>
      </div>
    );
  }

  const stats = {
    total: games.length,
    enabled: games.filter((g) => g.featureEnabled).length,
    disabled: games.filter((g) => !g.featureEnabled).length,
    withSubmissions: games.filter(
      (g) => g.submissionCount && g.submissionCount > 0
    ).length,
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
      <div className="max-w-7xl mx-auto">
          <DashboardPageHeader
            title="Games Management"
            subtitle="Enable or disable games for public visibility"
          />

          <DashboardToolbar
            filtersOpen={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            filtersActive={showEnabledOnly || showDisabledOnly}
            search={
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search games..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] focus:border-[rgb(var(--color-primary))] focus:outline-none"
                />
              </div>
            }
            filters={
              <>
                <button
                  onClick={() => {
                    setShowEnabledOnly(!showEnabledOnly);
                    setShowDisabledOnly(false);
                  }}
                  className={`px-4 py-2 rounded-lg border ${
                    showEnabledOnly
                      ? "bg-[rgba(var(--color-success),0.12)] border-[rgba(var(--color-success),0.4)] text-success"
                      : "bg-[rgb(var(--bg-card-alt))] border-[rgb(var(--border-color))] text-[rgb(var(--text-secondary))]"
                  }`}
                >
                  Enabled
                </button>
                <button
                  onClick={() => {
                    setShowDisabledOnly(!showDisabledOnly);
                    setShowEnabledOnly(false);
                  }}
                  className={`px-4 py-2 rounded-lg border ${
                    showDisabledOnly
                      ? "bg-[rgba(var(--color-danger),0.12)] border-[rgba(var(--color-danger),0.4)] text-danger"
                      : "bg-[rgb(var(--bg-card-alt))] border-[rgb(var(--border-color))] text-[rgb(var(--text-secondary))]"
                  }`}
                >
                  Disabled
                </button>
              </>
            }
            chips={
              searchQuery || showEnabledOnly || showDisabledOnly ? (
                <>
                  {searchQuery && (
                    <FilterChip
                      label={`Search: ${searchQuery}`}
                      onClear={() => setSearchQuery("")}
                    />
                  )}
                  {showEnabledOnly && (
                    <FilterChip
                      label="Enabled only"
                      onClear={() => setShowEnabledOnly(false)}
                    />
                  )}
                  {showDisabledOnly && (
                    <FilterChip
                      label="Disabled only"
                      onClear={() => setShowDisabledOnly(false)}
                    />
                  )}
                </>
              ) : undefined
            }
          />

          <QueueCounts
            items={[
              { label: "Total", value: stats.total },
              { label: "Enabled", value: stats.enabled, tone: "success" },
              { label: "Disabled", value: stats.disabled, tone: "danger" },
              {
                label: "With submissions",
                value: stats.withSubmissions,
                tone: "warning",
                description:
                  "Games that currently have pending community submissions waiting for review.",
              },
            ]}
          />

          {/* Games List */}
          {filteredGames.length === 0 ? (
            <DashboardEmptyState
              title={
                searchQuery || showEnabledOnly || showDisabledOnly
                  ? "No games match the current filters."
                  : "No games found"
              }
              onClearFilters={
                searchQuery || showEnabledOnly || showDisabledOnly
                  ? () => {
                      setSearchQuery("");
                      setShowEnabledOnly(false);
                      setShowDisabledOnly(false);
                    }
                  : undefined
              }
            />
          ) : (
            <>
              <div className="dashboard-inbox">
                {currentGames.map((game) => (
                  <div
                    key={game.slug}
                    className="dashboard-inbox-row flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        {game.featureEnabled ? (
                          <Link
                            href={`/games/${game.slug}`}
                            className="min-w-0 flex-1 font-medium text-[rgb(var(--text-primary))] hover:text-[rgb(var(--color-primary))] break-words"
                          >
                            {game.title}
                          </Link>
                        ) : (
                          <button
                            onClick={() => setSelectedDisabledGame(game)}
                            className="min-w-0 flex-1 font-medium text-[rgb(var(--text-primary))] hover:text-[rgb(var(--color-primary))] break-words text-left"
                          >
                            {game.title}
                          </button>
                        )}
                        <div className="shrink-0 pt-0.5">
                          <StatusPill
                            status={game.featureEnabled ? "enabled" : "disabled"}
                          />
                        </div>
                      </div>
                      {(!hasMinimumFields(game) && !game.featureEnabled) ||
                      (game.submissionCount ?? 0) > 0 ? (
                        <div className="flex flex-wrap gap-2 mb-1">
                          {!hasMinimumFields(game) && !game.featureEnabled && (
                            <span className="status-pill status-pill-neutral">
                              Missing info
                            </span>
                          )}
                          {(game.submissionCount ?? 0) > 0 && (
                            <Link
                              href={`/dashboard/game-submissions?game=${game.slug}`}
                              className="status-pill status-pill-pending hover:border-[rgb(var(--color-primary))]"
                            >
                              {game.submissionCount} submission
                              {game.submissionCount !== 1 ? "s" : ""}
                            </Link>
                          )}
                        </div>
                      ) : null}
                      <div className="text-xs text-[rgb(var(--text-muted))] space-x-2 sm:space-x-3 flex flex-wrap">
                        <span>{game.slug}</span>
                        <span>{game.activationType}</span>
                        <span>
                          {game.status.charAt(0).toUpperCase() +
                            game.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() =>
                          toggleFeatureEnabled(game.slug, game.featureEnabled)
                        }
                        disabled={updating === game.slug}
                        className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium ${
                          game.featureEnabled
                            ? "bg-[rgb(var(--color-danger))] hover:opacity-90 text-white"
                            : "bg-[rgb(var(--color-success))] hover:opacity-90 text-white"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {updating === game.slug ? (
                          "Updating..."
                        ) : game.featureEnabled ? (
                          <>
                            <FaToggleOff />
                            Disable
                          </>
                        ) : (
                          <>
                            <FaToggleOn />
                            Enable
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-[rgb(var(--text-secondary))]">
                    Showing {indexOfFirstGame + 1} to{" "}
                    {Math.min(indexOfLastGame, filteredGames.length)} of{" "}
                    {filteredGames.length} games
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-card))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-[rgb(var(--border-color))]"
                      aria-label="Previous page"
                    >
                      <FaChevronLeft />
                    </button>
                    <div className="flex gap-1">
                      {Array.from(
                        { length: Math.min(7, totalPages) },
                        (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 7) {
                            pageNum = i + 1;
                          } else if (currentPage <= 4) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 3) {
                            pageNum = totalPages - 6 + i;
                          } else {
                            pageNum = currentPage - 3 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === pageNum
                                  ? "bg-[#107c10] text-white"
                                  : "bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-card))]"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                      )}
                    </div>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-card))] disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-[rgb(var(--border-color))]"
                      aria-label="Next page"
                    >
                      <FaChevronRight />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <p className="mt-6 text-sm text-[rgb(var(--text-muted))]">
            Enabled games are listed publicly. Disabled games show a prompt for
            community details instead.
          </p>
      </div>

      {/* Disabled Game Prompt Modal */}
      {selectedDisabledGame && (
        <DisabledGamePrompt
          gameTitle={selectedDisabledGame.title}
          gameSlug={selectedDisabledGame.slug}
          onClose={() => setSelectedDisabledGame(null)}
          onAddDetails={() => {
            setShowAddDetailsModal(true);
          }}
        />
      )}

      {/* Add Game Details Modal */}
      {showAddDetailsModal && selectedDisabledGame && session && (
        <AddGameDetailsModal
          game={{
            id: selectedDisabledGame.id || selectedDisabledGame.slug,
            slug: selectedDisabledGame.slug,
            title: selectedDisabledGame.title,
            activationType: selectedDisabledGame.activationType as
              | "Legacy (5x5)"
              | "Legacy (Per-Title)"
              | "SSA",
            status: selectedDisabledGame.status,
            description: selectedDisabledGame.description || "",
            releaseDate: selectedDisabledGame.releaseDate || "",
            developer: selectedDisabledGame.developer || "",
            publisher: selectedDisabledGame.publisher || "",
            genres: selectedDisabledGame.genres || [],
            platforms: selectedDisabledGame.platforms || [],
            imageUrl: selectedDisabledGame.imageUrl,
            featureEnabled: selectedDisabledGame.featureEnabled,
          }}
          onClose={() => {
            setShowAddDetailsModal(false);
            setSelectedDisabledGame(null);
          }}
          onSubmit={() => {
            setShowAddDetailsModal(false);
            setSelectedDisabledGame(null);
            // Optionally refresh the games list
            fetchGames();
          }}
          userId={session.user.id || ""}
          userName={session.user.name || "Anonymous"}
        />
      )}
    </div>
  );
}

export default function GamesManagementPageWrapper() {
  return (
    <DashboardLayout requireRole="admin">
      <GamesManagementPage />
    </DashboardLayout>
  );
}
