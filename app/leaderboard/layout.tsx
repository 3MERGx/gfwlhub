import { Metadata } from "next";
import { requireStaffPage } from "@/lib/page-auth";

export const metadata: Metadata = {
  title: "Community Leaderboard - Testing",
};

export default async function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaffPage("/leaderboard");
  return <>{children}</>;
}
