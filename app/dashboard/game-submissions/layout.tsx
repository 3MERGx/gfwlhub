import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Game Submissions",
};

export default function GameSubmissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

