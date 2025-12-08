import type { Metadata } from "next/types";

export const metadata: Metadata = {
  title: "Supported Games - GFWL Hub",
  description:
    "List of Games for Windows LIVE titles with their support status and activation types.",
};

export default function SupportedGamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
