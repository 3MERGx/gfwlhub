import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Games",
};

export default function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

