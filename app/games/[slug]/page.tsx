import Link from "next/link";
import { notFound } from "next/navigation";
import { games } from "@/data/games";
import { FaArrowLeft, FaDiscord, FaReddit, FaDownload } from "react-icons/fa";
import { GamePageParams } from "@/types/routes";
import VirusTotalWidget from "@/components/VirusTotalWidget";
import StoreButton from "@/components/StoreButton";
import Image from "next/image";
import { Metadata } from "next";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<GamePageParams>;
}): Promise<Metadata> {
  // Await the params
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const game = games.find((g) => g.slug === slug);

  if (!game) {
    return {
      title: "Game Not Found - GFWL Hub",
      description: "The requested game could not be found.",
    };
  }

  // Base metadata
  const metadata: Metadata = {
    title: `${game.title} | GFWL Hub`,
    description: game.description,
    openGraph: {
      title: `${game.title} | GFWL Hub`,
      description: game.description,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${game.title} | GFWL Hub`,
      description: game.description,
    },
  };

  // Only add image metadata if the game has an imageUrl
  if (game.imageUrl) {
    if (metadata.openGraph) {
      metadata.openGraph.images = [game.imageUrl];
    }
    if (metadata.twitter) {
      metadata.twitter.images = [game.imageUrl];
    }
  }

  return metadata;
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

            {/* Community Links - keep just Discord and Reddit here */}
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

          <div className="flex flex-col md:flex-row gap-6 mb-6">
            {/* Game Image - Only show if imageUrl exists */}
            {game.imageUrl && (
              <div className="md:w-1/3">
                <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden">
                  <Image
                    src={game.imageUrl}
                    alt={`${game.title} cover`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              </div>
            )}

            {/* Game Details */}
            <div className={game.imageUrl ? "md:w-2/3" : "w-full"}>
              <h1 className="text-3xl font-bold mb-2 text-white">
                {game.title}
              </h1>

              <div className="flex flex-wrap gap-3 mb-4">
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
                <p className="text-gray-300 mb-4">{game.description}</p>
              )}

              {/* Game Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm mb-4">
                {game.releaseDate && (
                  <div className="flex">
                    <span className="text-gray-400 w-24">Released:</span>
                    <span className="text-white">{game.releaseDate}</span>
                  </div>
                )}

                {game.developer && (
                  <div className="flex">
                    <span className="text-gray-400 w-24">Developer:</span>
                    <span className="text-white">{game.developer}</span>
                  </div>
                )}

                {game.publisher && (
                  <div className="flex">
                    <span className="text-gray-400 w-24">Publisher:</span>
                    <span className="text-white">{game.publisher}</span>
                  </div>
                )}
              </div>

              {/* Genres and Platforms */}
              {(game.genres.length > 0 || game.platforms.length > 0) && (
                <div className="mb-4">
                  {game.genres.length > 0 && (
                    <div className="mb-2">
                      <span className="text-gray-400 text-sm">Genres: </span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {game.genres.map((genre, index) => (
                          <span
                            key={index}
                            className="bg-[#2d2d2d] px-2 py-1 rounded text-xs text-white"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {game.platforms.length > 0 && (
                    <div>
                      <span className="text-gray-400 text-sm">Platforms: </span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {game.platforms.map((platform, index) => (
                          <span
                            key={index}
                            className="bg-[#2d2d2d] px-2 py-1 rounded text-xs text-white"
                          >
                            {platform}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Game Download section with purchase button */}
          {isFeatureEnabled && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4 text-white">
                Game Download
              </h2>

              <div className="flex flex-wrap gap-3 mb-6">
                {game.downloadLink && (
                  <Link
                    href={game.downloadLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    <FaDownload className="mr-2" />
                    Download {game.fileName || game.title}
                  </Link>
                )}

                {/* Store purchase button positioned next to the download button */}
                {game.purchaseLink && (
                  <StoreButton purchaseLink={game.purchaseLink} />
                )}
              </div>

              {/* VirusTotal Widget */}
              {game.downloadLink && game.virusTotalUrl && (
                <div className="mt-4">
                  <h3 className="text-xl font-semibold mb-2">Security Scan</h3>
                  <VirusTotalWidget virusTotalUrl={game.virusTotalUrl} />
                </div>
              )}
            </div>
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
      </div>
    </div>
  );
}
