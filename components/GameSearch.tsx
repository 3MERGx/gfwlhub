"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaSearch } from "react-icons/fa";
import { Game } from "@/data/games";
import { useDebounce } from "@/hooks/useDebounce";
import { ActivationBadge, StatusBadge } from "@/components/GameBadges";
import { safeLog } from "@/lib/security";

const MAX_RESULTS = 8;

interface GameSearchProps {
  variant: "header" | "hero";
  id: string;
  className?: string;
  /** Stretch results to the input width (mobile menu). Desktop header keeps a wider panel. */
  fullWidth?: boolean;
  onNavigate?: () => void;
  onDisabledGame?: (game: Game) => void;
}

export default function GameSearch({
  variant,
  id,
  className = "",
  fullWidth = false,
  onNavigate,
  onDisabledGame,
}: GameSearchProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [games, setGames] = useState<Game[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const debouncedQuery = useDebounce(query, 200);

  useEffect(() => {
    let isMounted = true;
    async function fetchGames() {
      try {
        const response = await fetch("/api/games");
        if (response.ok && isMounted) {
          const data = await response.json();
          setGames(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (isMounted) {
          safeLog.error("Error fetching games for search:", error);
        }
      }
    }
    fetchGames();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const matches = useMemo(() => {
    const trimmed = debouncedQuery.trim().toLowerCase();
    if (!trimmed) return [];
    return games
      .filter((game) => game.title.toLowerCase().includes(trimmed))
      .slice(0, MAX_RESULTS);
  }, [games, debouncedQuery]);

  useEffect(() => {
    setHighlightIndex(0);
    setOpen(debouncedQuery.trim().length > 0 && matches.length > 0);
  }, [debouncedQuery, matches.length]);

  const goToCatalog = (value: string) => {
    const trimmed = value.trim();
    onNavigate?.();
    setOpen(false);
    router.push(
      trimmed
        ? `/supported-games?q=${encodeURIComponent(trimmed)}`
        : "/supported-games"
    );
  };

  const selectGame = (game: Game) => {
    setOpen(false);
    setQuery(game.title);
    onNavigate?.();
    if (game.featureEnabled) {
      router.push(`/games/${game.slug}`);
      return;
    }
    if (onDisabledGame) {
      onDisabledGame(game);
      return;
    }
    router.push(`/supported-games?q=${encodeURIComponent(game.title)}`);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (open && matches[highlightIndex]) {
      selectGame(matches[highlightIndex]);
      return;
    }
    goToCatalog(query);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open && matches.length > 0) setOpen(true);
      setHighlightIndex((index) =>
        matches.length === 0 ? 0 : (index + 1) % matches.length
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((index) =>
        matches.length === 0
          ? 0
          : (index - 1 + matches.length) % matches.length
      );
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const isHeader = variant === "header";
  const listId = `${id}-results`;

  return (
    <div ref={containerRef} className={`relative min-w-0 ${className}`}>
      <form onSubmit={handleSubmit} role="search">
        <label htmlFor={id} className="sr-only">
          Search games
        </label>
        <FaSearch
          className={`absolute left-3 top-1/2 -translate-y-1/2 ${
            isHeader ? "text-white/70" : "text-[#107c10]"
          }`}
          size={isHeader ? 14 : 18}
          aria-hidden
        />
        <input
          id={id}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(e.target.value.trim().length > 0);
          }}
          onFocus={() => {
            if (matches.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={isHeader ? "Search games..." : "Search for your game..."}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && matches[highlightIndex]
              ? `${id}-option-${highlightIndex}`
              : undefined
          }
          className={
            isHeader
              ? "w-full max-w-full rounded-md border border-white/30 bg-white/10 py-1.5 pl-9 pr-3 text-base xl:text-sm text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white"
              : "w-full rounded-lg border-0 bg-white py-3.5 pl-12 pr-4 text-neutral-900 caret-neutral-900 placeholder:text-neutral-500 shadow-lg focus:outline-none focus:ring-2 focus:ring-white [color-scheme:light]"
          }
        />
      </form>

      {open && matches.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className={`absolute z-[60] mt-1 max-h-80 overflow-x-hidden overflow-y-auto rounded-lg border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card))] py-1 shadow-xl ${
            isHeader && !fullWidth
              ? "right-0 w-[min(18rem,calc(100vw-2rem))]"
              : "left-0 right-0 w-full min-w-0 max-w-full text-left"
          }`}
        >
          {matches.map((game, index) => {
            const highlighted = index === highlightIndex;
            return (
              <li key={game.slug} role="presentation">
                <button
                  type="button"
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={highlighted}
                  className={`flex w-full min-w-0 max-w-full flex-col gap-1 overflow-hidden px-3 py-2 text-left ${
                    highlighted
                      ? "bg-[#107c10]/15"
                      : "hover:bg-[rgb(var(--bg-card-alt))]"
                  }`}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => selectGame(game)}
                >
                  <span className="text-sm font-medium text-[rgb(var(--text-primary))] line-clamp-1">
                    {game.title}
                    {!game.featureEnabled && (
                      <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">
                        Help Needed
                      </span>
                    )}
                  </span>
                  <span className="flex flex-wrap gap-1">
                    <ActivationBadge type={game.activationType} />
                    <StatusBadge status={game.status} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
