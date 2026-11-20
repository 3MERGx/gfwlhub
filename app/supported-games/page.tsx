"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ActivationType,
  Game,
  SupportStatus,
} from "@/data/games";
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
import GameImage from "@/components/GameImage";
import {
  ActivationBadge,
  StatusBadge,
  ACTIVATION_FILTERS,
  STATUS_FILTERS,
} from "@/components/GameBadges";
import { usePusherChannel } from "@/hooks/usePusherChannel";
import { PUSHER_EVENTS } from "@/lib/pusher-client";

const isGameFeatureEnabled = (game: Game): boolean => !!game.featureEnabled;

type SortDirection = "asc" | "desc";

function FilterChip({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={description}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#107c10]/40 ${
        active
          ? "border-[#107c10] bg-[#107c10] text-white"
          : "border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-secondary))] hover:border-[#107c10] hover:text-[rgb(var(--text-primary))]"
      }`}
    >
      {label}
    </button>
  );
}

function SupportedGamesContent() {
  const { showToast } = useToast();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [activationFilters, setActivationFilters] = useState<ActivationType[]>(
    []
  );
  const [statusFilters, setStatusFilters] = useState<SupportStatus[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const gamesPerPage = 12;
  const [selectedDisabledGame, setSelectedDisabledGame] = useState<Game | null>(
    null
  );
  const [showAddDetailsModal, setShowAddDetailsModal] = useState(false);
  const [refreshGamesTrigger, setRefreshGamesTrigger] = useState(0);
  const [initializedFromQuery, setInitializedFromQuery] = useState(false);

  useEffect(() => {
    if (initializedFromQuery) return;
    const q = searchParams.get("q");
    if (q) setSearchQuery(q);
    setInitializedFromQuery(true);
  }, [searchParams, initializedFromQuery]);

  useEffect(() => {
    let isMounted = true;

    async function fetchGames() {
      try {
        const response = await fetch(`/api/games?_t=${Date.now()}`, {
          cache: "no-store",
        });
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
        if (isMounted) setLoading(false);
      }
    }
    fetchGames();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshGamesTrigger]);

  usePusherChannel(PUSHER_EVENTS.GAMES_UPDATED, () => {
    setRefreshGamesTrigger((t) => t + 1);
  });
  usePusherChannel(PUSHER_EVENTS.GAME_UPDATED, () => {
    setRefreshGamesTrigger((t) => t + 1);
  });

  useEffect(() => {
    const onFocus = () => setRefreshGamesTrigger((t) => t + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const toggleActivationFilter = (value: ActivationType) => {
    setActivationFilters((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
    setCurrentPage(1);
  };

  const toggleStatusFilter = (value: SupportStatus) => {
    setStatusFilters((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setActivationFilters([]);
    setStatusFilters([]);
    setSearchQuery("");
    setCurrentPage(1);
  };

  const filteredGames = useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    const query = trimmedQuery.toLowerCase();

    return games.filter((game) => {
      if (
        activationFilters.length > 0 &&
        !activationFilters.includes(game.activationType)
      ) {
        return false;
      }
      if (statusFilters.length > 0 && !statusFilters.includes(game.status)) {
        return false;
      }

      if (!trimmedQuery) return true;

      const title = game.title.toLowerCase();
      const description = game.description?.toLowerCase() || "";
      const titleMatch = title.includes(query);

      let descriptionMatch = false;
      if (query.length >= 3) {
        descriptionMatch = description.includes(query);
      } else if (query.length >= 1) {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const wordBoundaryRegex = new RegExp(`\\b${escapedQuery}\\b`, "i");
        descriptionMatch = wordBoundaryRegex.test(description);
      }

      return titleMatch || descriptionMatch;
    });
  }, [games, searchQuery, activationFilters, statusFilters]);

  const sortedGames = useMemo(() => {
    return [...filteredGames].sort((a, b) => {
      const aValue = a.title.toLowerCase();
      const bValue = b.title.toLowerCase();
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredGames, sortDirection]);

  const indexOfLastGame = currentPage * gamesPerPage;
  const indexOfFirstGame = indexOfLastGame - gamesPerPage;
  const currentGames = sortedGames.slice(indexOfFirstGame, indexOfLastGame);
  const totalPages = Math.max(1, Math.ceil(sortedGames.length / gamesPerPage));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [currentPage, totalPages]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    activationFilters.length > 0 ||
    statusFilters.length > 0;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-[rgb(var(--bg-card))] p-8 rounded-lg shadow-xl">
            <div className="text-center text-[rgb(var(--text-primary))]">
              Loading games...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-[rgb(var(--bg-card))] p-6 md:p-8 rounded-lg shadow-xl">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-3xl font-bold text-[rgb(var(--text-primary))]">
              Supported Games
            </h1>
            <button
              type="button"
              onClick={() =>
                setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
              }
              className="inline-flex items-center gap-2 self-start rounded-md border border-[rgb(var(--border-color))] px-3 py-2 text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] focus:outline-none focus:ring-2 focus:ring-[#107c10]/40"
              aria-label={`Sort by title ${
                sortDirection === "asc" ? "descending" : "ascending"
              }`}
            >
              Title
              {sortDirection === "asc" ? (
                <FaSortUp aria-hidden />
              ) : (
                <FaSortDown aria-hidden />
              )}
              <FaSort className="text-[rgb(var(--text-muted))]" aria-hidden />
            </button>
          </div>

          <div className="mb-6 p-3 rounded-lg bg-[rgb(var(--bg-card-alt))] border border-[rgb(var(--border-color))] text-center text-sm text-[rgb(var(--text-secondary))]">
            Have suggestions for the platform or game detail pages? Let us know
            on the{" "}
            <Link
              href="https://discord.gg/PR75T8xMWS"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#107c10] hover:text-[#0e6b0e] underline"
            >
              community Discord
            </Link>
            .
          </div>

          <div className="mb-4">
            <div className="relative">
              <input
                type="search"
                placeholder="Search games..."
                className="w-full bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-primary))] border border-[rgb(var(--border-color))] rounded-md py-2.5 pl-10 pr-10 focus:outline-none focus:border-[#107c10] focus:ring-2 focus:ring-[#107c10]/20"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                aria-label="Search games"
              />
              <FaSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]"
                aria-hidden
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]"
                  aria-label="Clear search"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>

          <div className="mb-6 space-y-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                Activation type
              </p>
              <div className="flex flex-wrap gap-2">
                {ACTIVATION_FILTERS.map((filter) => (
                  <FilterChip
                    key={filter.value}
                    label={filter.label}
                    description={filter.description}
                    active={activationFilters.includes(filter.value)}
                    onClick={() => toggleActivationFilter(filter.value)}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--text-muted))]">
                Status
              </p>
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((filter) => (
                  <FilterChip
                    key={filter.value}
                    label={filter.label}
                    description={filter.description}
                    active={statusFilters.includes(filter.value)}
                    onClick={() => toggleStatusFilter(filter.value)}
                  />
                ))}
              </div>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-[#107c10] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {currentGames.length === 0 ? (
            <div className="py-16 text-center text-[rgb(var(--text-secondary))]">
              <p className="mb-2">No games match your search or filters.</p>
              <p className="mb-4 text-sm">
                Games marked Help Needed still need community details. Try a
                different title, or clear filters to browse everything.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[#107c10] font-medium hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentGames.map((game) => {
                const enabled = isGameFeatureEnabled(game);
                const cardInner = (
                  <>
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-[rgb(var(--bg-card-alt))]">
                      <GameImage
                        src={game.imageUrl}
                        alt={`${game.title} cover art`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <h2 className="text-base font-semibold text-[rgb(var(--text-primary))] line-clamp-2 group-hover:text-[#107c10]">
                        {game.title}
                        {!enabled && (
                          <span className="ml-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                            (Help Needed)
                          </span>
                        )}
                      </h2>
                      <div className="mt-auto flex flex-wrap gap-2">
                        <ActivationBadge type={game.activationType} />
                        <StatusBadge status={game.status} />
                      </div>
                    </div>
                  </>
                );

                if (enabled) {
                  return (
                    <Link
                      key={game.slug}
                      href={`/games/${game.slug}`}
                      className="group flex flex-col overflow-hidden rounded-lg border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] transition-shadow hover:border-[#107c10] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#107c10]/40"
                    >
                      {cardInner}
                    </Link>
                  );
                }

                return (
                  <button
                    key={game.slug}
                    type="button"
                    onClick={() => setSelectedDisabledGame(game)}
                    className="group flex flex-col overflow-hidden rounded-lg border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card-alt))] text-left transition-shadow hover:border-[#107c10] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#107c10]/40"
                  >
                    {cardInner}
                  </button>
                );
              })}
            </div>
          )}

          {sortedGames.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-[rgb(var(--text-secondary))]">
                Showing {indexOfFirstGame + 1}-
                {Math.min(indexOfLastGame, sortedGames.length)} of{" "}
                {sortedGames.length} games
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm ${
                    currentPage === 1
                      ? "bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-muted))] cursor-not-allowed"
                      : "bg-[#107c10] text-white hover:bg-[#0e6b0e]"
                  }`}
                  aria-label="Previous page"
                >
                  <FaChevronLeft size={12} />
                  Previous
                </button>
                <span className="text-sm text-[rgb(var(--text-secondary))]">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm ${
                    currentPage === totalPages
                      ? "bg-[rgb(var(--bg-card-alt))] text-[rgb(var(--text-muted))] cursor-not-allowed"
                      : "bg-[#107c10] text-white hover:bg-[#0e6b0e]"
                  }`}
                  aria-label="Next page"
                >
                  Next
                  <FaChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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

export default function SupportedGames() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="bg-[rgb(var(--bg-card))] p-8 rounded-lg shadow-xl">
              <div className="text-center text-[rgb(var(--text-primary))]">
                Loading games...
              </div>
            </div>
          </div>
        </div>
      }
    >
      <SupportedGamesContent />
    </Suspense>
  );
}
