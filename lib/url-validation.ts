/**
 * URL validation utilities for specific domains/services
 */

/**
 * Validates if a URL belongs to a specific domain
 */
function isValidDomain(url: string, allowedDomains: string[]): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Remove 'www.' prefix if present
    const hostnameWithoutWww = hostname.replace(/^www\./, "");

    return allowedDomains.some((domain) => {
      const domainLower = domain.toLowerCase();
      return (
        hostnameWithoutWww === domainLower ||
        hostnameWithoutWww.endsWith(`.${domainLower}`)
      );
    });
  } catch {
    return false;
  }
}

/**
 * Validates Discord invite/community links
 * Accepts: discord.gg, discord.com, discordapp.com
 */
export function isValidDiscordUrl(url: string): boolean {
  if (!url || url.trim() === "") return true; // Empty is valid (optional field)
  return isValidDomain(url, ["discord.gg", "discord.com", "discordapp.com"]);
}

/**
 * Validates Reddit links
 * Accepts: reddit.com, redd.it
 */
export function isValidRedditUrl(url: string): boolean {
  if (!url || url.trim() === "") return true; // Empty is valid (optional field)
  return isValidDomain(url, ["reddit.com", "redd.it"]);
}

/**
 * Validates SteamDB links
 * Accepts: steamdb.info
 */
export function isValidSteamDBUrl(url: string): boolean {
  if (!url || url.trim() === "") return true; // Empty is valid (optional field)
  return isValidDomain(url, ["steamdb.info"]);
}

/**
 * Validates GOG Dreamlist links
 * Accepts: gog.com
 */
export function isValidGOGUrl(url: string): boolean {
  if (!url || url.trim() === "") return true; // Empty is valid (optional field)
  return isValidDomain(url, ["gog.com"]);
}

/**
 * Validates Wiki links
 * Accepts common wiki platforms: fandom.com, wikia.com, wikipedia.org, gamepedia.com, etc.
 * This is intentionally flexible to allow various wiki platforms
 */
export function isValidWikiUrl(url: string): boolean {
  if (!url || url.trim() === "") return true; // Empty is valid (optional field)

  // Common wiki platforms
  const wikiDomains = [
    "fandom.com",
    "wikia.com",
    "wikipedia.org",
    "gamepedia.com",
    "wiki.gg",
    "wiki.com",
    "wikidot.com",
    "wikia.org",
    "pcgamingwiki.com",
  ];

  return isValidDomain(url, wikiDomains);
}

/**
 * Get validation error message for a specific field
 */
export function getUrlValidationError(
  field: string,
  url: string
): string | null {
  if (!url || url.trim() === "") return null; // Empty is valid

  switch (field) {
    case "discordLink":
      if (!isValidDiscordUrl(url)) {
        return "Discord link must be from discord.gg, discord.com, or discordapp.com";
      }
      break;
    case "redditLink":
      if (!isValidRedditUrl(url)) {
        return "Reddit link must be from reddit.com or redd.it";
      }
      break;
    case "steamDBLink":
      if (!isValidSteamDBUrl(url)) {
        return "SteamDB link must be from steamdb.info";
      }
      break;
    case "gogDreamlistLink":
      if (!isValidGOGUrl(url)) {
        return "GOG Dreamlist link must be from gog.com";
      }
      break;
    case "wikiLink":
      if (!isValidWikiUrl(url)) {
        return "Wiki link must be from a recognized wiki platform (Fandom, Wikipedia, Gamepedia, PCGamingWiki, etc.)";
      }
      break;
  }

  return null;
}
