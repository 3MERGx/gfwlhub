import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact - GFWL Hub",
  description:
    "Connect with the GFWL Hub community and find game-specific Discord and Reddit communities.",
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
