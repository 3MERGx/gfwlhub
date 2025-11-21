import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FaArrowLeft,
  FaDiscord,
  FaReddit,
  FaBookOpen,
  FaDatabase,
} from "react-icons/fa";
import { GamePageParams } from "@/types/routes";
import VirusTotalWidget from "@/components/VirusTotalWidget";
import StoreButton from "@/components/StoreButton";
import Image from "next/image";
import { Metadata } from "next";
import DownloadButtonWithModal from "@/components/DownloadButtonWithModal";
import { getAllGames, getGameBySlug } from "@/lib/games-service";
import { games as staticGames } from "@/data/games";
import MakeCorrectionButton from "./MakeCorrectionButton";
import DisabledGameBanner from "./DisabledGameBanner";
import { redirect } from "next/navigation";

// Get feature flags from .env.local or check if it's enabled in the game data
const getFeatureFlag = async (slug: string): Promise<boolean> => {
  // Check if the game has featureEnabled set to true in the data
  const gameData = await getGameBySlug(slug);
  if (gameData?.featureEnabled) return true;

  // Otherwise check environment variables
  return (
    process.env[`FEATURE_GAME_${slug.replace(/-/g, "_").toUpperCase()}`] ===
    "true"
  );
};

export async function generateStaticParams() {
  try {
    // Try to get games from MongoDB
    const games = await getAllGames();
    return games.map((game) => ({
      slug: game.slug,
    }));
  } catch (error) {
    // Fall back to static games array if MongoDB is unavailable during build
    // This allows the build to succeed even if MongoDB connection fails
    console.warn("MongoDB unavailable during build, using static games array:", error);
    return staticGames.map((game) => ({
      slug: game.slug,
    }));
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<GamePageParams>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const game = await getGameBySlug(slug);

  if (!game) {
    return {
      title: "Game Not Found - GFWL Hub",
      description: "The requested game could not be found.",
    };
  }

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
  params: paramsPromise,
}: {
  params: Promise<GamePageParams>;
}) {
  const params = await paramsPromise;
  const slug = params.slug;
  const game = await getGameBySlug(slug);

  if (!game) {
    notFound();
  }

  const isFeatureEnabled = await getFeatureFlag(slug);

  const disclaimerModalTitle = "Important Notice Regarding Downloads";
  const disclaimerModalContent = `You are downloading files from third-party, external sources. While GFWL Hub may scan links using tools such as VirusTotal, we do not host, control, or guarantee the safety of any files linked through our platform. GFWL Hub makes no warranties—express or implied—regarding the safety, reliability, or performance of these files.

By proceeding, you acknowledge and accept that all downloads are done at your own risk. GFWL Hub is not responsible for any harm to your device, data loss, or other consequences resulting from the use of downloaded files. We strongly advise keeping your antivirus software up-to-date and exercising caution.`;

  // Redirect disabled games back to supported games (they should use the modal on the list page)
  if (!isFeatureEnabled) {
    redirect("/supported-games");
  }

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
            <div className="flex gap-3 items-center">
              {game.discordLink && (
                <Link
                  href={game.discordLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-[#5865F2] transition-colors"
                  aria-label={`${game.title} Discord`}
                  title="Discord"
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
                  title="Reddit"
                >
                  <FaReddit size={24} />
                </Link>
              )}
              {game.wikiLink && (
                <Link
                  href={game.wikiLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-yellow-400 transition-colors"
                  aria-label={`${game.title} Wiki`}
                  title="View Wiki"
                >
                  <FaBookOpen size={22} />
                </Link>
              )}
              {game.steamDBLink && (
                <Link
                  href={game.steamDBLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-blue-400 transition-colors"
                  aria-label={`${game.title} SteamDB`}
                  title="View on SteamDB"
                >
                  <FaDatabase size={22} />
                </Link>
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 mb-6">
            {game.imageUrl && (
              <div className="md:w-1/3 flex-shrink-0">
                <Image
                  src={game.imageUrl}
                  alt={`${game.title} cover art`}
                  width={300}
                  height={400}
                  className="rounded-lg object-cover w-full h-auto shadow-lg"
                  priority
                />
              </div>
            )}
            <div className="md:ml-8 flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {game.title}
              </h1>

              {/* Activation Type and Status Badges */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    game.activationType === "SSA"
                      ? "bg-purple-600 text-purple-100"
                      : game.activationType === "Legacy (Per-Title)"
                      ? "bg-orange-600 text-orange-100"
                      : "bg-sky-600 text-sky-100" // Legacy (5x5)
                  }`}
                >
                  {game.activationType}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold
                    ${
                      game.status === "supported"
                        ? "bg-green-600 text-green-100"
                        : game.status === "testing"
                        ? "bg-yellow-500 text-yellow-100"
                        : "bg-red-600 text-red-100" // Mapped 'unsupported' to red
                    }`}
                >
                  {/* Display "Unsupported" if status is "unsupported", otherwise capitalize */}
                  {game.status === "unsupported"
                    ? "Unsupported"
                    : game.status.charAt(0).toUpperCase() +
                      game.status.slice(1)}
                </span>
              </div>

              <p className="text-gray-300 mb-4 text-sm leading-relaxed">
                {game.description}
              </p>

              {/* Released Date & Developer */}
              {(game.releaseDate || game.developer) && (
                <div className="text-sm text-gray-400 mb-1">
                  {game.releaseDate && (
                    <div className="mb-1">
                      Released:{" "}
                      <span className="text-gray-200">{game.releaseDate}</span>
                    </div>
                  )}
                  {game.developer && (
                    <div>
                      Developer:{" "}
                      <span className="text-gray-200">{game.developer}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Publisher */}
              {game.publisher && (
                <div className="text-sm text-gray-400 mb-4">
                  Publisher:{" "}
                  <span className="text-gray-200">{game.publisher}</span>
                </div>
              )}

              {/* Genres */}
              {game.genres && game.genres.length > 0 && (
                <div className="mb-3">
                  <span className="text-gray-400 text-sm">Genres: </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {game.genres?.map((genre: string, index: number) => (
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

              {/* Platforms */}
              {game.platforms && game.platforms.length > 0 && (
                <div className="mb-3">
                  <span className="text-gray-400 text-sm">Platforms: </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {game.platforms?.map((platform: string, index: number) => (
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
          </div>

          {/* Show banner for disabled games */}
          {!isFeatureEnabled && <DisabledGameBanner game={game} />}

          {isFeatureEnabled && game.downloadLink && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4 text-white">
                Game Download
              </h2>

              <div className="flex flex-wrap gap-3 mb-6">
                {game.downloadLink && (
                  <DownloadButtonWithModal
                    downloadLink={game.downloadLink}
                    fileName={game.fileName || game.title}
                    buttonText={`Download ${game.fileName || game.title}`}
                    modalTitle={disclaimerModalTitle}
                    modalContent={disclaimerModalContent}
                  />
                )}

                {game.purchaseLink && (
                  <StoreButton purchaseLink={game.purchaseLink} />
                )}
              </div>

              {game.downloadLink && game.virusTotalUrl && (
                <div className="mt-4">
                  <h3 className="text-xl font-semibold mb-2">Security Scan</h3>
                  <VirusTotalWidget virusTotalUrl={game.virusTotalUrl} />
                </div>
              )}
            </div>
          )}

          {game.instructions && game.instructions.length > 0 && (
            <>
              <h2 className="text-xl font-bold mb-3 mt-4 text-white">
                Installation Instructions
              </h2>
              <div className="bg-[#2d2d2d] p-4 rounded-lg">
                <ul className="list-disc list-inside space-y-3 text-gray-300">
                  {game.instructions?.map((instruction: string, index: number) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {game.knownIssues && game.knownIssues.length > 0 && (
            <>
              <h2 className="text-xl font-bold mb-3 mt-4 text-white">
                Known Issues
              </h2>
              <div className="bg-[#2d2d2d] p-4 rounded-lg">
                <ul className="list-disc list-inside space-y-3 text-gray-300">
                  {game.knownIssues?.map((issue: string, index: number) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {game.communityTips && game.communityTips.length > 0 && (
            <>
              <h2 className="text-xl font-bold mb-3 mt-4 text-white">
                Community Tips
              </h2>
              <div className="bg-[#2d2d2d] p-4 rounded-lg">
                <ul className="list-disc list-inside space-y-3 text-gray-300">
                  {game.communityTips?.map((tip: string, index: number) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
          {/* GOG Dreamlist Section */}
          {game.gogDreamlistLink && (
            <div className="mt-8 pt-6 border-t border-gray-700">
              <h2 className="text-xl font-bold mb-3 text-white">
                GOG <span className="text-purple-500">Dreamlist</span>
              </h2>
              <p className="text-gray-300 mb-4 text-sm leading-relaxed">
                Help bring this game to GOG! If you&apos;d like to see{" "}
                {game.title} available on GOG.com, please consider voting for it
                on their community wishlist.
              </p>
              <Link
                href={game.gogDreamlistLink}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-pink-500 hover:bg-pink-600 text-white font-semibold py-2 px-4 rounded-lg inline-flex items-center transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-opacity-75"
              >
                Vote for {game.title} on GOG.com
              </Link>
            </div>
          )}

          {/* Make Correction Section - Only show for enabled games */}
          {isFeatureEnabled && (
            <div className="mt-8 pt-6 border-t border-gray-700">
              <h2 className="text-xl font-bold mb-3 text-white">
                Found an Issue?
              </h2>
              <p className="text-gray-300 mb-4 text-sm leading-relaxed">
                Help us improve the accuracy of this page by submitting a correction. 
                All submissions are reviewed before being applied.
              </p>
              <MakeCorrectionButton game={game} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
