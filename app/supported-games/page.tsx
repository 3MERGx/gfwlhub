"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Game } from "@/data/games";
import { useToast } from "@/components/ui/toast-context";
import { useSession } from "next-auth/react";
import { safeLog } from "@/lib/security";
import {
  FaSort,
  FaSortUp,
  FaSortDown,
  FaSearch,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import DisabledGamePrompt from "@/app/games/[slug]/DisabledGamePrompt";
import AddGameDetailsModal from "@/components/AddGameDetailsModal";

// Helper function to check if a game has its feature enabled
const isGameFeatureEnabled = (game: Game): boolean => {
  return !!game.featureEnabled;
};

type SortField = "title" | "activationType" | "status";
type SortDirection = "asc" | "desc";

export default function SupportedGames() {
  const { showToast } = useToast();
  const { data: session } = useSession();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const gamesPerPage = 10;
  const [selectedDisabledGame, setSelectedDisabledGame] = useState<Game | null>(null);
  const [showAddDetailsModal, setShowAddDetailsModal] = useState(false);

  // Fetch games from MongoDB
  useEffect(() => {
    let isMounted = true;
    
    async function fetchGames() {
      try {
        const response = await fetch("/api/games");
        if (response.ok && isMounted) {
          const data = await response.json();
          setGames(data);
        } else if (isMounted) {
          safeLog.error("Failed to fetch games");
          showToast("Failed to load games. Please try again later.");
        }
      } catch (error) {
        if (isMounted) {
          safeLog.error("Error fetching games:", error);
          showToast("Error loading games. Please try again later.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    fetchGames();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  const clearSearch = () => {
    setSearchQuery("");
    setCurrentPage(1); // Reset to first page when search is cleared
  };

  // Filter games based on search query (show all games, enabled and disabled)
  const filteredGames = games.filter(
    (game) =>
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort filtered games
  const sortedGames = [...filteredGames].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle case-insensitive string comparison
    if (typeof aValue === "string" && typeof bValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) {
      return sortDirection === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortDirection === "asc" ? 1 : -1;
    }
    return 0;
  });

  // Pagination
  const indexOfLastGame = currentPage * gamesPerPage;
  const indexOfFirstGame = indexOfLastGame - gamesPerPage;
  const currentGames = sortedGames.slice(indexOfFirstGame, indexOfLastGame);
  const totalPages = Math.ceil(sortedGames.length / gamesPerPage);

  // Removed handleGameClick - let users navigate to disabled games
  // They'll see a banner prompting them to help add game details

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-[rgb(var(--bg-card))] p-8 rounded-lg shadow-xl">
            <div className="text-center text-[rgb(var(--text-primary))]">Loading games...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-[rgb(var(--bg-card))] p-8 rounded-lg shadow-xl">
          <h1 className="text-3xl font-bold mb-6 text-center text-[rgb(var(--text-primary))]">
            Supported Games
          </h1>

          <div className="mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search games..."
                className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] border border-[rgb(var(--border-color))] rounded-md py-2 pl-10 pr-10 focus:outline-none focus:border-[#107c10]"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page when search changes
                }}
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[rgb(var(--text-muted))]" />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]"
                  aria-label="Clear search"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>

          {/* Desktop view - Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[rgb(var(--bg-card-alt))]">
                  <th className="px-4 py-3 text-left text-[rgb(var(--text-primary))] w-1/2 md:w-3/5">
                    <button
                      className="flex items-center focus:outline-none"
                      onClick={() => handleSort("title")}
                    >
                      Title
                      {sortField === "title" ? (
                        sortDirection === "asc" ? (
                          <FaSortUp className="ml-1" />
                        ) : (
                          <FaSortDown className="ml-1" />
                        )
                      ) : (
                        <FaSort className="ml-1 text-[rgb(var(--text-muted))]" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center text-[rgb(var(--text-primary))] w-1/4 md:w-1/5">
                    <button
                      className="flex items-center justify-center mx-auto focus:outline-none"
                      onClick={() => handleSort("activationType")}
                    >
                      Activation Type
                      {sortField === "activationType" ? (
                        sortDirection === "asc" ? (
                          <FaSortUp className="ml-1" />
                        ) : (
                          <FaSortDown className="ml-1" />
                        )
                      ) : (
                        <FaSort className="ml-1 text-[rgb(var(--text-muted))]" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center text-[rgb(var(--text-primary))] w-1/4 md:w-1/5">
                    <button
                      className="flex items-center justify-center mx-auto focus:outline-none"
                      onClick={() => handleSort("status")}
                    >
                      Status
                      {sortField === "status" ? (
                        sortDirection === "asc" ? (
                          <FaSortUp className="ml-1" />
                        ) : (
                          <FaSortDown className="ml-1" />
                        )
                      ) : (
                        <FaSort className="ml-1 text-[rgb(var(--text-muted))]" />
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentGames.map((game) => (
                  <tr
                    key={game.slug}
                    className="border-b border-[rgb(var(--border-color))] hover:bg-[rgb(var(--bg-card-alt))]"
                  >
                    <td className="px-4 py-3 w-1/2 md:w-3/5">
                      {isGameFeatureEnabled(game) ? (
                        <Link
                          href={`/games/${game.slug}`}
                          className="text-[#107c10] hover:text-[#0e6b0e] transition-colors"
                        >
                          {game.title}
                        </Link>
                      ) : (
                        <button
                          onClick={() => setSelectedDisabledGame(game)}
                          className="text-[#107c10] hover:text-[#0e6b0e] transition-colors text-left"
                        >
                          {game.title}
                          <span className="ml-2 text-xs text-yellow-500">
                            (Help Needed)
                          </span>
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center w-1/4 md:w-1/5">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          game.activationType === "Legacy (5x5)"
                            ? "bg-green-500 text-white"
                            : game.activationType === "Legacy (Per-Title)"
                            ? "bg-yellow-500 text-black"
                            : "bg-red-500 text-white"
                        }`}
                      >
                        {game.activationType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center w-1/4 md:w-1/5">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          game.status === "supported"
                            ? "bg-green-500 text-white"
                            : game.status === "testing"
                            ? "bg-yellow-500 text-black"
                            : "bg-red-500 text-white"
                        }`}
                      >
                        {game.status.charAt(0).toUpperCase() +
                          game.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile view - Cards */}
          <div className="md:hidden space-y-4">
            {currentGames.map((game) => (
              <div
                key={game.slug}
                className="bg-[rgb(var(--bg-card-alt))] p-4 rounded-lg space-y-2"
              >
                <h3 className="text-lg font-medium">
                  {isGameFeatureEnabled(game) ? (
                    <Link
                      href={`/games/${game.slug}`}
                      className="text-[#107c10] hover:text-[#0e6b0e] transition-colors"
                    >
                      {game.title}
                    </Link>
                  ) : (
                    <button
                      onClick={() => setSelectedDisabledGame(game)}
                      className="text-[#107c10] hover:text-[#0e6b0e] transition-colors text-left"
                    >
                      {game.title}
                      <span className="ml-2 text-xs text-yellow-500">
                        (Help Needed)
                      </span>
                    </button>
                  )}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      game.activationType === "Legacy (5x5)"
                        ? "bg-green-500 text-white"
                        : game.activationType === "Legacy (Per-Title)"
                        ? "bg-yellow-500 text-black"
                        : "bg-red-500 text-white"
                    }`}
                  >
                    {game.activationType}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      game.status === "supported"
                        ? "bg-green-500 text-white"
                        : game.status === "testing"
                        ? "bg-yellow-500 text-black"
                        : "bg-red-500 text-white"
                    }`}
                  >
                    {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="text-[rgb(var(--text-secondary))]">
                Showing {indexOfFirstGame + 1}-
                {Math.min(indexOfLastGame, sortedGames.length)} of{" "}
                {sortedGames.length} games
              </div>
              <div className="flex justify-center mt-4 md:mt-0 space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-full ${
                    currentPage === 1
                      ? "bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-muted))] cursor-not-allowed"
                      : "bg-[#107c10] text-white hover:bg-[#0e6b0e]"
                  }`}
                  aria-label="Previous page"
                >
                  <FaChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-full ${
                        currentPage === page
                          ? "bg-[#107c10] text-white"
                          : "bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-card))]"
                      }`}
                      aria-label={`Page ${page}`}
                      aria-current={currentPage === page ? "page" : undefined}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded-full ${
                    currentPage === totalPages
                      ? "bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-muted))] cursor-not-allowed"
                      : "bg-[#107c10] text-white hover:bg-[#0e6b0e]"
                  }`}
                  aria-label="Next page"
                >
                  <FaChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Legend section - Improved for small screens */}
          <div className="mt-8 bg-[rgb(var(--bg-card))] p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4 text-[rgb(var(--text-primary))]">Legend</h2>
            <ul className="space-y-4">
              <li className="flex items-start">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                  <span
                    className="text-white text-xs"
                    style={{ fontSize: "10px" }}
                  >
                    ✓
                  </span>
                </div>
                <div>
                  <strong className="text-[rgb(var(--text-primary))]">Legacy (5x5):</strong> These
                  games use the 5x5 activation system and are fully supported by
                  our fix.
                </div>
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                  <span
                    className="text-black text-xs"
                    style={{ fontSize: "10px" }}
                  >
                    ●
                  </span>
                </div>
                <div>
                  <strong className="text-[rgb(var(--text-primary))]">Legacy (Per-Title):</strong>{" "}
                  These games use a per-title activation system and are
                  currently in testing.
                </div>
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                  <span
                    className="text-white text-xs"
                    style={{ fontSize: "10px" }}
                  >
                    ✕
                  </span>
                </div>
                <div>
                  <strong className="text-[rgb(var(--text-primary))]">SSA:</strong> These games use
                  the newer Server Side Activation method and are currently
                  unsupported.
                </div>
              </li>
            </ul>
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
          game={selectedDisabledGame}
          onClose={() => {
            setShowAddDetailsModal(false);
            setSelectedDisabledGame(null);
          }}
          onSubmit={() => {
            setShowAddDetailsModal(false);
            setSelectedDisabledGame(null);
            showToast(
              "Game details submitted successfully! They will be reviewed shortly.",
              5000
            );
          }}
          userId={session.user.id || ""}
          userName={session.user.name || "Anonymous"}
        />
      )}
    </div>
  );
}
