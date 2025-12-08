import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Leaderboard - Testing",
};

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

