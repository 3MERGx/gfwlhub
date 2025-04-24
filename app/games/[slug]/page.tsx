import Link from "next/link";
import { notFound } from "next/navigation";
import { games } from "@/data/games";
import { FaArrowLeft, FaDiscord, FaReddit, FaDownload } from "react-icons/fa";
import { GamePageParams } from "@/types/routes";

// Get feature flags from .env.local or check if it's enabled in the game data
const getFeatureFlag = (slug: string): boolean => {
  // Check if the game has featureEnabled set to true in the data
  const game = games.find((g) => g.slug === slug);
  if (game?.featureEnabled) return true;

  // Otherwise check environment variables
  return (
    process.env[`FEATURE_GAME_${slug.replace(/-/g, "_").toUpperCase()}`] ===
    "true"
  );
};

export async function generateStaticParams() {
  return games.map((game) => ({
    slug: game.slug,
  }));
}

export default async function GamePage({
  params,
}: {
  params: Promise<GamePageParams>;
}) {
  // Access slug safely
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const game = games.find((g) => g.slug === slug);

  if (!game) {
    notFound();
  }

  const isFeatureEnabled = getFeatureFlag(slug);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#202020] p-8 rounded-lg shadow-xl">
          <div className="mb-6 flex justify-between items-center">
            <Link
              href="/supported-games"
              className="inline-flex items-center text-gray-300 hover:text-white transition-colors"
            >
              <FaArrowLeft className="mr-2" />
              Back to Supported Games
            </Link>

            {/* Community Links */}
            <div className="flex gap-3">
              {game.discordLink && (
                <Link
                  href={game.discordLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-[#5865F2] transition-colors"
                  aria-label={`${game.title} Discord`}
                >
                  <FaDiscord size={24} />
                </Link>
              )}
              {game.redditLink && (
                <Link
                  href={game.redditLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-[#FF4500] transition-colors"
                  aria-label={`${game.title} Reddit`}
                >
                  <FaReddit size={24} />
                </Link>
              )}
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-2 text-white">{game.title}</h1>

          <div className="flex flex-wrap gap-3 mb-6">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
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
              className={`px-3 py-1 rounded-full text-sm font-medium ${
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

          {game.description && (
            <p className="text-gray-300 mb-6">{game.description}</p>
          )}

          {isFeatureEnabled ? (
            <div className="space-y-6">
              {/* Game Download Section - Only show if downloadLink exists */}
              {game.downloadLink && (
                <>
                  <h2 className="text-xl font-bold mb-3 text-white">
                    Game Download
                  </h2>
                  <div>
                    <div className="mt-4">
                      <Link
                        href={game.downloadLink}
                        className="inline-flex items-center bg-[#107c10] hover:bg-[#0e6b0e] text-white px-4 py-2 rounded-md transition-colors"
                      >
                        <FaDownload className="mr-2" />
                        Download Game Files
                      </Link>
                    </div>
                  </div>
                </>
              )}

              {/* Known Issues Section - Only show if knownIssues exists and has items */}
              {game.knownIssues && game.knownIssues.length > 0 && (
                <>
                  <h2 className="text-xl font-bold mb-3 text-white">
                    Known Issues
                  </h2>
                  <div className="bg-[#2d2d2d] p-4 rounded-lg">
                    <ul className="list-disc list-inside space-y-3 text-gray-300">
                      {game.knownIssues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {/* Community Tips Section - Only show if communityTips exists and has items */}
              {game.communityTips && game.communityTips.length > 0 && (
                <>
                  <h2 className="text-xl font-bold mb-3 text-white">
                    Community Tips
                  </h2>
                  <div className="bg-[#2d2d2d] p-4 rounded-lg">
                    <ul className="list-disc list-inside space-y-3 text-gray-300">
                      {game.communityTips.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="bg-[#2d2d2d] p-6 rounded-lg text-center">
              <h2 className="text-xl font-bold mb-4 text-white">
                Page Under Construction
              </h2>
              <p className="text-gray-300 mb-4">
                We&apos;re still working on the dedicated page for {game.title}.
                Check back soon for installation guides, troubleshooting tips,
                and more!
              </p>
              <Link
                href="/contact"
                className="inline-block bg-[#107c10] hover:bg-[#0e6b0e] text-white px-4 py-2 rounded-md transition-colors"
              >
                Help Us Build This Page
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
