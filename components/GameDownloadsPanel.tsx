import type { ReactNode } from "react";
import Link from "next/link";
import { FaExternalLinkAlt } from "react-icons/fa";
import type { Game } from "@/data/games";
import DownloadButtonWithModal from "@/components/DownloadButtonWithModal";
import StoreButton from "@/components/StoreButton";
import VirusTotalWidget from "@/components/VirusTotalWidget";

interface GameDownloadsPanelProps {
  game: Game;
  disclaimerTitle: string;
  disclaimerContent: string;
}

function isLauncherDownload(game: Game): boolean {
  if (game.downloadType === "launcher") return true;
  return !!game.fileName && /launcher|installer|setup/i.test(game.fileName);
}

function originalDownloadButtonText(game: Game): string {
  if (isLauncherDownload(game)) {
    return game.fileName ? `Download ${game.fileName}` : "Download launcher";
  }
  return "Download game files";
}

function DownloadRow({
  label,
  title,
  actions,
  virusTotalUrl,
}: {
  label?: string;
  title?: string;
  actions?: ReactNode;
  virusTotalUrl?: string;
}) {
  return (
    <div>
      <div>
        {label ? (
          <p className="text-xs uppercase tracking-wide text-[rgb(var(--text-muted))] mb-1">
            {label}
          </p>
        ) : null}
        {title ? (
          <p
            className={`text-sm font-medium text-[rgb(var(--text-primary))] ${
              actions ? "mb-2" : ""
            }`}
          >
            {title}
          </p>
        ) : null}
        {actions ? (
          <div className="flex flex-wrap items-start gap-2">{actions}</div>
        ) : null}
      </div>
      {virusTotalUrl ? (
        <div className="mt-2">
          <VirusTotalWidget compact virusTotalUrl={virusTotalUrl} />
        </div>
      ) : null}
    </div>
  );
}

export default function GameDownloadsPanel({
  game,
  disclaimerTitle,
  disclaimerContent,
}: GameDownloadsPanelProps) {
  const communityName =
    game.communityAlternativeName?.trim() || "Community alternative";
  const hasCommunityDownload = Boolean(game.communityAlternativeDownloadLink);
  const hasCommunitySite = Boolean(game.communityAlternativeUrl);
  const hasCommunityNameOnly = Boolean(
    game.communityAlternativeName?.trim() &&
      !hasCommunityDownload &&
      !hasCommunitySite
  );
  const hasCommunityRow = hasCommunityDownload || hasCommunitySite;
  const hasOriginalDownload = Boolean(game.downloadLink);
  const hasStore = Boolean(game.purchaseLink);
  const hasOriginalRow = hasOriginalDownload || hasStore;

  if (!hasCommunityRow && !hasOriginalRow && !hasCommunityNameOnly) {
    return null;
  }

  const communityRow = hasCommunityRow ? (
    <DownloadRow
      key="community"
      label="Community alternative"
      title={communityName}
      virusTotalUrl={
        hasCommunityDownload
          ? game.communityAlternativeVirusTotalUrl
          : undefined
      }
      actions={
        <>
          {game.communityAlternativeUrl && (
            <Link
              href={game.communityAlternativeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-[rgb(var(--border-color))] px-3 py-1.5 text-sm font-medium text-[rgb(var(--text-primary))] hover:border-[#107c10] hover:text-[#107c10] transition-colors"
            >
              <FaExternalLinkAlt size={12} />
              Visit site
            </Link>
          )}
          {game.communityAlternativeDownloadLink && (
            <DownloadButtonWithModal
              downloadLink={game.communityAlternativeDownloadLink}
              fileName={communityName}
              buttonText="Download"
              modalTitle={disclaimerTitle}
              modalContent={disclaimerContent}
            />
          )}
        </>
      }
    />
  ) : null;

  const originalRow = hasOriginalRow ? (
    <DownloadRow
      key="original"
      virusTotalUrl={hasOriginalDownload ? game.virusTotalUrl : undefined}
      actions={
        <>
          {game.downloadLink && (
            <DownloadButtonWithModal
              downloadLink={game.downloadLink}
              fileName={game.fileName || game.title}
              buttonText={originalDownloadButtonText(game)}
              modalTitle={disclaimerTitle}
              modalContent={disclaimerContent}
            />
          )}
          {game.purchaseLink && <StoreButton purchaseLink={game.purchaseLink} />}
        </>
      }
    />
  ) : null;

  const nameOnlyRow = hasCommunityNameOnly ? (
    <DownloadRow
      key="community-name"
      label="Community alternative"
      title={communityName}
      actions={null}
    />
  ) : null;

  const communityFirst = game.playabilityStatus === "community_alternative";
  const rows = communityFirst
    ? [communityRow || nameOnlyRow, originalRow]
    : [originalRow, communityRow || nameOnlyRow];

  return (
    <div className="mb-5 space-y-3">
      {rows.filter(Boolean).map((row, index) => (
        <div key={index}>{row}</div>
      ))}
    </div>
  );
}
