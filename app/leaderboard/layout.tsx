import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Leaderboard",
  description:
    "Top GFWL Hub contributors ranked by approval rate and submission count.",
};

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
