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
import { Metadata } from "next";
import { getAllGames, getGameBySlug } from "@/lib/games-service";
import { games as staticGames } from "@/data/games";
import MakeCorrectionButton from "./MakeCorrectionButton";
import DisabledGameBanner from "./DisabledGameBanner";
import { redirect } from "next/navigation";
import { safeLog } from "@/lib/security";
import UnplayableGameBanner from "@/components/UnplayableGameBanner";
import GameDownloadsPanel from "@/components/GameDownloadsPanel";
import RemasteredVersionCard from "@/components/RemasteredVersionCard";
import {
  ActivationBadge,
  PlayabilityBadge,
  StatusBadge,
} from "@/components/GameBadges";
import TextWithLinks from "@/components/TextWithLinks";
import GameImage from "@/components/GameImage";
import AboutThisGame from "@/components/AboutThisGame";
import GamePageRealtime from "./GamePageRealtime";

/** ISR fallback when no on-demand revalidation runs (see `revalidateGameDerivedPaths`). */
export const revalidate = 3600;

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
    safeLog.warn(
      "MongoDB unavailable during build, using static games array:",
      error
    );
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

  // Convert imageUrl to absolute URL if it's relative
  const getAbsoluteImageUrl = (
    imageUrl: string | undefined
  ): string | undefined => {
    if (!imageUrl) return undefined;
    // If it's already an absolute URL (starts with http:// or https://), return as-is
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }
    // If it's a relative URL, convert to absolute
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://gfwl-hub.vercel.app";
    return `${baseUrl}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
  };

  const absoluteImageUrl = getAbsoluteImageUrl(game.imageUrl);

  // Get playability status badge for social cards
  const getPlayabilityBadge = (): string => {
    if (game.isUnplayable) {
      return "⚠️ Unplayable";
    }
    switch (game.playabilityStatus) {
      case "unplayable":
        return "⚠️ Unplayable";
      case "community_alternative":
        return "✓ Community Alternative Available";
      case "remastered_available":
        return "✓ Remastered Available";
      case "playable":
      default:
        return "✓ Playable";
    }
  };

  const playabilityBadge = getPlayabilityBadge();
  const descriptionWithBadge = `${game.description} • ${playabilityBadge}`;

  const metadata: Metadata = {
    title: `${game.title} | GFWL Hub`,
    description: descriptionWithBadge,
    openGraph: {
      title: `${game.title} | GFWL Hub`,
      description: descriptionWithBadge,
      type: "article",
      url: `${
        process.env.NEXT_PUBLIC_SITE_URL || "https://gfwl-hub.vercel.app"
      }/games/${slug}`,
      siteName: "GFWL Hub",
      ...(absoluteImageUrl && {
        images: [
          {
            url: absoluteImageUrl,
            alt: `${game.title} box art`,
          },
        ],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: `${game.title} | GFWL Hub`,
      description: descriptionWithBadge,
      ...(absoluteImageUrl && {
        images: [absoluteImageUrl],
      }),
    },
  };

  return metadata;
}

const BYPASS_PHRASE = "5x5 activation bypass";

function ActivationNotes({ text }: { text: string }) {
  const index = text.toLowerCase().indexOf(BYPASS_PHRASE);
  if (index === -1) {
    return <TextWithLinks text={text} />;
  }

  const before = text.slice(0, index);
  const matched = text.slice(index, index + BYPASS_PHRASE.length);
  const after = text.slice(index + BYPASS_PHRASE.length);

  return (
    <>
      {before ? <TextWithLinks text={before} /> : null}
      <Link
        href="/download"
        className="text-[#107c10] font-medium hover:underline"
      >
        {matched}
      </Link>{after ? <TextWithLinks text={after} /> : null}
    </>
  );
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

  const hasDownloadSection =
    isFeatureEnabled &&
    !!(
      game.downloadLink ||
      game.purchaseLink ||
      game.communityAlternativeDownloadLink ||
      game.communityAlternativeUrl ||
      game.communityAlternativeName
    );
  const hasInstructions = !!(game.instructions && game.instructions.length > 0);
  const hasKnownIssues = !!(game.knownIssues && game.knownIssues.length > 0);
  const hasCommunityTips = !!(
    game.communityTips && game.communityTips.length > 0
  );
  const hasAlternative = !!(
    game.communityAlternativeName ||
    game.communityAlternativeUrl ||
    game.communityAlternativeDownloadLink ||
    game.remasteredName
  );
  const hasReferenceLinks = !!(game.wikiLink || game.steamDBLink);
  const hasAboutThisGame = !!(
    game.releaseDate ||
    game.developer ||
    game.publisher ||
    (game.genres && game.genres.length > 0) ||
    (game.platforms && game.platforms.length > 0) ||
    game.additionalDRM
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <GamePageRealtime slug={slug} />
      <div className="max-w-4xl mx-auto">
        <div className="bg-[rgb(var(--bg-card))] p-6 md:p-8 rounded-lg shadow-xl">
          <div className="mb-4">
            <Link
              href="/supported-games"
              className="inline-flex items-center text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
            >
              <FaArrowLeft className="mr-2" />
              Back to Supported Games
            </Link>
          </div>

          <div className="flex flex-col md:flex-row md:items-start gap-6 mb-6">
            <div className="md:w-1/3 flex-shrink-0">
              <GameImage
                src={game.imageUrl}
                alt={`${game.title} cover art`}
                width={300}
                height={400}
                className="rounded-lg object-cover w-full h-auto shadow-lg"
                priority
              />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-[rgb(var(--text-primary))] mb-2">
                {game.title}
              </h1>

              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <ActivationBadge type={game.activationType} />
                <StatusBadge status={game.status} />
                {game.playabilityStatus &&
                  game.playabilityStatus !== "playable" && (
                    <PlayabilityBadge status={game.playabilityStatus} />
                  )}
              </div>

              {game.activationNotes && (
                <p className="text-sm text-[rgb(var(--text-secondary))] mb-4 leading-relaxed">
                  <ActivationNotes text={game.activationNotes} />
                </p>
              )}

              <nav
                className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm"
                aria-label="On this page"
              >
                {hasInstructions && (
                  <a
                    href="#instructions"
                    className="text-[#107c10] hover:underline"
                  >
                    Instructions
                  </a>
                )}
                {hasKnownIssues && (
                  <a
                    href="#known-issues"
                    className="text-[#107c10] hover:underline"
                  >
                    Known issues
                  </a>
                )}
                {hasCommunityTips && (
                  <a
                    href="#community-tips"
                    className="text-[#107c10] hover:underline"
                  >
                    Tips
                  </a>
                )}
                <a href="#get-help" className="text-[#107c10] hover:underline">
                  Help
                </a>
              </nav>

              {hasReferenceLinks && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {game.wikiLink && (
                    <Link
                      href={game.wikiLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-[rgb(var(--border-color))] px-2.5 py-1.5 text-xs font-medium text-[rgb(var(--text-primary))] hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                    >
                      <FaBookOpen size={14} aria-hidden />
                      Wiki
                    </Link>
                  )}
                  {game.steamDBLink && (
                    <Link
                      href={game.steamDBLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-[rgb(var(--border-color))] px-2.5 py-1.5 text-xs font-medium text-[rgb(var(--text-primary))] hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      <FaDatabase size={14} aria-hidden />
                      SteamDB
                    </Link>
                  )}
                </div>
              )}

              <p className="text-[rgb(var(--text-secondary))] mb-4 text-sm leading-relaxed">
                {game.description}
              </p>

              {game.isUnplayable && (
                <UnplayableGameBanner hasAlternative={hasAlternative} />
              )}
              {game.remasteredName && (
                <RemasteredVersionCard
                  remasteredName={game.remasteredName}
                  remasteredPlatform={game.remasteredPlatform}
                />
              )}

              {hasDownloadSection && (
                <GameDownloadsPanel
                  game={game}
                  disclaimerTitle={disclaimerModalTitle}
                  disclaimerContent={disclaimerModalContent}
                />
              )}

              {hasAboutThisGame && (
                <div>
                  {isFeatureEnabled && (
                    <div className="flex justify-end mb-1">
                      <MakeCorrectionButton
                        game={game}
                        variant="link"
                        label="Suggest a change"
                      />
                    </div>
                  )}
                  <AboutThisGame
                    releaseDate={game.releaseDate}
                    developer={game.developer}
                    publisher={game.publisher}
                    genres={game.genres}
                    platforms={game.platforms}
                    additionalDRM={game.additionalDRM}
                  />
                </div>
              )}
            </div>
          </div>

          {!isFeatureEnabled && <DisabledGameBanner game={game} />}

          {hasInstructions && (
            <section id="instructions" className="scroll-mt-24">
              <div className="flex items-center justify-between gap-3 mb-3 mt-4 flex-wrap">
                <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">
                  Installation Instructions
                </h2>
                {isFeatureEnabled && (
                  <MakeCorrectionButton
                    game={game}
                    variant="link"
                    initialField="instructions"
                  />
                )}
              </div>
              <div className="bg-[rgb(var(--bg-card-alt))] p-4 rounded-lg">
                <ol className="space-y-4 text-[rgb(var(--text-secondary))]">
                  {game.instructions?.map(
                    (instruction: string, index: number) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-[#107c10] text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </span>
                        <div className="pt-0.5">
                          <TextWithLinks text={instruction} />
                        </div>
                      </li>
                    )
                  )}
                </ol>
              </div>
            </section>
          )}

          {hasKnownIssues && (
            <section id="known-issues" className="scroll-mt-24">
              <div className="flex items-center justify-between gap-3 mb-3 mt-4 flex-wrap">
                <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">
                  Known Issues
                </h2>
                {isFeatureEnabled && (
                  <MakeCorrectionButton
                    game={game}
                    variant="link"
                    initialField="knownIssues"
                  />
                )}
              </div>
              <div className="bg-[rgb(var(--bg-card-alt))] p-4 rounded-lg">
                <ul className="list-disc list-inside space-y-3 text-[rgb(var(--text-secondary))]">
                  {game.knownIssues?.map((issue: string, index: number) => (
                    <li key={index}>
                      <TextWithLinks text={issue} />
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {hasCommunityTips && (
            <section id="community-tips" className="scroll-mt-24">
              <div className="flex items-center justify-between gap-3 mb-3 mt-4 flex-wrap">
                <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">
                  Community Tips
                </h2>
                {isFeatureEnabled && (
                  <MakeCorrectionButton
                    game={game}
                    variant="link"
                    initialField="communityTips"
                  />
                )}
              </div>
              <div className="bg-[rgb(var(--bg-card-alt))] p-4 rounded-lg">
                <ul className="list-disc list-inside space-y-3 text-[rgb(var(--text-secondary))]">
                  {game.communityTips?.map((tip: string, index: number) => (
                    <li key={index}>
                      <TextWithLinks text={tip} />
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {game.gogDreamlistLink && (
            <div className="mt-8 pt-6 border-t border-[rgb(var(--border-color))]">
              <h2 className="text-xl font-bold mb-3 text-[rgb(var(--text-primary))]">
                <span className="text-[rgb(var(--text-primary))]">GOG</span>{" "}
                <span className="text-purple-500">Dreamlist</span>
              </h2>
              <p className="text-[rgb(var(--text-secondary))] mb-4 text-sm leading-relaxed">
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

          {isFeatureEnabled && (
            <div className="mt-8 pt-6 border-t border-[rgb(var(--border-color))]">
              <h2 className="text-xl font-bold mb-3 text-[rgb(var(--text-primary))]">
                Found an issue?
              </h2>
              <p className="text-[rgb(var(--text-primary))] mb-4 text-sm leading-relaxed">
                Suggest a correction for one field at a time. Nothing goes live
                until a reviewer approves it.
              </p>
              <MakeCorrectionButton game={game} />
            </div>
          )}

          <div
            id="get-help"
            className="mt-8 pt-6 border-t border-[rgb(var(--border-color))] scroll-mt-24"
          >
            <h2 className="text-xl font-bold mb-3 text-[rgb(var(--text-primary))]">
              Get Help
            </h2>
            <p className="text-[rgb(var(--text-secondary))] mb-4 text-sm leading-relaxed">
              Have a question, ran into an error, or need troubleshooting for{" "}
              {game.title}? Ask in these communities:
            </p>
            <div className="flex flex-wrap gap-3">
              {game.discordLink && (
                <Link
                  href={game.discordLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <FaDiscord size={18} />
                  {game.title} Discord
                </Link>
              )}
              {game.redditLink && (
                <Link
                  href={game.redditLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#FF4500] hover:bg-[#E03D00] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <FaReddit size={18} />
                  {game.title} Reddit
                </Link>
              )}
              <Link
                href="https://discord.gg/PR75T8xMWS"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <FaDiscord size={18} />
                GFWL Hub Discord
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
