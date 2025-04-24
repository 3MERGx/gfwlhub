"use client";

import { useState } from "react";
import Link from "next/link";
import { Game, games } from "@/data/games";
import { useToast } from "@/components/ui/toast-context";
import {
  FaSort,
  FaSortUp,
  FaSortDown,
  FaSearch,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

// Helper function to check if a game has its feature enabled
const isGameFeatureEnabled = (game: Game): boolean => {
  return !!game.featureEnabled;
};

type SortField = "title" | "activationType" | "status";
type SortDirection = "asc" | "desc";

export default function SupportedGames() {
  const { showToast } = useToast();
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const gamesPerPage = 10;

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

  // Filter games based on search query
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

  const handleGameClick = (e: React.MouseEvent, game: Game) => {
    if (!isGameFeatureEnabled(game)) {
      e.preventDefault();
      showToast(
        `The page for ${game.title} is still under construction. Check back soon!`
      );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-[#202020] p-8 rounded-lg shadow-xl">
          <h1 className="text-3xl font-bold mb-6 text-center text-white">
            Supported Games
          </h1>

          <div className="mb-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search games..."
                className="w-full bg-[#2d2d2d] text-white border border-gray-700 rounded-md py-2 pl-10 pr-10 focus:outline-none focus:border-[#107c10]"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page when search changes
                }}
              />
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
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
                <tr className="bg-[#2d2d2d]">
                  <th className="px-4 py-3 text-left text-white w-1/2 md:w-3/5">
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
                        <FaSort className="ml-1 text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center text-white w-1/4 md:w-1/5">
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
                        <FaSort className="ml-1 text-gray-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center text-white w-1/4 md:w-1/5">
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
                        <FaSort className="ml-1 text-gray-400" />
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentGames.map((game) => (
                  <tr
                    key={game.slug}
                    className="border-b border-gray-700 hover:bg-[#2d2d2d]"
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
                          onClick={(e) => handleGameClick(e, game)}
                          className="text-[#107c10] hover:text-[#0e6b0e] transition-colors text-left"
                        >
                          {game.title}
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
                className="bg-[#2d2d2d] p-4 rounded-lg space-y-2"
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
                      onClick={(e) => handleGameClick(e, game)}
                      className="text-[#107c10] hover:text-[#0e6b0e] transition-colors text-left"
                    >
                      {game.title}
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
              <div className="text-gray-300">
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
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
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
                          : "bg-[#2d2d2d] text-gray-300 hover:bg-[#3d3d3d]"
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
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
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
          <div className="mt-8 bg-[#2d2d2d] p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4 text-white">Legend</h2>
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
                  <strong className="text-white">Legacy (5x5):</strong> These
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
                  <strong className="text-white">Legacy (Per-Title):</strong>{" "}
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
                  <strong className="text-white">SSA:</strong> These games use
                  the newer Secure Storage Area activation method and are
                  currently unsupported.
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
