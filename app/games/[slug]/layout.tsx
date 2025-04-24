import { Metadata } from "next";
import { games } from "@/data/games";

type GameLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

// Generate metadata for each game page
export async function generateMetadata({
  params,
}: GameLayoutProps): Promise<Metadata> {
  // Always await params since it's now defined as a Promise
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  const game = games.find((g) => g.slug === slug);

  // Default metadata if game not found
  if (!game) {
    return {
      title: "Game Not Found | GFWL Hub - Games for Windows LIVE Community",
      description: "The requested game could not be found on GFWL Hub.",
      openGraph: {
        title: "Game Not Found | GFWL Hub",
        description: "The requested game could not be found on GFWL Hub.",
        url: `https://gfwl-hub.vercel.app/games/${slug}`,
        siteName: "GFWL Hub",
        images: [
          {
            url: "https://gfwl-hub.vercel.app/og-image.jpg", // Add a default OG image
            width: 1200,
            height: 630,
          },
        ],
        locale: "en_US",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: "Game Not Found | GFWL Hub",
        description: "The requested game could not be found on GFWL Hub.",
        images: ["https://gfwl-hub.vercel.app/og-image.jpg"], // Add a default Twitter image
      },
    };
  }

  // Game-specific metadata
  return {
    title: `${game.title} | GFWL Hub - Games for Windows LIVE Community`,
    description:
      game.description ||
      `Information, fixes, and support for ${game.title} on Games for Windows LIVE.`,
    openGraph: {
      title: `${game.title} | GFWL Hub`,
      description:
        game.description ||
        `Information, fixes, and support for ${game.title} on Games for Windows LIVE.`,
      url: `https://gfwl-hub.vercel.app/games/${slug}`,
      siteName: "GFWL Hub",
      images: [
        {
          url: "https://gfwl-hub.vercel.app/og-image.jpg", // Use a default image for now
          width: 1200,
          height: 630,
          alt: game.title,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${game.title} | GFWL Hub`,
      description:
        game.description ||
        `Information, fixes, and support for ${game.title} on Games for Windows LIVE.`,
      images: ["https://gfwl-hub.vercel.app/og-image.jpg"], // Use a default image for now
    },
  };
}

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
