/**
 * Utility functions for handling images, especially OAuth provider avatars
 */

/**
 * Get the appropriate image URL for avatars
 * Returns the URL as-is since OAuth provider domains are configured in next.config.js
 * and we're using unoptimized images which bypass Next.js optimization
 */
export function getAvatarUrl(avatar: string | null): string | null {
  // OAuth provider images are configured in next.config.js remotePatterns
  // and we use unoptimized prop, so we can use them directly
  return avatar;
}

