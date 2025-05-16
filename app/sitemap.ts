// import { MetadataRoute } from "next"; // Keep commented if it causes errors
import { games } from "@/data/games";

const BASE_URL = "https://gfwl-hub.vercel.app";

// Local type definition if MetadataRoute import fails
interface SitemapEntry {
  url: string;
  lastModified?: string | Date;
  changeFrequency?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
}

type Sitemap = Array<SitemapEntry>;
// End of local type definition

export default function sitemap(): Sitemap {
  // Use the local Sitemap type
  const staticRoutes = [
    "",
    "/supported-games",
    "/download",
    "/faq",
    "/contact",
  ].map(
    (route): SitemapEntry => ({
      // Ensure mapped objects conform to SitemapEntry
      url: `${BASE_URL}${route}`,
      lastModified: new Date().toISOString(),
      changeFrequency: route === "" ? "daily" : "weekly", // Homepage might change more often
      priority: route === "" ? 1.0 : 0.8,
    })
  );

  // Dynamic game pages
  const gameRoutes = games.map(
    (game): SitemapEntry => ({
      // Ensure mapped objects conform to SitemapEntry
      url: `${BASE_URL}/games/${game.slug}`,
      lastModified: new Date().toISOString(), // Or use a specific date if game data has timestamps
      changeFrequency: "weekly",
      priority: 0.9,
    })
  );

  return [...staticRoutes, ...gameRoutes];
}
