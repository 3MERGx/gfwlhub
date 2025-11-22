// import { MetadataRoute } from "next"; // Keep commented if it causes errors
import { getAllGames } from "@/lib/games-service";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gfwl-hub.vercel.app";

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

export default async function sitemap(): Promise<Sitemap> {
  const now = new Date();
  
  // Static routes
  const staticRoutes: SitemapEntry[] = [
    {
      url: `${BASE_URL}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/supported-games`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/download`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  // Fetch games from MongoDB
  let gameRoutes: SitemapEntry[] = [];
  try {
    const games = await getAllGames();
    gameRoutes = games.map((game) => ({
      url: `${BASE_URL}/games/${game.slug}`,
      lastModified: now,
      changeFrequency: game.status === "supported" ? "weekly" : "monthly",
      priority: game.status === "supported" ? 0.9 : 0.7,
    }));
  } catch (error) {
    // If MongoDB is unavailable, just return static routes
    // This allows the sitemap to be generated even if the database is down
    console.warn("Failed to fetch games for sitemap:", error);
  }

  return [...staticRoutes, ...gameRoutes];
}
