export interface GamePageParams {
  slug: string;
}

export interface Game {
  slug: string;
  title: string;
  status: "supported" | "testing" | "unsupported";
  activationType: string;
  description?: string;
  discordLink?: string;
  redditLink?: string;
  downloadLink?: string;
  knownIssues?: string[];
  communityTips?: string[];
  featureEnabled?: boolean;
  readyToPublish?: boolean;
  publishedAt?: Date;
  publishedBy?: string;
  playabilityStatus?: "playable" | "unplayable" | "community_alternative" | "remastered_available";
  isUnplayable?: boolean;
  communityAlternativeName?: string;
  remasteredName?: string;
  remasteredPlatform?: string;
}

export interface PageProps {
  params: GamePageParams;
  searchParams?: Record<string, string | string[] | undefined>;
}

export interface LayoutProps {
  children?: React.ReactNode;
  params?: GamePageParams;
}

export type PagePropsWithPromise = {
  params: Promise<GamePageParams>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};
