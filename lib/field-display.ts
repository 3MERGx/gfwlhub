/**
 * Returns a human-readable display name for a correction/crowdsource field key.
 * Used on profile, dashboard submissions, and audit pages for consistent labels.
 */
export function getFieldDisplayName(field: string): string {
  const fieldDisplayMap: Record<string, string> = {
    imageUrl: "Image URL",
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
    knownIssues: "Known Issues",
    communityAlternativeName: "Community Alternative Name",
    remasteredName: "Remastered Name",
    remasteredPlatform: "Remastered Platform",
    virusTotalUrl: "VirusTotal URL",
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
