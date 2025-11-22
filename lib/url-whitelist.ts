/**
 * URL whitelist for trusted domains that don't need safety checks
 * These are well-known, trusted platforms that are always safe
 */

const TRUSTED_DOMAINS = [
  // Gaming platforms
  "steam.com",
  "steampowered.com",
  "gog.com",
  "epicgames.com",
  "xbox.com",
  "microsoft.com",
  "playstation.com",
  "nintendo.com",
  "origin.com",
  "ea.com",
  "ubisoft.com",
  "battle.net",
  "blizzard.com",
  
  // Social/Community platforms
  "discord.com",
  "discord.gg",
  "discordapp.com",
  "reddit.com",
  "redd.it",
  
  // Wiki platforms
  "wikipedia.org",
  "fandom.com",
  "wikia.com",
  "gamepedia.com",
  "wiki.gg",
  "wikidot.com",
  
  // Database/Info sites
  "steamdb.info",
  "pcgamingwiki.com",
  "howlongtobeat.com",
  "metacritic.com",
  "igdb.com",
  
  // Official game sites
  "bethesda.net",
  "rockstargames.com",
  "activision.com",
  "2k.com",
  "take2games.com",
  
  // Other trusted platforms
  "youtube.com",
  "youtu.be",
  "twitch.tv",
  "patreon.com",
  "ko-fi.com",
];

/**
 * Check if a URL is from a trusted domain (whitelisted)
 * @param url The URL to check
 * @returns true if the URL is from a trusted domain
 */
export function isTrustedUrl(url: string): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Remove 'www.' prefix if present
    const hostnameWithoutWww = hostname.replace(/^www\./, "");
    
    // Check if hostname matches any trusted domain
    return TRUSTED_DOMAINS.some((domain) => {
      const domainLower = domain.toLowerCase();
      return (
        hostnameWithoutWww === domainLower ||
        hostnameWithoutWww.endsWith(`.${domainLower}`)
      );
    });
  } catch {
    // Invalid URL, not trusted
    return false;
  }
}

/**
 * Get a list of trusted domains (for display purposes)
 */
export function getTrustedDomains(): string[] {
  return [...TRUSTED_DOMAINS];
}

