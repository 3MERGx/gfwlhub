"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FaDiscord,
  FaReddit,
  FaSearch,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import Accordion from "@/components/Accordion";
import { games } from "@/data/games";

export default function Contact() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentCommunityPage, setCurrentCommunityPage] = useState(1);
  const communitiesPerPage = 5; // Or any number you prefer

  // Filter games that have community links
  const gamesWithCommunities = games.filter(
    (game) => game.discordLink || game.redditLink
  );

  // Filter based on search query (applied to gamesWithCommunities)
  const searchedGames = gamesWithCommunities.filter(
    (game) =>
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (game.description &&
        game.description.toLowerCase().includes(searchQuery.toLowerCase())) // Check if description exists
  );

  // Pagination logic for game communities (applied to searchedGames)
  const indexOfLastCommunity = currentCommunityPage * communitiesPerPage;
  const indexOfFirstCommunity = indexOfLastCommunity - communitiesPerPage;
  // These are the games to display in the accordion for the current page
  const currentDisplayCommunities = searchedGames.slice(
    indexOfFirstCommunity,
    indexOfLastCommunity
  );
  // Total pages should be based on the searched (filtered) games
  const totalCommunityPages = Math.ceil(
    searchedGames.length / communitiesPerPage
  );

  const clearSearch = () => {
    setSearchQuery("");
    setCurrentCommunityPage(1); // Reset to first page when search is cleared
  };

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentCommunityPage(1);
  }, [searchQuery]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#202020] p-8 rounded-lg shadow-xl mb-8">
          <h1 className="text-3xl font-bold mb-6 text-center text-white">
            Contact & Community
          </h1>

          <section className="mb-12">
            <div className="bg-[#2d2d2d] p-6 rounded-lg shadow-md border border-[#107c10]">
              <h2 className="text-2xl font-bold mb-4 text-white">
                GFWL Hub Discord
              </h2>
              <p className="mb-6 text-gray-300">
                Join our main Discord server to get help with GFWL issues, share
                your experiences, and connect with other players.
              </p>
              <div className="flex justify-center">
                <Link
                  href="https://discord.gg/PR75T8xMWS"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-6 py-3 rounded-md transition-colors inline-flex items-center"
                >
                  <FaDiscord className="mr-2" size={20} />
                  Join Discord Server
                </Link>
              </div>
            </div>
          </section>

          {gamesWithCommunities.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold mb-4 text-white">
                Game-Specific Communities
              </h2>

              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search game communities..."
                    className="w-full bg-[#2d2d2d] text-white border border-gray-700 rounded-md py-2 px-4 pl-10 pr-10 focus:outline-none focus:border-[#107c10]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <FaSearch className="absolute left-3 top-3 text-gray-400" />
                  {searchQuery && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-3 text-gray-400 hover:text-white"
                      aria-label="Clear search"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
              </div>

              {currentDisplayCommunities.length > 0 ? (
                <div className="space-y-4">
                  {currentDisplayCommunities.map((game, index) => (
                    <Accordion
                      key={index}
                      title={game.title}
                      content={
                        <div>
                          {game.description && (
                            <p className="mb-4 text-gray-300">
                              {game.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-4">
                            {game.discordLink && (
                              <Link
                                href={game.discordLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-md transition-colors inline-flex items-center"
                              >
                                <FaDiscord className="mr-2" />
                                Discord Community
                              </Link>
                            )}
                            {game.redditLink && (
                              <Link
                                href={game.redditLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-[#FF4500] hover:bg-[#E03D00] text-white px-4 py-2 rounded-md transition-colors inline-flex items-center"
                              >
                                <FaReddit className="mr-2" />
                                Reddit Community
                              </Link>
                            )}
                          </div>
                        </div>
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-[#2d2d2d] p-6 rounded-lg text-center">
                  <p className="text-gray-300">
                    No game communities found matching your search.
                  </p>
                </div>
              )}

              {/* Pagination for Game Specific Communities */}
              {searchedGames.length > communitiesPerPage && (
                <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="text-gray-300 text-sm mb-2 md:mb-0">
                    Showing {indexOfFirstCommunity + 1}-
                    {Math.min(indexOfLastCommunity, searchedGames.length)} of{" "}
                    {searchedGames.length} communities
                  </div>
                  <div className="flex justify-center items-center space-x-2">
                    <button
                      onClick={() =>
                        setCurrentCommunityPage(currentCommunityPage - 1)
                      }
                      disabled={currentCommunityPage === 1}
                      className={`p-2 rounded-full ${
                        currentCommunityPage === 1
                          ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                          : "bg-[#107c10] text-white hover:bg-[#0e6b0e]"
                      }`}
                      aria-label="Previous page"
                    >
                      <FaChevronLeft size={16} />
                    </button>
                    {Array.from(
                      { length: totalCommunityPages },
                      (_, i) => i + 1
                    ).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentCommunityPage(page)}
                        className={`w-8 h-8 rounded-full text-sm ${
                          currentCommunityPage === page
                            ? "bg-[#107c10] text-white"
                            : "bg-[#2d2d2d] text-gray-300 hover:bg-[#3d3d3d]"
                        }`}
                        aria-label={`Page ${page}`}
                        aria-current={
                          currentCommunityPage === page ? "page" : undefined
                        }
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() =>
                        setCurrentCommunityPage(currentCommunityPage + 1)
                      }
                      disabled={currentCommunityPage === totalCommunityPages}
                      className={`p-2 rounded-full ${
                        currentCommunityPage === totalCommunityPages
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
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
