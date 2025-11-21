"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FaArrowLeft,
  FaToggleOn,
  FaToggleOff,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import DashboardLayout from "@/components/DashboardLayout";
import DisabledGamePrompt from "@/app/games/[slug]/DisabledGamePrompt";
import AddGameDetailsModal from "@/components/AddGameDetailsModal";

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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (session?.user?.role !== "admin") {
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
      const response = await fetch("/api/games/manage");
      if (response.ok) {
        const data = await response.json();
        setGames(data);
      }
    } catch (error) {
      console.error("Error fetching games:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFeatureEnabled = async (slug: string, currentValue: boolean) => {
    setUpdating(slug);
    try {
      const response = await fetch(`/api/games/${slug}/toggle-feature`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureEnabled: !currentValue }),
      });

      if (response.ok) {
        // Update local state
        setGames(
          games.map((g) =>
            g.slug === slug ? { ...g, featureEnabled: !currentValue } : g
          )
        );
      } else {
        alert("Failed to update game");
      }
    } catch (error) {
      console.error("Error updating game:", error);
      alert("Failed to update game");
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
        <div className="text-center text-white">Loading...</div>
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-[#202020] rounded-lg shadow-xl p-6 md:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Games Management
              </h1>
              <p className="text-gray-400">
                Enable or disable games for public visibility
              </p>
            </div>
            <Link
              href="/dashboard"
              className="mt-4 md:mt-0 inline-flex items-center text-gray-300 hover:text-white transition-colors"
            >
              <FaArrowLeft className="mr-2" />
              Back to Dashboard
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#2d2d2d] rounded-lg p-4">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-sm text-gray-400">Total Games</div>
            </div>
            <div className="bg-[#2d2d2d] rounded-lg p-4">
              <div className="text-2xl font-bold text-green-400">
                {stats.enabled}
              </div>
              <div className="text-sm text-gray-400">Enabled</div>
            </div>
            <div className="bg-[#2d2d2d] rounded-lg p-4">
              <div className="text-2xl font-bold text-red-400">
                {stats.disabled}
              </div>
              <div className="text-sm text-gray-400">Disabled</div>
            </div>
            <div className="bg-[#2d2d2d] rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-400">
                {stats.withSubmissions}
              </div>
              <div className="text-sm text-gray-400">With Submissions</div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search games..."
                  className="w-full bg-[#2d2d2d] text-white rounded-lg pl-12 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#107c10]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowEnabledOnly(!showEnabledOnly);
                  setShowDisabledOnly(false);
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  showEnabledOnly
                    ? "bg-green-600 text-white"
                    : "bg-[#2d2d2d] text-gray-300 hover:bg-[#3d3d3d]"
                }`}
              >
                Enabled Only
              </button>
              <button
                onClick={() => {
                  setShowDisabledOnly(!showDisabledOnly);
                  setShowEnabledOnly(false);
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  showDisabledOnly
                    ? "bg-red-600 text-white"
                    : "bg-[#2d2d2d] text-gray-300 hover:bg-[#3d3d3d]"
                }`}
              >
                Disabled Only
              </button>
            </div>
          </div>

          {/* Games List */}
          {filteredGames.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No games found</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {currentGames.map((game) => (
                  <div
                    key={game.slug}
                    className="bg-[#2d2d2d] rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-gray-700"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        {game.featureEnabled ? (
                          <Link
                            href={`/games/${game.slug}`}
                            className="text-lg font-bold text-white hover:text-[#107c10] transition-colors break-words"
                          >
                            {game.title}
                          </Link>
                        ) : (
                          <button
                            onClick={() => setSelectedDisabledGame(game)}
                            className="text-lg font-bold text-white hover:text-[#107c10] transition-colors break-words text-left"
                          >
                            {game.title}
                          </button>
                        )}
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                            game.featureEnabled
                              ? "bg-green-900/30 text-green-400"
                              : "bg-red-900/30 text-red-400"
                          }`}
                        >
                          {game.featureEnabled ? "Enabled" : "Disabled"}
                        </span>
                        {!hasMinimumFields(game) && !game.featureEnabled && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300 flex-shrink-0">
                            Missing Info
                          </span>
                        )}
                        {(game.submissionCount ?? 0) > 0 && (
                          <Link
                            href={`/dashboard/game-submissions?game=${game.slug}`}
                            className="px-2 py-1 rounded text-xs font-medium bg-yellow-900/30 text-yellow-400 hover:bg-yellow-800/40 transition-colors flex-shrink-0"
                          >
                            {game.submissionCount} Submission
                            {game.submissionCount !== 1 ? "s" : ""}
                          </Link>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-400 space-x-2 sm:space-x-4 flex flex-wrap">
                        <span>Slug: {game.slug}</span>
                        <span>Type: {game.activationType}</span>
                        <span>
                          Status:{" "}
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
                        className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium ${
                          game.featureEnabled
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-green-600 hover:bg-green-700 text-white"
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
                  <div className="text-sm text-gray-400">
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
                      className="p-2 rounded-lg bg-[#2d2d2d] text-white hover:bg-[#3d3d3d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                                  : "bg-[#2d2d2d] text-gray-300 hover:bg-[#3d3d3d]"
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
                      className="p-2 rounded-lg bg-[#2d2d2d] text-white hover:bg-[#3d3d3d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      aria-label="Next page"
                    >
                      <FaChevronRight />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Info Box */}
          <div className="mt-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <p className="text-blue-300 text-sm">
              <strong>Enabled games</strong> are visible on the supported games
              page and have full functionality.
              <br />
              <strong>Disabled games</strong> show a banner prompting users to
              help add game details.
            </p>
          </div>
        </div>
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
