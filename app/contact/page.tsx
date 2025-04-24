"use client";

import { useState } from "react";
import Link from "next/link";
import { FaDiscord, FaReddit, FaSearch, FaTimes } from "react-icons/fa";
import Accordion from "@/components/Accordion";
import { games } from "@/data/games";

export default function Contact() {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter games that have either a Discord or Reddit link
  const gamesWithCommunities = games.filter(
    (game) => game.discordLink || game.redditLink
  );

  // Filter based on search query
  const filteredGames = gamesWithCommunities.filter(
    (game) =>
      game.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const clearSearch = () => {
    setSearchQuery("");
  };

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
                  href="https://discord.gg/your-discord-server"
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

              {filteredGames.length > 0 ? (
                <div className="space-y-4">
                  {filteredGames.map((game, index) => (
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
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
