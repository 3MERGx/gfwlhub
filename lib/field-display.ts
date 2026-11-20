import type { CorrectionField } from "@/types/crowdsource";

/** Public correction fields grouped for the suggest-a-correction picker. */
export const CORRECTION_FIELD_GROUPS: ReadonlyArray<{
  id: string;
  label: string;
  fields: readonly CorrectionField[];
}> = [
  {
    id: "game-details",
    label: "Game details",
    fields: [
      "title",
      "description",
      "releaseDate",
      "developer",
      "publisher",
      "genres",
      "platforms",
      "additionalDRM",
      "activationType",
      "status",
      "activationNotes",
    ],
  },
  {
    id: "playability",
    label: "Playability",
    fields: [
      "playabilityStatus",
      "isUnplayable",
      "communityAlternativeName",
      "communityAlternativeUrl",
      "communityAlternativeDownloadLink",
      "remasteredName",
      "remasteredPlatform",
    ],
  },
  {
    id: "instructions-community",
    label: "Instructions and community",
    fields: ["instructions", "knownIssues", "communityTips"],
  },
  {
    id: "links",
    label: "Links",
    fields: [
      "discordLink",
      "redditLink",
      "wikiLink",
      "steamDBLink",
      "purchaseLink",
      "gogDreamlistLink",
    ],
  },
  {
    id: "media",
    label: "Media",
    fields: ["imageUrl"],
  },
] as const;

/** Fields shown in the public correction picker (excludes downloadLink / virusTotalUrl). */
export const PUBLIC_CORRECTION_FIELDS: readonly CorrectionField[] =
  CORRECTION_FIELD_GROUPS.flatMap((group) => [...group.fields]);

/**
 * Returns a human-readable display name for a correction/crowdsource field key.
 * Used on profile, dashboard submissions, and audit pages for consistent labels.
 */
export function getFieldDisplayName(field: string): string {
  const fieldDisplayMap: Record<string, string> = {
    gameSubmission: "Game submission",
    faqSubmission: "FAQ submission",
    imageUrl: "Box Art / Cover Image URL",
    additionalDRM: "Additional DRM",
    discordLink: "Discord Link",
    redditLink: "Reddit Link",
    wikiLink: "Wiki Link",
    steamDBLink: "SteamDB Link",
    purchaseLink: "Purchase Link",
    gogDreamlistLink: "GOG Dreamlist Link",
    releaseDate: "Release Date",
    activationType: "Activation Type",
    playabilityStatus: "Playability Status",
    communityTips: "Community Tips",
    activationNotes: "Activation Notes",
    knownIssues: "Known Issues",
    communityAlternativeName: "Community Alternative Name",
    communityAlternativeUrl: "Community Alternative Website URL",
    communityAlternativeDownloadLink: "Community Alternative Download Link",
    communityAlternativeVirusTotalUrl:
      "Community Alternative VirusTotal URL",
    remasteredName: "Remastered Name",
    remasteredPlatform: "Remastered Platform",
    virusTotalUrl: "VirusTotal URL",
    downloadLink: "Download Link",
    isUnplayable: "Is Unplayable",
  };

  if (fieldDisplayMap[field]) {
    return fieldDisplayMap[field];
  }

  // Format camelCase generically; use lowercase placeholders so "split on capitals" doesn't alter them
  let formatted = field;
  const acronyms = ["URL", "DRM", "API", "ID", "FAQ", "DB", "GOG"];
  const placeholderMap: Record<string, string> = {};

  acronyms.forEach((acronym, index) => {
    const placeholder = `__acronym${index}__`;
    placeholderMap[placeholder] = acronym;
    const regex = new RegExp(acronym, "gi");
    formatted = formatted.replace(regex, placeholder);
  });

  formatted = formatted.replace(/([A-Z])/g, " $1");
  formatted = formatted.replace(/^./, (str) => str.toUpperCase()).trim();

  Object.entries(placeholderMap).forEach(([placeholder, acronym]) => {
    formatted = formatted.split(placeholder).join(acronym);
  });

  formatted = formatted.replace(/\s+/g, " ");
  return formatted;
}

/** Status label for correction/submission review outcomes. */
export function getCorrectionStatusLabel(status: string): string {
  switch (status) {
    case "modified":
      return "Approved with edits";
    case "superseded":
      return "Superseded";
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}
