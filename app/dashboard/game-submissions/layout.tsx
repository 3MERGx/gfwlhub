import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Game submissions",
};

export default function GameSubmissionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

