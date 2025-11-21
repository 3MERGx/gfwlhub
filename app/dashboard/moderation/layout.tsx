import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moderation Log",
};

export default function ModerationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

